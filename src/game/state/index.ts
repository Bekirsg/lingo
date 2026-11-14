/**
 * LİNGO Oyun Durum Makinesi (State Machine)
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
  bonusTotalTime,
  round4FinalScore,
  shuffleRevealOrder,
  GUESS_TIME_LIMIT,
  ROUND4_TIME_LIMIT,
  BONUS_WRITE_TIME,
} from '../engine'
import { Clock } from '../clock'
import { loadAnalytics } from '../../analytics/storage'
import { loadStudyData, recordMistakeAnswer } from '../mistakes/studyStorage'
import {
  getStudyableCandidates,
  getNextMistakeStep,
  type StudyCandidate,
} from '../mistakes/mistakeSelector'
import type { WordRepository } from '../../data/words'
import type { GameLevel } from '../../data/levels'
import { pickWordWithFallback, pickBonusWordWithFallback } from '../../data/levels'
import type {
  GameState,
  GameMode,
  PracticeState,
  PracticeSummary,
  QuestionResolvedEvent,
  GameCompletedEvent,
  SessionCompletedEvent,
} from './types'

export * from './types'

export interface GameControllerOptions {
  words: WordRepository
  level?: GameLevel
  mode?: GameMode
  nowFn?: () => number
  onStateChange?: (state: GameState) => void
  onQuestionResolved?: (event: QuestionResolvedEvent) => void
  onGameCompleted?: (event: GameCompletedEvent) => void
  onSessionCompleted?: (event: SessionCompletedEvent) => void
  highScore?: number
}

export class GameController {
  private state: GameState
  private words: WordRepository
  private level: GameLevel
  private mode: GameMode
  private clock: Clock
  /** 4. tur kelime kaybında ~3 sn bekleme için bağımsız küçük sayaç */
  private waitClock: Clock
  private nowFn?: () => number
  private highScore: number
  private onStateChange?: (state: GameState) => void
  private onQuestionResolved?: (event: QuestionResolvedEvent) => void
  private onGameCompleted?: (event: GameCompletedEvent) => void
  private onSessionCompleted?: (event: SessionCompletedEvent) => void

  /** Soru bazlı metrik takibi (SPEC-v2 4.7 / 6 / M5 / M7 / M8) */
  private currentWordGuessTimes: number[] = []
  private currentWordGuessDurationsMs: number[] = []
  private currentWordInvalidGuesses: string[] = []
  private bonusBilSeconds?: number
  private round4LastGuessRemainingSeconds: number = ROUND4_TIME_LIMIT

  /** Oyun geneli çözülen/kaybedilen sayaçları (Yarışma) */
  private gameSolvedWordsCount: number = 0
  private gameLostWordsCount: number = 0

  constructor(options: GameControllerOptions) {
    this.words = options.words
    this.level = options.level ?? 'zor'
    this.mode = options.mode ?? 'yarisma'
    this.nowFn = options.nowFn
    this.highScore = options.highScore ?? 0
    this.onStateChange = options.onStateChange
    this.onQuestionResolved = options.onQuestionResolved
    this.onGameCompleted = options.onGameCompleted
    this.onSessionCompleted = options.onSessionCompleted

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
      mode: this.mode,
      treasury: 0,
      currentRoundPoints: 0,
      usedWords: new Set<string>(),
      countdownValue: 3,
      finalScore: 0,
      isNewRecord: false,
      level: this.level,
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

  private publishQuestionResolved(event: QuestionResolvedEvent): void {
    if (this.state.mode === 'yarisma') {
      if (event.result === 'won') {
        this.gameSolvedWordsCount++
      } else if (event.result === 'lost' || event.result === 'pass') {
        this.gameLostWordsCount++
      }
    }
    if (event.mode === 'hatalar') {
      event.level = undefined
    }
    this.onQuestionResolved?.(event)
  }

  // ─── Oyun Başlatma & Akış ─────────────────────────────────────────

  /** Yeni bir oyun başlatır (Ana menüden veya Seviye Seçiminden) */
  startNewGame(level?: GameLevel, mode?: GameMode): void {
    if (level) {
      this.level = level
    }
    if (mode) {
      this.mode = mode
    }
    this.clock.stop()
    this.waitClock.stop()
    this.currentWordGuessTimes = []
    this.currentWordGuessDurationsMs = []
    this.currentWordInvalidGuesses = []
    this.bonusBilSeconds = undefined
    this.round4LastGuessRemainingSeconds = ROUND4_TIME_LIMIT
    this.gameSolvedWordsCount = 0
    this.gameLostWordsCount = 0

    if (this.mode === 'calisma') {
      const practiceState: PracticeState = {
        cycle: 1,
        questionIndexInCycle: 1,
        totalAsked: 0,
        totalWon: 0,
        totalLost: 0,
        totalPassed: 0,
        byLetter: {
          4: { asked: 0, won: 0 },
          5: { asked: 0, won: 0 },
          6: { asked: 0, won: 0 },
          7: { asked: 0, won: 0 },
          8: { asked: 0, won: 0 },
        },
        bonusWonCount: 0,
        bonusLostCount: 0,
        missedWords: [],
        currentWordInvalidGuesses: [],
        currentWordGuessTimes: [],
      }

      this.state = {
        screen: 'countdown',
        mode: 'calisma',
        treasury: 0,
        currentRoundPoints: 0,
        usedWords: new Set<string>(),
        countdownValue: 3,
        countdownTarget: 'playing_round',
        finalScore: 0,
        isNewRecord: false,
        level: this.level,
        practiceState,
      }
      this.setupPracticeWord(4)
      this.emitState()
      return
    }

    if (this.mode === 'hatalar') {
      const missedWords = loadAnalytics().missedWords
      const study = loadStudyData()
      const pool = getStudyableCandidates(missedWords, study.learned, this.words)

      const practiceState: PracticeState = {
        cycle: 1,
        questionIndexInCycle: 1,
        totalAsked: 0,
        totalWon: 0,
        totalLost: 0,
        totalPassed: 0,
        byLetter: {
          4: { asked: 0, won: 0 },
          5: { asked: 0, won: 0 },
          6: { asked: 0, won: 0 },
          7: { asked: 0, won: 0 },
          8: { asked: 0, won: 0 },
        },
        bonusWonCount: 0,
        bonusLostCount: 0,
        missedWords: [],
        currentWordInvalidGuesses: [],
        currentWordGuessTimes: [],
        remainingCount: pool.totalCount,
        learnedThisSession: [],
      }

      this.state = {
        screen: 'countdown',
        mode: 'hatalar',
        treasury: 0,
        currentRoundPoints: 0,
        usedWords: new Set<string>(),
        countdownValue: 3,
        countdownTarget: 'playing_round',
        finalScore: 0,
        isNewRecord: false,
        level: this.level,
        practiceState,
      }

      const next = getNextMistakeStep(undefined, pool)
      if (!next) {
        this.finishPractice(true)
        return
      }

      practiceState.currentMistakeStep = next.nextStep
      if (next.nextStep === 'bonus') {
        this.setupMistakeBonus(next.candidate)
        this.state.countdownTarget = 'bonus_reading'
      } else {
        this.setupMistakeWord(next.candidate)
        this.state.countdownTarget = 'playing_round'
      }

      this.emitState()
      return
    }

    // Yarışma Modu
    this.state = {
      screen: 'countdown',
      mode: 'yarisma',
      treasury: 0,
      currentRoundPoints: 0,
      usedWords: new Set<string>(),
      countdownValue: 3,
      countdownTarget: 'playing_round',
      finalScore: 0,
      isNewRecord: false,
      level: this.level,
    }
    this.setupRoundWord(1, 1)
    this.emitState()
  }

  /** SPEC-v2 startGame(level, mode) desteği */
  startGame(level?: GameLevel, mode?: GameMode): void {
    this.startNewGame(level, mode)
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
      const totalTime = bonusTotalTime(this.state.bonusState?.length || 8)
      this.clock.start(totalTime, () => this.onBonusExpire())
    }

    this.emitState()
  }

  // ─── 1–3. Tur Kelime Hazırlığı ─────────────────────────────────────

  private setupRoundWord(round: 1 | 2 | 3, wordIndex: number): void {
    this.currentWordGuessTimes = []
    this.currentWordGuessDurationsMs = []
    this.currentWordInvalidGuesses = []
    this.bonusBilSeconds = undefined

    const config = ROUND_CONFIGS[round - 1]
    const len = config.letterCount
    const pool = this.words.getWords(len)
    const levelData = this.words.getLevelData?.(len) ?? null
    const res = this.words.pickWordByLevel
      ? this.words.pickWordByLevel(len, this.state.level, this.state.usedWords)
      : pickWordWithFallback(pool, levelData, this.state.level, this.state.usedWords)

    if (!res) {
      throw new Error(`${len} harfli kelime havuzu tükendi!`)
    }

    const word = res.word

    this.state.usedWords.add(word)

    const prevWon = (wordIndex > 1 && this.state.roundState) ? this.state.roundState.wordsWonInRound : 0

    this.state.roundState = {
      round,
      wordIndex,
      letterCount: len,
      currentWord: word,
      guesses: [],
      currentInput: Array.from(word)[0], // ilk harf otomatik yazılı
      wordWon: false,
      wordLost: false,
      wordsWonInRound: prevWon,
    }
  }

  // ─── Çalışma Modu Kelime Hazırlığı (SPEC-v2 Bölüm 6) ───────────────

  private setupPracticeWord(len: number): void {
    this.currentWordGuessTimes = []
    this.currentWordGuessDurationsMs = []
    this.currentWordInvalidGuesses = []
    this.bonusBilSeconds = undefined

    const pool = this.words.getWords(len)
    const levelData = this.words.getLevelData?.(len) ?? null
    let res = this.words.pickWordByLevel
      ? this.words.pickWordByLevel(len, this.state.level, this.state.usedWords)
      : pickWordWithFallback(pool, levelData, this.state.level, this.state.usedWords)

    if (!res) {
      // SPEC 6 / 4.3: Havuz tükendiğinde bu harf sayısı için kullanılmışlar sıfırlanır
      for (const w of Array.from(this.state.usedWords)) {
        if (letterCount(w) === len) {
          this.state.usedWords.delete(w)
        }
      }
      res = this.words.pickWordByLevel
        ? this.words.pickWordByLevel(len, this.state.level, this.state.usedWords)
        : pickWordWithFallback(pool, levelData, this.state.level, this.state.usedWords)
    }

    if (!res) {
      throw new Error(`Çalışma modu ${len} harfli kelime havuzu bulunamadı!`)
    }

    const word = res.word
    this.state.usedWords.add(word)

    const qIndex = this.state.practiceState?.questionIndexInCycle ?? 1
    this.state.roundState = {
      round: 1,
      wordIndex: qIndex,
      letterCount: len,
      currentWord: word,
      guesses: [],
      currentInput: Array.from(word)[0],
      wordWon: false,
      wordLost: false,
      wordsWonInRound: this.state.practiceState?.totalWon ?? 0,
    }
  }

  private setupPracticeBonus(bonusLength: number = 8): void {
    this.currentWordGuessTimes = []
    this.currentWordGuessDurationsMs = []
    this.currentWordInvalidGuesses = []
    this.bonusBilSeconds = undefined

    const bonusPool = this.words.getBonusWords()
    const levelData = this.words.getLevelData?.(bonusLength) ?? null
    let res = this.words.pickBonusWordByLevel
      ? this.words.pickBonusWordByLevel(this.state.level, this.state.usedWords)
      : pickBonusWordWithFallback(bonusPool, levelData, this.state.level, this.state.usedWords)

    if (!res) {
      // SPEC 6 / 4.3 & Aşama 3B: Bonus havuzu tükendiğinde 8-11 harfli bonus kelimeleri için kullanılmışlar sıfırlanır
      for (const w of Array.from(this.state.usedWords)) {
        const len = letterCount(w)
        if (len >= 8 && len <= 11) {
          this.state.usedWords.delete(w)
        }
      }
      res = this.words.pickBonusWordByLevel
        ? this.words.pickBonusWordByLevel(this.state.level, this.state.usedWords)
        : pickBonusWordWithFallback(bonusPool, levelData, this.state.level, this.state.usedWords)
    }

    if (!res) {
      throw new Error('Çalışma modu bonus kelime havuzu bulunamadı!')
    }

    this.state.usedWords.add(res.word)
    const actualLen = letterCount(res.word)

    this.state.bonusState = {
      word: res.word,
      definition: res.definition,
      length: actualLen,
      revealOrder: shuffleRevealOrder(actualLen),
      revealedCount: 0,
      currentScore: 3000,
      frozenScore: 0,
      bilPressed: false,
      userInput: '',
      won: false,
      answered: false,
    }
  }

  // ─── Hatalarımla Çalış Modu Hazırlığı ve Döngü Yönetimi (SPEC-v2 Bölüm 6.5 & M8) ───

  private setupMistakeWord(candidate: StudyCandidate): void {
    this.currentWordGuessTimes = []
    this.currentWordGuessDurationsMs = []
    this.currentWordInvalidGuesses = []
    this.bonusBilSeconds = undefined

    const word = candidate.word
    this.state.usedWords.add(word)

    const len = candidate.letterCount
    const qIndex = this.state.practiceState?.questionIndexInCycle ?? 1
    this.state.roundState = {
      round: 1,
      wordIndex: qIndex,
      letterCount: len,
      currentWord: word,
      guesses: [],
      currentInput: Array.from(word)[0],
      wordWon: false,
      wordLost: false,
      wordsWonInRound: this.state.practiceState?.totalWon ?? 0,
    }
  }

  private setupMistakeBonus(candidate: StudyCandidate): void {
    this.currentWordGuessTimes = []
    this.currentWordGuessDurationsMs = []
    this.currentWordInvalidGuesses = []
    this.bonusBilSeconds = undefined

    const word = candidate.word
    const definition = candidate.definition || ''
    this.state.usedWords.add(word)

    const actualLen = candidate.letterCount
    this.state.bonusState = {
      word,
      definition,
      length: actualLen,
      revealOrder: shuffleRevealOrder(actualLen),
      revealedCount: 0,
      currentScore: 3000,
      frozenScore: 0,
      bilPressed: false,
      userInput: '',
      won: false,
      answered: false,
    }
  }

  private advanceMistakeStep(): void {
    const ps = this.state.practiceState!
    const missedWords = loadAnalytics().missedWords
    const study = loadStudyData()
    const pool = getStudyableCandidates(missedWords, study.learned, this.words, this.state.usedWords)

    ps.remainingCount = pool.totalCount

    const next = getNextMistakeStep(ps.currentMistakeStep, pool)
    if (!next) {
      // Oturumda çalışılabilecek kelime kalmadı! Oturum otomatik biter.
      this.finishPractice(true)
      return
    }

    const stepOrder = { 4: 1, 5: 2, 6: 3, 7: 4, bonus: 5 }
    const prevOrder = ps.currentMistakeStep ? stepOrder[ps.currentMistakeStep] : 0
    const nextOrder = stepOrder[next.nextStep]
    if (nextOrder <= prevOrder) {
      ps.cycle++
    }
    ps.currentMistakeStep = next.nextStep

    if (next.nextStep === 'bonus') {
      this.setupMistakeBonus(next.candidate)
      this.state.screen = 'countdown'
      this.state.countdownValue = 3
      this.state.countdownTarget = 'bonus_reading'
    } else {
      this.setupMistakeWord(next.candidate)
      this.state.screen = 'countdown'
      this.state.countdownValue = 3
      this.state.countdownTarget = 'playing_round'
    }
    this.emitState()
  }

  // ─── Çalışma & Hatalarımla Modu Ortak Soru Bitiş İşleyicisi ─────────

  private onPracticeOrMistakeQuestionFinished(
    word: string,
    len: number,
    result: 'won' | 'lost' | 'pass',
    isBonus: boolean = false
  ): void {
    if (!this.state.practiceState) return
    const ps = this.state.practiceState
    ps.totalAsked++
    if (!ps.byLetter[len]) ps.byLetter[len] = { asked: 0, won: 0 }
    ps.byLetter[len].asked++

    if (result === 'won') {
      ps.totalWon++
      ps.byLetter[len].won++
      if (isBonus) ps.bonusWonCount++
    } else if (result === 'pass') {
      ps.totalPassed++
      ps.missedWords.push({
        word,
        letterCount: len,
        reason: 'pass',
        correctWord: word,
      })
    } else {
      ps.totalLost++
      if (isBonus) ps.bonusLostCount++
      ps.missedWords.push({
        word,
        letterCount: len,
        reason: 'lost',
        correctWord: word,
      })
    }

    // Hatalarımla Çalış moduna özel öğrenildi (study) mantığı (SPEC M8)
    if (this.state.mode === 'hatalar') {
      const isWon = result === 'won'
      const streakRes = recordMistakeAnswer(word, isWon)
      ps.streakInfo = streakRes
      if (streakRes.justLearned) {
        if (!ps.learnedThisSession) ps.learnedThisSession = []
        ps.learnedThisSession.push(word)
      }
      // Havuzda kalan çalışılabilir kelime sayısını güncelle
      const missedWords = loadAnalytics().missedWords
      const study = loadStudyData()
      const pool = getStudyableCandidates(missedWords, study.learned, this.words, this.state.usedWords)
      ps.remainingCount = pool.totalCount
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
   * Tahmin süresini (15 sn) başlatır.
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
   * 1–3. turlarda (ve çalışma modunda) tahmin gönderir.
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

    const elapsed = Math.round(Math.max(0, GUESS_TIME_LIMIT - this.clock.getRemainingSeconds()) * 10) / 10
    const elapsedMs = Math.round(Math.max(0, (GUESS_TIME_LIMIT - this.clock.getRemainingSeconds()) * 1000))
    this.currentWordGuessTimes.push(elapsed)
    this.currentWordGuessDurationsMs.push(elapsedMs)

    // 1) Sözlükte var mı? (TDK geçerlilik kontrolü)
    const isValid = this.words.isValidWord(guess, rs.letterCount)

    if (!isValid) {
      // SPEC Bölüm 4.2-3: Geçersiz tahmin -> anında kaybedilir, tüm kutular kırmızı
      this.currentWordInvalidGuesses.push(guess)
      this.clock.stop()
      rs.wordLost = true
      rs.lossReason = 'invalid_word'
      rs.guesses.push({
        guess,
        marks: Array(rs.letterCount).fill('red'),
      })

      this.publishQuestionResolved({
        mode: this.state.mode,
        level: this.state.level,
        letterCount: rs.letterCount,
        result: 'lost',
        attemptCount: rs.guesses.length,
        lossReason: 'invalid_word',
        word: rs.currentWord,
        guesses: rs.guesses.map(g => g.guess),
        guessMarks: rs.guesses.map(g => g.marks.slice(1)),
        guessDurationsMs: [...this.currentWordGuessDurationsMs],
        guessTimes: [...this.currentWordGuessTimes],
        invalidWords: [...this.currentWordInvalidGuesses],
        invalidGuesses: [...this.currentWordInvalidGuesses],
      })

      this.onPracticeOrMistakeQuestionFinished(rs.currentWord, rs.letterCount, 'lost', false)

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
      rs.wordsWonInRound++
      if (this.state.mode === 'yarisma') {
        const config = ROUND_CONFIGS[rs.round - 1]
        const points = config.pointsPerWord
        this.state.currentRoundPoints += points
        this.state.treasury += points
      }

      this.publishQuestionResolved({
        mode: this.state.mode,
        level: this.state.level,
        letterCount: rs.letterCount,
        result: 'won',
        attemptCount: rs.guesses.length,
        word: rs.currentWord,
        guesses: rs.guesses.map(g => g.guess),
        guessMarks: rs.guesses.map(g => g.marks.slice(1)),
        guessDurationsMs: [...this.currentWordGuessDurationsMs],
        guessTimes: [...this.currentWordGuessTimes],
        invalidWords: [...this.currentWordInvalidGuesses],
        invalidGuesses: [...this.currentWordInvalidGuesses],
      })

      this.onPracticeOrMistakeQuestionFinished(rs.currentWord, rs.letterCount, 'won', false)

      this.state.screen = 'word_result'
      this.emitState()
      return
    }

    // 5 hak bitti mi?
    if (rs.guesses.length >= 5) {
      this.clock.stop()
      rs.wordLost = true
      rs.lossReason = 'max_attempts'

      this.publishQuestionResolved({
        mode: this.state.mode,
        level: this.state.level,
        letterCount: rs.letterCount,
        result: 'lost',
        attemptCount: rs.guesses.length,
        lossReason: 'five_guesses',
        word: rs.currentWord,
        guesses: rs.guesses.map(g => g.guess),
        guessMarks: rs.guesses.map(g => g.marks.slice(1)),
        guessDurationsMs: [...this.currentWordGuessDurationsMs],
        guessTimes: [...this.currentWordGuessTimes],
        invalidWords: [...this.currentWordInvalidGuesses],
        invalidGuesses: [...this.currentWordInvalidGuesses],
      })

      this.onPracticeOrMistakeQuestionFinished(rs.currentWord, rs.letterCount, 'lost', false)

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

  /** 1–3. tur (ve çalışma) tahmin süresi dolunca */
  onGuessTimeout(): void {
    if (this.state.screen !== 'playing_round' || !this.state.roundState) return
    const rs = this.state.roundState

    this.currentWordGuessTimes.push(GUESS_TIME_LIMIT)
    this.currentWordGuessDurationsMs.push(GUESS_TIME_LIMIT * 1000)
    this.clock.stop()
    rs.wordLost = true
    rs.lossReason = 'time_out'

    this.publishQuestionResolved({
      mode: this.state.mode,
      level: this.state.level,
      letterCount: rs.letterCount,
      result: 'lost',
      attemptCount: rs.guesses.length,
      lossReason: 'timeout',
      word: rs.currentWord,
      guesses: rs.guesses.map(g => g.guess),
      guessMarks: rs.guesses.map(g => g.marks.slice(1)),
      guessDurationsMs: [...this.currentWordGuessDurationsMs],
      guessTimes: [...this.currentWordGuessTimes],
      invalidWords: [...this.currentWordInvalidGuesses],
      invalidGuesses: [...this.currentWordInvalidGuesses],
    })

    this.onPracticeOrMistakeQuestionFinished(rs.currentWord, rs.letterCount, 'lost', false)

    this.state.screen = 'word_result'
    this.emitState()
  }

  /**
   * SPEC-v2 Bölüm 10: PAS eylemi
   * 1–3. turda ve Çalışma modunda kelime kaybedilir (neden: 'pass', 0 puan, sonuç kartı -> Devam Et -> 3-2-1).
   * 4. turda kelime kaybedilir (doğru cevap ~3 sn gösterilir, sayaç donar, yeni kelime).
   * Bonus modunda veya uygunsuz ekranlarda yok sayılır.
   */
  passWord(): boolean {
    if (this.state.screen === 'playing_round' && this.state.roundState) {
      const rs = this.state.roundState
      if (rs.wordWon || rs.wordLost) return false

      this.clock.stop()
      rs.wordLost = true
      rs.lossReason = 'pass'

      this.publishQuestionResolved({
        mode: this.state.mode,
        level: this.state.level,
        letterCount: rs.letterCount,
        result: 'pass',
        attemptCount: rs.guesses.length,
        lossReason: 'pass',
        word: rs.currentWord,
        guesses: rs.guesses.map(g => g.guess),
        guessMarks: rs.guesses.map(g => g.marks.slice(1)),
        guessDurationsMs: [...this.currentWordGuessDurationsMs],
        guessTimes: [...this.currentWordGuessTimes],
        invalidWords: [...this.currentWordInvalidGuesses],
        invalidGuesses: [...this.currentWordInvalidGuesses],
      })

      this.onPracticeOrMistakeQuestionFinished(rs.currentWord, rs.letterCount, 'pass', false)

      this.state.screen = 'word_result'
      this.emitState()
      return true
    }

    if (this.state.screen === 'round4_playing' && this.state.round4State) {
      const r4 = this.state.round4State
      this.clock.pause()
      r4.lostWord = r4.currentWord
      r4.wordsAttemptedInStage++

      this.publishQuestionResolved({
        mode: this.state.mode,
        level: this.state.level,
        letterCount: r4.stage,
        result: 'pass',
        attemptCount: r4.guesses.length,
        lossReason: 'pass',
        word: r4.currentWord,
        guesses: r4.guesses.map(g => g.guess),
        guessMarks: r4.guesses.map(g => g.marks.slice(1)),
        guessDurationsMs: [...this.currentWordGuessDurationsMs],
        guessTimes: [...this.currentWordGuessTimes],
        invalidWords: [...this.currentWordInvalidGuesses],
        invalidGuesses: [...this.currentWordInvalidGuesses],
      })

      this.state.screen = 'round4_word_lost'
      this.waitClock.start(3, () => this.onRound4WordLostExpire())
      this.emitState()
      return true
    }

    return false
  }

  /**
   * Sonuç kartından "Devam Et" butonuna basıldığında çağrılır.
   * SPEC 4.5 & 6.2: 3 saniyelik geri sayım (3-2-1) çıkar, sonra yeni kelimeye geçer.
   */
  dismissWordResult(): void {
    if (this.state.screen !== 'word_result' || !this.state.roundState) return
    const rs = this.state.roundState

    if (this.state.mode === 'calisma') {
      const ps = this.state.practiceState!
      if (ps.questionIndexInCycle === 1) {
        ps.questionIndexInCycle = 2
        this.setupPracticeWord(5)
        this.state.screen = 'countdown'
        this.state.countdownValue = 3
        this.state.countdownTarget = 'playing_round'
      } else if (ps.questionIndexInCycle === 2) {
        ps.questionIndexInCycle = 3
        this.setupPracticeWord(6)
        this.state.screen = 'countdown'
        this.state.countdownValue = 3
        this.state.countdownTarget = 'playing_round'
      } else if (ps.questionIndexInCycle === 3) {
        ps.questionIndexInCycle = 4
        this.setupPracticeWord(7)
        this.state.screen = 'countdown'
        this.state.countdownValue = 3
        this.state.countdownTarget = 'playing_round'
      } else if (ps.questionIndexInCycle === 4) {
        ps.questionIndexInCycle = 5
        this.setupPracticeBonus(8)
        this.state.screen = 'countdown'
        this.state.countdownValue = 3
        this.state.countdownTarget = 'bonus_reading'
      }
      this.emitState()
      return
    }

    if (this.state.mode === 'hatalar') {
      this.advanceMistakeStep()
      return
    }

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

  // ─── Bonus Soru Akışı (SPEC Bölüm 4.6 & 6) ──────────────────────────

  private setupBonusQuestion(): void {
    this.currentWordGuessTimes = []
    this.currentWordGuessDurationsMs = []
    this.currentWordInvalidGuesses = []
    this.bonusBilSeconds = undefined

    const bonusPool = this.words.getBonusWords()
    const levelData = this.words.getLevelData?.(8) ?? null
    const res = this.words.pickBonusWordByLevel
      ? this.words.pickBonusWordByLevel(this.state.level, this.state.usedWords)
      : pickBonusWordWithFallback(bonusPool, levelData, this.state.level, this.state.usedWords)

    if (!res) {
      throw new Error('Bonus kelime havuzu tükendi!')
    }

    this.state.usedWords.add(res.word)
    const len = letterCount(res.word)

    this.state.bonusState = {
      word: res.word,
      definition: res.definition,
      length: len,
      revealOrder: shuffleRevealOrder(len),
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

    const maxRevealed = (bs.length || bs.word.length) - 1
    const totalTime = bonusTotalTime(bs.length || bs.word.length)
    bs.revealedCount = bonusRevealedAtTime(elapsedSeconds, maxRevealed)
    bs.currentScore = bonusScore(bs.revealedCount, maxRevealed)

    if (elapsedSeconds >= totalTime) {
      // Süre doldu ve BİL basılmadı -> kelime açılır, 0 puan
      this.onBonusExpire()
      return
    }

    this.emitState()
  }

  /**
   * Bonus soruda "BİL" butonuna basıldığında.
   * SPEC 4.6: Harf açılması durur, puan donar, 10 sn yazma süresi başlar.
   */
  pressBil(): void {
    if (this.state.screen !== 'bonus_reading' || !this.state.bonusState) return
    const bs = this.state.bonusState

    const totalTime = bonusTotalTime(bs.length || bs.word.length)
    this.bonusBilSeconds = Math.round(Math.max(0, totalTime - this.clock.getRemainingSeconds()) * 10) / 10
    this.clock.stop()
    bs.bilPressed = true
    bs.frozenScore = bs.currentScore
    this.state.screen = 'bonus_writing'

    // 10 sn yazma süresi başlar
    this.clock.start(BONUS_WRITE_TIME, () => this.onBonusWriteTimeout())
    this.emitState()
  }

  /**
   * Bonus soruda cevabı gönderir (10 sn yazma süresi içinde).
   */
  submitBonusAnswer(answerRaw: string): void {
    if (this.state.screen !== 'bonus_writing' || !this.state.bonusState) return
    const bs = this.state.bonusState

    this.clock.stop()
    const elapsed = Math.round(Math.max(0, BONUS_WRITE_TIME - this.clock.getRemainingSeconds()) * 10) / 10
    const elapsedMs = Math.round(Math.max(0, (BONUS_WRITE_TIME - this.clock.getRemainingSeconds()) * 1000))
    this.currentWordGuessTimes.push(elapsed)
    this.currentWordGuessDurationsMs.push(elapsedMs)
    const answer = normalize(answerRaw)
    bs.userInput = answer
    bs.answered = true
    const len = bs.length || bs.word.length

    if (answer === bs.word) {
      bs.won = true
      if (this.state.mode === 'yarisma') {
        this.state.currentRoundPoints += bs.frozenScore
        this.state.treasury += bs.frozenScore
      }

      this.publishQuestionResolved({
        mode: this.state.mode,
        level: this.state.level,
        letterCount: len,
        result: 'won',
        attemptCount: 1,
        word: bs.word,
        guesses: [answer],
        guessMarks: [],
        guessDurationsMs: [...this.currentWordGuessDurationsMs],
        guessTimes: [...this.currentWordGuessTimes],
        bonusResultType: 'correct',
        bonusLettersOpened: bs.revealedCount,
        bonusBilSeconds: this.bonusBilSeconds,
        bonusPoints: bs.frozenScore,
        invalidWords: [],
        invalidGuesses: [],
      })

      this.onPracticeOrMistakeQuestionFinished(bs.word, len, 'won', true)
    } else {
      bs.won = false
      this.currentWordInvalidGuesses.push(answer)
      this.publishQuestionResolved({
        mode: this.state.mode,
        level: this.state.level,
        letterCount: len,
        result: 'lost',
        attemptCount: 1,
        lossReason: 'invalid_word',
        word: bs.word,
        guesses: [answer],
        guessMarks: [],
        guessDurationsMs: [...this.currentWordGuessDurationsMs],
        guessTimes: [...this.currentWordGuessTimes],
        bonusResultType: 'wrong',
        bonusLettersOpened: bs.revealedCount,
        bonusBilSeconds: this.bonusBilSeconds,
        bonusPoints: 0,
        invalidWords: [answer],
        invalidGuesses: [answer],
      })

      this.onPracticeOrMistakeQuestionFinished(bs.word, len, 'lost', true)
    }

    this.state.screen = 'bonus_result'
    this.emitState()
  }

  /** Bonus yazma süresi dolunca (10 sn) */
  onBonusWriteTimeout(): void {
    if (this.state.screen !== 'bonus_writing' || !this.state.bonusState) return
    const bs = this.state.bonusState

    this.clock.stop()
    this.currentWordGuessTimes.push(BONUS_WRITE_TIME)
    this.currentWordGuessDurationsMs.push(BONUS_WRITE_TIME * 1000)
    bs.won = false
    bs.answered = true
    const len = bs.length || bs.word.length

    this.publishQuestionResolved({
      mode: this.state.mode,
      level: this.state.level,
      letterCount: len,
      result: 'lost',
      attemptCount: 1,
      lossReason: 'timeout',
      word: bs.word,
      guesses: [],
      guessMarks: [],
      guessDurationsMs: [...this.currentWordGuessDurationsMs],
      guessTimes: [...this.currentWordGuessTimes],
      bonusResultType: 'write_timeout',
      bonusLettersOpened: bs.revealedCount,
      bonusBilSeconds: this.bonusBilSeconds,
      bonusPoints: 0,
      invalidWords: [],
      invalidGuesses: [],
    })

    this.onPracticeOrMistakeQuestionFinished(bs.word, len, 'lost', true)

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
    const len = bs.length || bs.word.length
    bs.revealedCount = len - 1
    bs.currentScore = 0

    this.publishQuestionResolved({
      mode: this.state.mode,
      level: this.state.level,
      letterCount: len,
      result: 'lost',
      attemptCount: 0,
      lossReason: 'timeout',
      word: bs.word,
      guesses: [],
      guessMarks: [],
      guessDurationsMs: [],
      guessTimes: [],
      bonusResultType: 'not_pressed',
      bonusLettersOpened: bs.revealedCount,
      bonusBilSeconds: undefined,
      bonusPoints: 0,
      invalidWords: [],
      invalidGuesses: [],
    })

    this.onPracticeOrMistakeQuestionFinished(bs.word, len, 'lost', true)

    this.state.screen = 'bonus_result'
    this.emitState()
  }

  /** Bonus sonuç kartından sonra tur özetine (yarışma) veya sonraki döngüye (çalışma / hatalar) geç */
  dismissBonusResult(): void {
    if (this.state.screen !== 'bonus_result') return

    if (this.state.mode === 'calisma') {
      const ps = this.state.practiceState!
      ps.cycle++
      ps.questionIndexInCycle = 1
      this.setupPracticeWord(4)
      this.state.screen = 'countdown'
      this.state.countdownValue = 3
      this.state.countdownTarget = 'playing_round'
      this.emitState()
      return
    }

    if (this.state.mode === 'hatalar') {
      this.advanceMistakeStep()
      return
    }

    // SPEC M7: 1–3. tur sonlarında bonus sonrası tur özet ekranı gösterilir
    this.state.screen = 'round_summary'
    this.emitState()
  }

  /** Tur özeti ekranından bir sonraki tura (2, 3) veya 4. Tur giriş ekranına geçiş */
  nextRound(): void {
    if (this.state.screen !== 'round_summary') return
    const currentRound = this.state.roundState?.round ?? 1

    if (currentRound < 3) {
      const nextR = (currentRound + 1) as 2 | 3
      this.state.currentRoundPoints = 0
      this.setupRoundWord(nextR, 1)
      this.state.screen = 'countdown'
      this.state.countdownValue = 3
      this.state.countdownTarget = 'playing_round'
      this.emitState()
    } else {
      // 3. tur bitti -> 4. Tur giriş ekranına geç
      this.state.screen = 'round4_intro'
      this.emitState()
    }
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
   * Parametrik uzunluk destekler (SPEC 6 / M5 / M8).
   */
  getEmptyPositions(): number[] {
    const bs = this.state.bonusState
    if (!bs) return []
    const len = bs.length || bs.word.length
    const locked = this.getLockedPositions()
    const empty: number[] = []
    for (let i = 0; i < len; i++) {
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
   * Parametrik uzunluk destekler (SPEC 6 / M5 / M8).
   */
  private autoSubmitBonus(): void {
    if (!this.state.bonusState) return
    const bs = this.state.bonusState
    const len = bs.length || bs.word.length
    const locked = this.getLockedPositions()
    const emptyPositions = this.getEmptyPositions()

    const wordChars = Array.from(bs.word)
    const result: string[] = new Array(len)

    // Kilitli pozisyonlara doğru harfleri koy
    for (let i = 0; i < len; i++) {
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

  // ─── 4. Tur (Büyük Final) Akışı (SPEC Bölüm 4.8) ───────────────────

  /** 4. tur giriş ekranından "Başla"ya basıldığında */
  startRound4(): void {
    if (this.state.screen !== 'round4_intro') return

    // 1–3. tur roundState'ini tamamen temizle ki 4. turda asla eski tahminler sızmasın
    this.state.roundState = undefined

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
    this.currentWordGuessTimes = []
    this.currentWordGuessDurationsMs = []
    this.currentWordInvalidGuesses = []
    this.round4LastGuessRemainingSeconds = this.clock.getRemainingSeconds()

    const pool = this.words.getWords(stage)
    const levelData = this.words.getLevelData?.(stage) ?? null
    const res = this.words.pickWordByLevel
      ? this.words.pickWordByLevel(stage, this.state.level, this.state.usedWords)
      : pickWordWithFallback(pool, levelData, this.state.level, this.state.usedWords)

    if (!res) {
      throw new Error(`4. Tur ${stage} harfli kelime havuzu tükendi!`)
    }

    const word = res.word

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

    const currentRemaining = this.clock.getRemainingSeconds()
    const elapsedSec = Math.max(0, this.round4LastGuessRemainingSeconds - currentRemaining)
    const elapsedMs = Math.round(elapsedSec * 1000)
    this.round4LastGuessRemainingSeconds = currentRemaining
    this.currentWordGuessTimes.push(Math.round(elapsedSec * 10) / 10)
    this.currentWordGuessDurationsMs.push(elapsedMs)

    // Geçerlilik kontrolü
    const isValid = this.words.isValidWord(guess, r4.stage)

    if (!isValid) {
      // Yeni kural: Geçersiz kelime -> tüm kutular kırmızı,
      // doğru cevap ~3 sn gösterilir, ana sayaç DONDURULUR, bekleme sonrası yeni kelimeye geçilir.
      this.clock.pause()
      r4.lostWord = r4.currentWord
      r4.wordsAttemptedInStage++
      r4.guesses.push({
        guess,
        marks: Array(r4.stage).fill('red'),
      })

      this.publishQuestionResolved({
        mode: this.state.mode,
        level: this.state.level,
        letterCount: r4.stage,
        result: 'lost',
        attemptCount: r4.guesses.length,
        lossReason: 'invalid_word',
        word: r4.currentWord,
        guesses: r4.guesses.map(g => g.guess),
        guessMarks: r4.guesses.map(g => g.marks.slice(1)),
        guessDurationsMs: [...this.currentWordGuessDurationsMs],
        guessTimes: [...this.currentWordGuessTimes],
        invalidWords: [guess],
        invalidGuesses: [guess],
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

      this.publishQuestionResolved({
        mode: this.state.mode,
        level: this.state.level,
        letterCount: r4.stage,
        result: 'won',
        attemptCount: r4.guesses.length,
        word: r4.currentWord,
        guesses: r4.guesses.map(g => g.guess),
        guessMarks: r4.guesses.map(g => g.marks.slice(1)),
        guessDurationsMs: [...this.currentWordGuessDurationsMs],
        guessTimes: [...this.currentWordGuessTimes],
        invalidWords: [],
        invalidGuesses: [],
      })

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

      this.publishQuestionResolved({
        mode: this.state.mode,
        level: this.state.level,
        letterCount: r4.stage,
        result: 'lost',
        attemptCount: 5,
        lossReason: 'five_guesses',
        word: r4.currentWord,
        guesses: r4.guesses.map(g => g.guess),
        guessMarks: r4.guesses.map(g => g.marks.slice(1)),
        guessDurationsMs: [...this.currentWordGuessDurationsMs],
        guessTimes: [...this.currentWordGuessTimes],
        invalidWords: [],
        invalidGuesses: [],
      })

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
    const round4TimeLeft = Math.max(0, Math.round(this.clock.getRemainingSeconds()))
    this.clock.stop()
    const lastStage = this.state.round4State?.lastCompletedStage ?? null
    const finalScore = round4FinalScore(this.state.treasury, lastStage)

    this.state.finalScore = finalScore
    this.state.isNewRecord = finalScore > this.highScore
    this.state.screen = 'game_over'
    this.emitState()

    this.onGameCompleted?.({
      timestamp: this.nowFn ? this.nowFn() : Date.now(),
      level: this.state.level,
      finalScore,
      treasury: this.state.treasury,
      lastCompletedStage: lastStage,
      solvedWordsCount: this.gameSolvedWordsCount,
      lostWordsCount: this.gameLostWordsCount,
      round4TimeLeft,
    })
  }

  // ─── Çalışma Modu Bitir (SPEC-v2 Bölüm 6.3 & 6.5) ───────────────────

  finishPractice(autoEnded: boolean = false): PracticeSummary {
    return this.endPractice(autoEnded)
  }

  /**
   * Çalışma / Hatalarımla modunu sonlandırır ve oturum özetini oluşturur.
   */
  endPractice(autoEnded: boolean = false): PracticeSummary {
    this.clock.stop()
    this.waitClock.stop()

    const ps = this.state.practiceState || {
      cycle: 1,
      questionIndexInCycle: 1,
      totalAsked: 0,
      totalWon: 0,
      totalLost: 0,
      totalPassed: 0,
      byLetter: {},
      bonusWonCount: 0,
      bonusLostCount: 0,
      missedWords: [],
      currentWordInvalidGuesses: [],
      currentWordGuessTimes: [],
    }

    if (autoEnded) {
      ps.autoEnded = true
    }

    const summary: PracticeSummary = {
      totalQuestions: ps.totalAsked,
      wonCount: ps.totalWon,
      lostCount: ps.totalLost,
      passCount: ps.totalPassed,
      byLetter: { ...ps.byLetter },
      bonusWonCount: ps.bonusWonCount,
      bonusLostCount: ps.bonusLostCount,
      missedWords: [...ps.missedWords],
      learnedWords: ps.learnedThisSession ? [...ps.learnedThisSession] : [],
      autoEnded: Boolean(ps.autoEnded),
      remainingCount: ps.remainingCount,
    }

    this.state.practiceSummary = summary
    this.state.screen = 'practice_summary'
    this.emitState()

    this.onSessionCompleted?.({
      timestamp: this.nowFn ? this.nowFn() : Date.now(),
      mode: this.state.mode as 'calisma' | 'hatalar',
      level: this.state.mode === 'hatalar' ? undefined : this.state.level,
      totalQuestions: ps.totalAsked,
      wonCount: ps.totalWon,
      lostCount: ps.totalLost,
      passCount: ps.totalPassed,
      byLetter: { ...ps.byLetter },
      bonusWonCount: ps.bonusWonCount,
      bonusLostCount: ps.bonusLostCount,
    })

    return summary
  }

  // ─── Duraklat / Devam (Background / Pause) ─────────────────────────

  /** Oyunu duraklatır (sekme gizlenince / menüden) */
  pauseGame(): void {
    if (
      this.state.screen === 'paused' ||
      this.state.screen === 'menu' ||
      this.state.screen === 'game_over' ||
      this.state.screen === 'practice_summary'
    ) {
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

