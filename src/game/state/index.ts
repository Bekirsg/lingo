/**
 * BEKİR-EREN Oyun Durum Makinesi (State Machine)
 *
 * SPEC Bölüm 2.1-2, Bölüm 4:
 * - Saf TypeScript ile yazılmış tam oyun durum yöneticisi.
 * - 1–3. turlar (5 kelime + bonus soru + tur özeti).
 * - 4. tur (Büyük Final, 120 sn tek sayaç, 4->5->6->7 harfli etaplar).
 * - Duraklat/devam desteği.
 * - Geçersiz durum geçişlerini engeller.
 */

import {
  evaluateGuess,
  normalize,
  letterCount,
  ROUND_CONFIGS,
  bonusScore,
  bonusRevealedAtTime,
  round4FinalScore,
  pickWord,
  pickBonusWord,
  shuffleRevealOrder,
  GUESS_TIME_LIMIT,
  ROUND4_TIME_LIMIT,
  BONUS_TOTAL_TIME,
  BONUS_WRITE_TIME,
} from '../engine'
import { Clock } from '../clock'
import type { WordRepository } from '../../data/words'
import type { GameState } from './types'

export * from './types'

export interface GameControllerOptions {
  words: WordRepository
  nowFn?: () => number
  onStateChange?: (state: GameState) => void
  highScore?: number
}

export class GameController {
  private state: GameState
  private words: WordRepository
  private clock: Clock
  /** 4. tur kelime kaybında ~3 sn bekleme için bağımsız küçük sayaç */
  private waitClock: Clock
  private nowFn?: () => number
  private highScore: number
  private onStateChange?: (state: GameState) => void

  constructor(options: GameControllerOptions) {
    this.words = options.words
    this.nowFn = options.nowFn
    this.highScore = options.highScore ?? 0
    this.onStateChange = options.onStateChange

    this.clock = new Clock({
      nowFn: this.nowFn,
    })

    // 4. tur kelime kaybında ~3 sn bekleme için bağımsız küçük sayaç
    this.waitClock = new Clock({
      nowFn: this.nowFn,
    })

    this.state = this.createInitialState()
  }

  private createInitialState(): GameState {
    return {
      screen: 'menu',
      treasury: 0,
      currentRoundPoints: 0,
      usedWords: new Set<string>(),
      countdownValue: 3,
      finalScore: 0,
      isNewRecord: false,
    }
  }

  getState(): Readonly<GameState> {
    return this.state
  }

  getClock(): Clock {
    return this.clock
  }

  getWaitClock(): Clock {
    return this.waitClock
  }

  private emitState(): void {
    this.onStateChange?.(this.state)
  }

  // ─── Oyun Başlatma & Akış ─────────────────────────────────────────

  /** Yeni bir oyun başlatır (Ana menüden) */
  startNewGame(): void {
    this.clock.stop()
    this.waitClock.stop()
    this.state = {
      screen: 'countdown',
      treasury: 0,
      currentRoundPoints: 0,
      usedWords: new Set<string>(),
      countdownValue: 3,
      countdownTarget: 'playing_round',
      finalScore: 0,
      isNewRecord: false,
    }
    this.setupRoundWord(1, 1)
    this.emitState()
  }

  /**
   * 3-2-1 geri sayımını ilerletir.
   * countdown 1'den sonra hedef ekrana geçiş yapar.
   */
  tickCountdown(value?: number): void {
    if (this.state.screen !== 'countdown') return

    const nextVal = value !== undefined ? value : this.state.countdownValue - 1

    if (nextVal > 0) {
      this.state.countdownValue = nextVal
      this.emitState()
      return
    }

    // Geri sayım bitti -> Hedef ekrana geç
    const target = this.state.countdownTarget
    if (target === 'playing_round') {
      this.state.screen = 'playing_round'
      this.clock.start(GUESS_TIME_LIMIT, () => this.onGuessTimeout())
    } else if (target === 'round4_playing') {
      this.state.screen = 'round4_playing'
      // 4. tur 120 saniyelik tek sayaç başlar
      if (!this.clock.isRunning() && !this.clock.isPaused()) {
        this.clock.start(ROUND4_TIME_LIMIT, () => this.onRound4Timeout())
      }
    } else if (target === 'bonus_reading') {
      this.state.screen = 'bonus_reading'
      this.clock.start(BONUS_TOTAL_TIME, () => this.onBonusExpire())
    }

    this.emitState()
  }

  // ─── 1–3. Tur Kelime Hazırlığı ─────────────────────────────────────

  private setupRoundWord(round: 1 | 2 | 3, wordIndex: number): void {
    const config = ROUND_CONFIGS[round - 1]
    const len = config.letterCount
    const pool = this.words.getWords(len)
    const word = pickWord(pool, this.state.usedWords)

    if (!word) {
      throw new Error(`${len} harfli kelime havuzu tükendi!`)
    }

    this.state.usedWords.add(word)

    this.state.roundState = {
      round,
      wordIndex,
      letterCount: len,
      currentWord: word,
      guesses: [],
      currentInput: Array.from(word)[0], // ilk harf otomatik yazılı
      wordWon: false,
      wordLost: false,
    }
  }

  // ─── 1–3. Tur Tahmin Gönderme ──────────────────────────────────────

  /**
   * 1–3. turlarda tahmin gönderir.
   */
  /**
   * Klavyeden harf yazma (Özel klavye veya fiziksel klavye)
   * İlk harf kilitlidir, oyuncu sadece 2. kutudan sonrakileri doldurur.
   */
  typeLetter(char: string): void {
    const normalized = normalize(char)
    if (!/^[a-zçğıöşü]$/.test(normalized)) return

    if (this.state.screen === 'playing_round' && this.state.roundState) {
      const rs = this.state.roundState
      if (rs.wordWon || rs.wordLost) return
      if (letterCount(rs.currentInput) < rs.letterCount) {
        rs.currentInput += normalized
        this.emitState()
      }
    } else if (this.state.screen === 'round4_playing' && this.state.round4State) {
      const r4 = this.state.round4State
      if (letterCount(r4.currentInput) < r4.stage) {
        r4.currentInput += normalized
        this.emitState()
      }
    } else if (this.state.screen === 'bonus_writing' && this.state.bonusState) {
      this.typeBonusLetter(char)
    }
  }

  /**
   * Sil tuşuna basıldığında çağrılır.
   * İlk harf kilitlidir ve ASLA silinemez!
   */
  deleteLetter(): void {
    if (this.state.screen === 'playing_round' && this.state.roundState) {
      const rs = this.state.roundState
      if (rs.wordWon || rs.wordLost) return
      const chars = Array.from(rs.currentInput)
      if (chars.length > 1) {
        chars.pop()
        rs.currentInput = chars.join('')
        this.emitState()
      }
    } else if (this.state.screen === 'round4_playing' && this.state.round4State) {
      const r4 = this.state.round4State
      const chars = Array.from(r4.currentInput)
      if (chars.length > 1) {
        chars.pop()
        r4.currentInput = chars.join('')
        this.emitState()
      }
    } else if (this.state.screen === 'bonus_writing' && this.state.bonusState) {
      this.deleteBonusLetter()
    }
  }

  /**
   * Tahmin süresini (10 sn) başlatır.
   * Kutu çevirme animasyonu bittiğinde çağrılır.
   */
  startGuessTimer(): void {
    if (
      this.state.screen === 'playing_round' &&
      this.state.roundState &&
      !this.state.roundState.wordWon &&
      !this.state.roundState.wordLost
    ) {
      this.clock.start(GUESS_TIME_LIMIT, () => this.onGuessTimeout())
    }
  }

  /**
   * 1–3. turlarda tahmin gönderir.
   * @param guessRaw Tahmin metni
   * @param autoStartNextTimer UI animasyonu varsa false verilir, animasyon bitince startGuessTimer() çağrılır.
   */
  submitGuess(guessRaw: string, autoStartNextTimer: boolean = true): void {
    if (this.state.screen !== 'playing_round' || !this.state.roundState) return
    const rs = this.state.roundState
    if (rs.wordWon || rs.wordLost) return

    const guess = normalize(guessRaw)

    // Boyut kontrolü
    if (letterCount(guess) !== rs.letterCount) return

    // İlk harf kuralı: İlk harf kilitli ve eşleşmek zorunda
    const expectedFirstChar = Array.from(rs.currentWord)[0]
    if (Array.from(guess)[0] !== expectedFirstChar) return

    // 1) Sözlükte var mı? (TDK geçerlilik kontrolü)
    const isValid = this.words.isValidWord(guess, rs.letterCount)

    if (!isValid) {
      // SPEC Bölüm 4.2-3: Geçersiz tahmin -> anında kaybedilir, tüm kutular kırmızı
      this.clock.stop()
      rs.wordLost = true
      rs.lossReason = 'invalid_word'
      rs.guesses.push({
        guess,
        marks: Array(rs.letterCount).fill('red'),
      })
      this.state.screen = 'word_result'
      this.emitState()
      return
    }

    // 2) Geçerli tahmin değerlendirmesi
    const marks = evaluateGuess(rs.currentWord, guess)
    rs.guesses.push({ guess, marks })

    // Doğru bilindi mi?
    const isCorrect = marks.every(m => m === 'green')

    if (isCorrect) {
      this.clock.stop()
      rs.wordWon = true
      const config = ROUND_CONFIGS[rs.round - 1]
      const points = config.pointsPerWord
      this.state.currentRoundPoints += points
      this.state.treasury += points
      this.state.screen = 'word_result'
      this.emitState()
      return
    }

    // 5 hak bitti mi?
    if (rs.guesses.length >= 5) {
      this.clock.stop()
      rs.wordLost = true
      rs.lossReason = 'max_attempts'
      this.state.screen = 'word_result'
      this.emitState()
      return
    }

    // Yanlış tahmin, hak devam ediyor
    rs.currentInput = Array.from(rs.currentWord)[0]
    if (autoStartNextTimer) {
      this.clock.start(GUESS_TIME_LIMIT, () => this.onGuessTimeout())
    } else {
      this.clock.stop()
    }
    this.emitState()
  }

  /** 1–3. tur tahmin süresi dolunca */
  onGuessTimeout(): void {
    if (this.state.screen !== 'playing_round' || !this.state.roundState) return
    const rs = this.state.roundState

    this.clock.stop()
    rs.wordLost = true
    rs.lossReason = 'time_out'
    this.state.screen = 'word_result'
    this.emitState()
  }

  /**
   * Sonuç kartından "Devam Et" butonuna basıldığında çağrılır.
   * SPEC 4.5: 3 saniyelik geri sayım (3-2-1) çıkar, sonra yeni kelimeye geçer.
   */
  dismissWordResult(): void {
    if (this.state.screen !== 'word_result' || !this.state.roundState) return
    const rs = this.state.roundState

    if (rs.wordIndex < 5) {
      // Tur içinde sıradaki kelimeye geç
      this.setupRoundWord(rs.round, rs.wordIndex + 1)
      this.state.screen = 'countdown'
      this.state.countdownValue = 3
      this.state.countdownTarget = 'playing_round'
      this.emitState()
    } else {
      // 5. kelime bitti -> Bonus soruya geç
      this.setupBonusQuestion()
      this.state.screen = 'countdown'
      this.state.countdownValue = 3
      this.state.countdownTarget = 'bonus_reading'
      this.emitState()
    }
  }

  // ─── Bonus Soru Akışı (SPEC Bölüm 4.6) ─────────────────────────────

  private setupBonusQuestion(): void {
    const bonusPool = this.words.getBonusWords()
    const item = pickBonusWord(bonusPool, this.state.usedWords)

    if (!item) {
      throw new Error('Bonus 8 harfli kelime havuzu tükendi!')
    }

    this.state.usedWords.add(item.word)

    this.state.bonusState = {
      word: item.word,
      definition: item.definition,
      revealOrder: shuffleRevealOrder(8),
      revealedCount: 0,
      currentScore: 3000,
      frozenScore: 0,
      bilPressed: false,
      userInput: '',
      won: false,
      answered: false,
    }
  }

  /**
   * Bonus soru zamanını ilerletir (sahte saat veya gerçek tick ile).
   */
  updateBonusTime(elapsedSeconds: number): void {
    if (this.state.screen !== 'bonus_reading' || !this.state.bonusState) return
    const bs = this.state.bonusState
    if (bs.bilPressed) return

    bs.revealedCount = bonusRevealedAtTime(elapsedSeconds)
    bs.currentScore = bonusScore(bs.revealedCount)

    if (elapsedSeconds >= BONUS_TOTAL_TIME) {
      // 10 sn doldu ve BİL basılmadı -> kelime açılır, 0 puan
      this.onBonusExpire()
      return
    }

    this.emitState()
  }

  /**
   * Bonus soruda "BİL" butonuna basıldığında.
   * SPEC 4.6: Harf açılması durur, puan donar, 5 sn yazma süresi başlar.
   */
  pressBil(): void {
    if (this.state.screen !== 'bonus_reading' || !this.state.bonusState) return
    const bs = this.state.bonusState

    this.clock.stop()
    bs.bilPressed = true
    bs.frozenScore = bs.currentScore
    this.state.screen = 'bonus_writing'

    // 5 sn yazma süresi başlar
    this.clock.start(BONUS_WRITE_TIME, () => this.onBonusWriteTimeout())
    this.emitState()
  }

  /**
   * Bonus soruda cevabı gönderir (5 sn yazma süresi içinde).
   */
  submitBonusAnswer(answerRaw: string): void {
    if (this.state.screen !== 'bonus_writing' || !this.state.bonusState) return
    const bs = this.state.bonusState

    this.clock.stop()
    const answer = normalize(answerRaw)
    bs.userInput = answer
    bs.answered = true

    if (answer === bs.word) {
      bs.won = true
      this.state.currentRoundPoints += bs.frozenScore
      this.state.treasury += bs.frozenScore
    } else {
      bs.won = false
    }

    this.state.screen = 'bonus_result'
    this.emitState()
  }

  /** Bonus yazma süresi dolunca (5 sn) */
  onBonusWriteTimeout(): void {
    if (this.state.screen !== 'bonus_writing' || !this.state.bonusState) return
    const bs = this.state.bonusState

    this.clock.stop()
    bs.won = false
    bs.answered = true
    this.state.screen = 'bonus_result'
    this.emitState()
  }

  /** Bonus 10 sn dolunca hiç BİL basılmadıysa */
  onBonusExpire(): void {
    if (this.state.screen !== 'bonus_reading' || !this.state.bonusState) return
    const bs = this.state.bonusState

    this.clock.stop()
    bs.won = false
    bs.answered = true
    bs.revealedCount = 7
    bs.currentScore = 0
    this.state.screen = 'bonus_result'
    this.emitState()
  }

  /** Bonus sonuç kartından sonra tur özetine geç */
  dismissBonusResult(): void {
    if (this.state.screen !== 'bonus_result') return
    const currentRound = this.state.roundState?.round ?? 1

    if (currentRound < 3) {
      this.state.screen = 'round_summary'
    } else {
      // 3. tur bitti -> 4. Tur giriş ekranına geç
      this.state.screen = 'round4_intro'
    }
    this.emitState()
  }

  /** Tur özeti ekranından bir sonraki tura (2 veya 3) geçiş */
  nextRound(): void {
    if (this.state.screen !== 'round_summary') return
    const currentRound = this.state.roundState?.round ?? 1
    const nextR = (currentRound + 1) as 2 | 3

    this.state.currentRoundPoints = 0
    this.setupRoundWord(nextR, 1)
    this.state.screen = 'countdown'
    this.state.countdownValue = 3
    this.state.countdownTarget = 'playing_round'
    this.emitState()
  }

  // ─── Bonus Yazma (BİL sonrası harf girme) ────────────────────────

  /**
   * Bonus yazma fazında kilitli olan (açılmış) pozisyon indekslerini döndürür.
   * İlk harf (index 0) daima kilitlidir.
   */
  getLockedPositions(): Set<number> {
    const bs = this.state.bonusState
    if (!bs) return new Set()
    const locked = new Set<number>([0])
    for (let i = 0; i < bs.revealedCount; i++) {
      locked.add(bs.revealOrder[i])
    }
    return locked
  }

  /**
   * Bonus yazma fazında boş kutuların pozisyon indekslerini soldan sağa sıralı döndürür.
   */
  getEmptyPositions(): number[] {
    const bs = this.state.bonusState
    if (!bs) return []
    const locked = this.getLockedPositions()
    const empty: number[] = []
    for (let i = 0; i < 8; i++) {
      if (!locked.has(i)) empty.push(i)
    }
    return empty
  }

  /**
   * Bonus yazma fazında harf yazar (sıradaki boş kutuya).
   * SPEC 4.6: Açılan harfler kilitli; oyuncu sadece boş kutuları yazar,
   * imleç sıradaki boş kutuya atlar.
   * Tüm kutular dolunca otomatik gönderilir.
   */
  typeBonusLetter(char: string): void {
    if (this.state.screen !== 'bonus_writing' || !this.state.bonusState) return
    const bs = this.state.bonusState
    if (bs.answered) return

    const normalized = normalize(char)
    if (!/^[a-zçğıöşü]$/.test(normalized)) return

    const emptyPositions = this.getEmptyPositions()
    if (bs.userInput.length >= emptyPositions.length) return

    bs.userInput += normalized

    // Tüm boş kutular dolduysa otomatik gönder
    if (bs.userInput.length === emptyPositions.length) {
      this.autoSubmitBonus()
      return
    }

    this.emitState()
  }

  /**
   * Bonus yazma fazında son harfi siler.
   * SPEC 4.6: SİL sadece oyuncunun yazdığı harfleri siler.
   */
  deleteBonusLetter(): void {
    if (this.state.screen !== 'bonus_writing' || !this.state.bonusState) return
    const bs = this.state.bonusState
    if (bs.answered) return

    if (bs.userInput.length > 0) {
      bs.userInput = bs.userInput.slice(0, -1)
      this.emitState()
    }
  }

  /**
   * Tüm kutular dolunca otomatik olarak bonus cevabını oluşturup gönderir.
   */
  private autoSubmitBonus(): void {
    if (!this.state.bonusState) return
    const bs = this.state.bonusState
    const locked = this.getLockedPositions()
    const emptyPositions = this.getEmptyPositions()

    // 8 harfli kelimeyi birleştir
    const wordChars = Array.from(bs.word)
    const result: string[] = new Array(8)

    // Kilitli pozisyonlara doğru harfleri koy
    for (let i = 0; i < 8; i++) {
      if (locked.has(i)) {
        result[i] = wordChars[i]
      }
    }

    // Boş pozisyonlara kullanıcının harflerini koy
    for (let j = 0; j < emptyPositions.length; j++) {
      result[emptyPositions[j]] = bs.userInput[j] ?? ''
    }

    const fullAnswer = result.join('')
    this.submitBonusAnswer(fullAnswer)
  }

  // ─── Dev-Only Kısayollar (Yalnızca Geliştirme Modu) ─────────────

  /**
   * Mevcut turda kalan kelimeleri atlayıp doğrudan bonusa gider.
   * Sadece geliştirme modunda (import.meta.env.DEV) çağrılmalıdır.
   */
  devSkipToBonus(): void {
    if (this.state.screen !== 'playing_round' && this.state.screen !== 'word_result' && this.state.screen !== 'countdown') return
    if (!this.state.roundState) return

    this.clock.stop()
    // Bonus soruyu hazırla
    this.setupBonusQuestion()
    this.state.screen = 'countdown'
    this.state.countdownValue = 3
    this.state.countdownTarget = 'bonus_reading'
    this.emitState()
  }

  /**
   * Mevcut turu atlayıp sonraki tura geçer (bonus dahil atlar).
   * Sadece geliştirme modunda (import.meta.env.DEV) çağrılmalıdır.
   */
  devSkipToNextRound(): void {
    const currentRound = this.state.roundState?.round ?? 1

    this.clock.stop()
    if (currentRound < 3) {
      const nextR = (currentRound + 1) as 2 | 3
      this.state.currentRoundPoints = 0
      this.setupRoundWord(nextR, 1)
      this.state.screen = 'countdown'
      this.state.countdownValue = 3
      this.state.countdownTarget = 'playing_round'
    } else {
      // 3. tur → 4. tur intro
      this.state.screen = 'round4_intro'
    }
    this.emitState()
  }

  /**
   * Doğrudan 4. tura atlar (belirtilen kasa ile).
   * Sadece geliştirme modunda çağrılmalıdır.
   */
  devSkipToRound4(treasury: number = 20000): void {
    this.clock.stop()
    this.state.treasury = treasury
    this.state.currentRoundPoints = 0
    this.state.screen = 'round4_intro'
    this.emitState()
  }

  /**
   * 4. turda kalan süreyi 10 saniyeye düşürür.
   * Sadece geliştirme modunda çağrılmalıdır.
   */
  devSetRound4Time(seconds: number): void {
    if (this.state.screen !== 'round4_playing') return
    // Saati durdur ve yeniden başlat (kısa süreyle)
    this.clock.stop()
    this.clock.start(seconds, () => this.onRound4Timeout())
    this.emitState()
  }

  /**
   * 4. turda mevcut kelimeyi otomatik bildir.
   * Sadece geliştirme modunda çağrılmalıdır.
   */
  devAutoSolveRound4(): void {
    if (this.state.screen !== 'round4_playing' || !this.state.round4State) return
    const word = this.state.round4State.currentWord
    this.state.round4State.currentInput = word
    this.submitRound4Guess(word)
  }

  // ─── 4. Tur (Büyük Final) Akışı (SPEC Bölüm 4.8) ───────────────────

  /** 4. tur giriş ekranından "Başla"ya basıldığında */
  startRound4(): void {
    if (this.state.screen !== 'round4_intro') return

    this.state.round4State = {
      stage: 4,
      lastCompletedStage: null,
      currentWord: '',
      guesses: [],
      currentInput: '',
      wordsAttemptedInStage: 1,
    }

    this.setupRound4Word(4)

    this.state.screen = 'countdown'
    this.state.countdownValue = 3
    this.state.countdownTarget = 'round4_playing'
    this.emitState()
  }

  private setupRound4Word(stage: number): void {
    if (!this.state.round4State) return
    const pool = this.words.getWords(stage)
    const word = pickWord(pool, this.state.usedWords)

    if (!word) {
      throw new Error(`4. Tur ${stage} harfli kelime havuzu tükendi!`)
    }

    this.state.usedWords.add(word)
    this.state.round4State.stage = stage
    this.state.round4State.currentWord = word
    this.state.round4State.guesses = []
    this.state.round4State.currentInput = Array.from(word)[0]
  }

  /**
   * 4. turda tahmin gönderir.
   */
  submitRound4Guess(guessRaw: string): void {
    if (this.state.screen !== 'round4_playing' || !this.state.round4State) return
    const r4 = this.state.round4State
    const guess = normalize(guessRaw)

    if (letterCount(guess) !== r4.stage) return
    const expectedFirstChar = Array.from(r4.currentWord)[0]
    if (Array.from(guess)[0] !== expectedFirstChar) return

    // Geçerlilik kontrolü
    const isValid = this.words.isValidWord(guess, r4.stage)

    if (!isValid) {
      // Yeni kural (değiştirildi): Geçersiz kelime -> tüm kutular kırmızı,
      // doğru cevap ~3 sn gösterilir, ana sayaç DONDURULUR, bekleme sonrası yeni kelimeye geçilir.
      this.clock.pause()
      r4.lostWord = r4.currentWord
      r4.wordsAttemptedInStage++
      r4.guesses.push({
        guess,
        marks: Array(r4.stage).fill('red'),
      })
      this.state.screen = 'round4_word_lost'
      this.waitClock.start(3, () => this.onRound4WordLostExpire())
      this.emitState()
      return
    }

    // Geçerli tahmin
    const marks = evaluateGuess(r4.currentWord, guess)
    r4.guesses.push({ guess, marks })

    // Doğru mu?
    const isCorrect = marks.every(m => m === 'green')

    if (isCorrect) {
      // SPEC 4.8: Kelime bilinirse oyun (ve sayaç) DONAR
      this.clock.pause()
      r4.lastCompletedStage = r4.stage

      if (r4.stage === 7) {
        // 7 harfli bilinirse oyun biter!
        this.finishGame()
        return
      }

      // Duraklama ekranı açılır
      this.state.screen = 'round4_stage_cleared'
      this.emitState()
      return
    }

    // 5 hak bitti mi?
    if (r4.guesses.length >= 5) {
      // Yeni kural: 5 hak bitti -> doğru cevap ~3 sn gösterilir,
      // ana sayaç DONDURULUR, bekleme sonrası yeni kelimeye geçilir.
      this.clock.pause()
      r4.lostWord = r4.currentWord
      r4.wordsAttemptedInStage++
      this.state.screen = 'round4_word_lost'
      this.waitClock.start(3, () => this.onRound4WordLostExpire())
      this.emitState()
      return
    }

    r4.currentInput = Array.from(r4.currentWord)[0]
    this.emitState()
  }

  /**
   * 4. turda kelime kaybedilince ~3 sn bekleme sona erince (waitClock callback).
   * Ana sayaç kaldığı yerden devam eder, aynı harf sayısında yeni kelime gelir.
   */
  private onRound4WordLostExpire(): void {
    if (this.state.screen !== 'round4_word_lost' || !this.state.round4State) return
    const r4 = this.state.round4State
    r4.lostWord = undefined
    this.setupRound4Word(r4.stage)
    this.state.screen = 'round4_playing'
    // Ana sayaç kaldığı yerden devam eder
    this.clock.resume()
    this.emitState()
  }

  /**
   * 4. tur duraklama ekranından sonraki etaba devam et
   */
  continueRound4(): void {
    if (this.state.screen !== 'round4_stage_cleared' || !this.state.round4State) return
    const r4 = this.state.round4State

    const nextStage = r4.stage + 1
    if (nextStage > 7) {
      this.finishGame()
      return
    }

    this.setupRound4Word(nextStage)
    this.state.screen = 'round4_playing'
    // Sayaç kaldığı yerden devam eder
    this.clock.resume()
    this.emitState()
  }

  /** 4. tur 120 saniyesi dolduğunda */
  onRound4Timeout(): void {
    if (
      this.state.screen !== 'round4_playing' &&
      this.state.screen !== 'round4_stage_cleared' &&
      this.state.screen !== 'round4_word_lost'
    ) return
    // Bekleme sayacını da durdur
    this.waitClock.stop()
    this.finishGame()
  }

  private finishGame(): void {
    this.clock.stop()
    const lastStage = this.state.round4State?.lastCompletedStage ?? null
    const finalScore = round4FinalScore(this.state.treasury, lastStage)

    this.state.finalScore = finalScore
    this.state.isNewRecord = finalScore > this.highScore
    this.state.screen = 'game_over'
    this.emitState()
  }

  // ─── Duraklat / Devam (Background / Pause) ─────────────────────────

  /** Oyunu duraklatır (sekme gizlenince / menüden) */
  pauseGame(): void {
    if (this.state.screen === 'paused' || this.state.screen === 'menu' || this.state.screen === 'game_over') {
      return
    }

    this.state.previousScreen = this.state.screen
    this.state.screen = 'paused'
    this.clock.pause()
    this.waitClock.pause()
    this.emitState()
  }

  /** Duraklatılmış oyunu sürdürür */
  resumeGame(): void {
    if (this.state.screen !== 'paused' || !this.state.previousScreen) {
      return
    }

    const prev = this.state.previousScreen
    this.state.screen = prev
    this.state.previousScreen = undefined

    if (prev === 'round4_stage_cleared') {
      // 4. tur etap duraklamasında ana sayaç donuk kalır
    } else if (prev === 'round4_word_lost') {
      // 3 sn kayıp bekleme sayacı devam eder, ana sayaç donuk kalır
      this.waitClock.resume()
    } else {
      this.clock.resume()
    }

    this.emitState()
  }
}
