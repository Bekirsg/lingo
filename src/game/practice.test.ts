/**
 * LİNGO v2 — Çalışma Modu ve Parametrik Bonus Testleri (V2-M5)
 * SPEC-v2 Bölüm 3.3, 4.3, 6.1–6.4, 10, 11.1 m.9, 12/V2-M5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GameController, type QuestionResolvedEvent } from './state'
import { createWordRepository, type WordRepository } from '../data/words'
import { shuffleRevealOrder, bonusRevealedAtTime } from './engine'
import { ensureLevelsLoaded } from '../data/wordsLoader'
import { HIGH_SCORE_KEY, V2_RECORDS_KEY, V2_STATS_KEY } from '../data/storage'

function createLocalStorageMock() {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
}

describe('V2-M5 Çalışma Modu ve Parametrik Bonus Testleri', () => {
  let repo: WordRepository

  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock())

    repo = createWordRepository({
      words4: ['ayak', 'elma', 'masa', 'kutu', 'baba', 'anne', 'kale', 'boru', 'kedi', 'taka'],
      words5: ['kalem', 'kitap', 'araba', 'çanta', 'ekmek', 'çorap', 'bıçak', 'kaşık', 'tabak', 'sehpa'],
      words6: ['bilmek', 'gelmek', 'gitmek', 'okumak', 'yazmak', 'sevmek', 'bakmak', 'görmek', 'kalmak', 'satmak'],
      words7: ['anahtar', 'pencere', 'çalışma', 'öğrenci', 'hastane', 'belediye', 'lokanta', 'oyuncak', 'telefon', 'merdiven'],
      bonus8: [
        { w: 'sandalye', d: 'Oturmaya yarayan eşya' },
        { w: 'portakal', d: 'Turunçgil meyvesi' },
        { w: 'tencere', d: 'Yemek pişirme kabı' },
        { w: 'makarna', d: 'Hamur işi yemek' },
      ],
      levels: {
        4: { kolay: ['ayak', 'elma'], orta: ['masa', 'kutu'] },
        5: { kolay: ['kalem', 'kitap'], orta: ['araba', 'çanta'] },
        6: { kolay: ['bilmek', 'gelmek'], orta: ['gitmek', 'okumak'] },
        7: { kolay: ['anahtar', 'pencere'], orta: ['çalışma', 'öğrenci'] },
        8: { kolay: ['sandalye', 'portakal'], orta: ['tencere', 'makarna'] },
      },
    })
  })

  it('1) Döngü sırası: 1×4 -> 1×5 -> 1×6 -> 1×7 -> 1×8 bonus -> başa dön (2 tam döngü = 10 soru)', () => {
    const game = new GameController({ words: repo, level: 'kolay' })
    game.startNewGame('kolay', 'calisma')

    const letterOrder: number[] = []

    for (let cycle = 1; cycle <= 2; cycle++) {
      // 4 harfli
      game.tickCountdown(0)
      expect(game.getState().screen).toBe('playing_round')
      expect(game.getState().roundState?.letterCount).toBe(4)
      letterOrder.push(4)
      game.submitGuess(game.getState().roundState!.currentWord)
      expect(game.getState().screen).toBe('word_result')
      game.dismissWordResult()

      // 5 harfli
      game.tickCountdown(0)
      expect(game.getState().screen).toBe('playing_round')
      expect(game.getState().roundState?.letterCount).toBe(5)
      letterOrder.push(5)
      game.submitGuess(game.getState().roundState!.currentWord)
      expect(game.getState().screen).toBe('word_result')
      game.dismissWordResult()

      // 6 harfli
      game.tickCountdown(0)
      expect(game.getState().screen).toBe('playing_round')
      expect(game.getState().roundState?.letterCount).toBe(6)
      letterOrder.push(6)
      game.submitGuess(game.getState().roundState!.currentWord)
      expect(game.getState().screen).toBe('word_result')
      game.dismissWordResult()

      // 7 harfli
      game.tickCountdown(0)
      expect(game.getState().screen).toBe('playing_round')
      expect(game.getState().roundState?.letterCount).toBe(7)
      letterOrder.push(7)
      game.submitGuess(game.getState().roundState!.currentWord)
      expect(game.getState().screen).toBe('word_result')
      game.dismissWordResult()

      // 8 harfli bonus
      game.tickCountdown(0)
      expect(game.getState().screen).toBe('bonus_reading')
      const bonusWord = game.getState().bonusState!.word
      expect(bonusWord.length).toBe(8)
      letterOrder.push(8)
      game.pressBil()
      game.submitBonusAnswer(bonusWord)
      expect(game.getState().screen).toBe('bonus_result')
      game.dismissBonusResult()
    }

    expect(letterOrder).toEqual([4, 5, 6, 7, 8, 4, 5, 6, 7, 8])
    expect(game.getState().practiceState?.cycle).toBe(3)
    expect(game.getState().practiceState?.totalAsked).toBe(10)
    expect(game.getState().practiceState?.totalWon).toBe(10)
  })

  it('2) Oturum içinde tekrarsız kelime seçimi', () => {
    const game = new GameController({ words: repo, level: 'kolay' })
    game.startNewGame('kolay', 'calisma')

    const wordsSeen = new Set<string>()

    // 1 tam döngü (4, 5, 6, 7, 8)
    for (let i = 0; i < 4; i++) {
      game.tickCountdown(0)
      const w = game.getState().roundState!.currentWord
      expect(wordsSeen.has(w)).toBe(false)
      wordsSeen.add(w)
      game.submitGuess(w)
      game.dismissWordResult()
    }

    game.tickCountdown(0)
    const bw = game.getState().bonusState!.word
    expect(wordsSeen.has(bw)).toBe(false)
    wordsSeen.add(bw)
    game.pressBil()
    game.submitBonusAnswer(bw)
    game.dismissBonusResult()

    expect(wordsSeen.size).toBe(5)
  })

  it('3) Havuz tükendiğinde o harf sayısı için kullanılmış kelimeler sıfırlanır (SPEC 4.3)', () => {
    // Sadece 1 adet 4 harfli kelimesi olan mini havuz
    const tinyRepo = createWordRepository({
      words4: ['ayak'],
      words5: ['kalem'],
      words6: ['bilmek'],
      words7: ['anahtar'],
      bonus8: [{ w: 'sandalye', d: 'Eşya' }],
      levels: {
        4: { kolay: ['ayak'], orta: [] },
        5: { kolay: ['kalem'], orta: [] },
        6: { kolay: ['bilmek'], orta: [] },
        7: { kolay: ['anahtar'], orta: [] },
        8: { kolay: ['sandalye'], orta: [] },
      },
    })

    const game = new GameController({ words: tinyRepo, level: 'kolay' })
    game.startNewGame('kolay', 'calisma')

    // 1. Döngü 4 harfli: ayak
    game.tickCountdown(0)
    expect(game.getState().roundState?.currentWord).toBe('ayak')
    game.submitGuess('ayak')
    game.dismissWordResult()

    // 5, 6, 7, bonus tamamla
    for (let i = 0; i < 3; i++) {
      game.tickCountdown(0)
      game.submitGuess(game.getState().roundState!.currentWord)
      game.dismissWordResult()
    }
    game.tickCountdown(0)
    game.pressBil()
    game.submitBonusAnswer(game.getState().bonusState!.word)
    game.dismissBonusResult()

    // 2. Döngü 4 harfli: havuz tükenmişti ama sıfırlandı ve tekrar 'ayak' geldi (hata fırlatmadı)
    game.tickCountdown(0)
    expect(game.getState().roundState?.letterCount).toBe(4)
    expect(game.getState().roundState?.currentWord).toBe('ayak')
  })

  it('4) Yan etki yok: be:highscore, be:v2:records, be:v2:stats ÇALIŞMADA ASLA YAZILMAZ', () => {
    const game = new GameController({ words: repo, level: 'kolay' })
    game.startNewGame('kolay', 'calisma')

    // 1 soru çöz, 1 soru kaybet, 1 pas yap
    game.tickCountdown(0)
    game.submitGuess(game.getState().roundState!.currentWord)
    game.dismissWordResult()

    game.tickCountdown(0)
    game.passWord()
    game.dismissWordResult()

    // Bitir çağrısı
    game.endPractice()

    expect(localStorage.getItem(HIGH_SCORE_KEY)).toBeNull()
    expect(localStorage.getItem(V2_RECORDS_KEY)).toBeNull()
    expect(localStorage.getItem(V2_STATS_KEY)).toBeNull()
  })

  it('5) PAS normal kelimede çalışır, bonusta reddedilir', () => {
    const game = new GameController({ words: repo, level: 'kolay' })
    game.startNewGame('kolay', 'calisma')

    // Normal kelimede PAS
    game.tickCountdown(0)
    expect(game.getState().screen).toBe('playing_round')
    const passResult = game.passWord()
    expect(passResult).toBe(true)
    expect(game.getState().roundState?.wordLost).toBe(true)
    expect(game.getState().roundState?.lossReason).toBe('pass')
    expect(game.getState().screen).toBe('word_result')
    game.dismissWordResult()

    // Sırayla ilerle -> bonusa gel
    for (let i = 0; i < 3; i++) {
      game.tickCountdown(0)
      game.submitGuess(game.getState().roundState!.currentWord)
      game.dismissWordResult()
    }

    // Bonus okuma fazında PAS
    game.tickCountdown(0)
    expect(game.getState().screen).toBe('bonus_reading')
    const passBonus1 = game.passWord()
    expect(passBonus1).toBe(false)
    expect(game.getState().screen).toBe('bonus_reading')

    // Bonus yazma fazında PAS
    game.pressBil()
    expect(game.getState().screen).toBe('bonus_writing')
    const passBonus2 = game.passWord()
    expect(passBonus2).toBe(false)
    expect(game.getState().screen).toBe('bonus_writing')
  })

  it('6) Bonusta puan verilmez (kasa 0 kalır)', () => {
    const game = new GameController({ words: repo, level: 'kolay' })
    game.startNewGame('kolay', 'calisma')

    // 4 harfli kelime bil
    game.tickCountdown(0)
    game.submitGuess(game.getState().roundState!.currentWord)
    expect(game.getState().treasury).toBe(0)
    game.dismissWordResult()

    // 5, 6, 7 bil
    for (let i = 0; i < 3; i++) {
      game.tickCountdown(0)
      game.submitGuess(game.getState().roundState!.currentWord)
      game.dismissWordResult()
    }

    // Bonus bil
    game.tickCountdown(0)
    game.pressBil()
    game.submitBonusAnswer(game.getState().bonusState!.word)
    expect(game.getState().bonusState?.won).toBe(true)
    expect(game.getState().treasury).toBe(0)
  })

  it('7) "Bitir" oturum özeti matematik tutarlılığı ve kaçan kelimeler listesi', () => {
    const game = new GameController({ words: repo, level: 'kolay' })
    game.startNewGame('kolay', 'calisma')

    // 1. Soru (4h): Bilindi
    game.tickCountdown(0)
    const w4 = game.getState().roundState!.currentWord
    game.submitGuess(w4)
    game.dismissWordResult()

    // 2. Soru (5h): Kaybedildi (süre dolumu)
    game.tickCountdown(0)
    const w5 = game.getState().roundState!.currentWord
    game.onGuessTimeout()
    game.dismissWordResult()

    // 3. Soru (6h): PAS geçildi
    game.tickCountdown(0)
    const w6 = game.getState().roundState!.currentWord
    game.passWord()
    game.dismissWordResult()

    // 4. Soru (7h): Bilindi
    game.tickCountdown(0)
    const w7 = game.getState().roundState!.currentWord
    game.submitGuess(w7)
    game.dismissWordResult()

    // 5. Soru (Bonus): Bilindi
    game.tickCountdown(0)
    const wb = game.getState().bonusState!.word
    game.pressBil()
    game.submitBonusAnswer(wb)
    game.dismissBonusResult()

    // Bitir
    const summary = game.endPractice()
    expect(game.getState().screen).toBe('practice_summary')

    expect(summary.totalQuestions).toBe(5)
    expect(summary.wonCount).toBe(3) // 4h, 7h, bonus
    expect(summary.lostCount).toBe(1) // 5h
    expect(summary.passCount).toBe(1) // 6h
    expect(summary.bonusWonCount).toBe(1)
    expect(summary.bonusLostCount).toBe(0)

    expect(summary.byLetter[4]).toEqual({ asked: 1, won: 1 })
    expect(summary.byLetter[5]).toEqual({ asked: 1, won: 0 })
    expect(summary.byLetter[6]).toEqual({ asked: 1, won: 0 })
    expect(summary.byLetter[7]).toEqual({ asked: 1, won: 1 })
    expect(summary.byLetter[8]).toEqual({ asked: 1, won: 1 })

    expect(summary.missedWords).toHaveLength(2)
    expect(summary.missedWords[0]).toEqual({
      word: w5,
      letterCount: 5,
      reason: 'lost',
      correctWord: w5,
    })
    expect(summary.missedWords[1]).toEqual({
      word: w6,
      letterCount: 6,
      reason: 'pass',
      correctWord: w6,
    })
  })

  it('8) Duraklat / Devam Çalışma modunda çalışır', () => {
    const game = new GameController({ words: repo, level: 'kolay' })
    game.startNewGame('kolay', 'calisma')
    game.tickCountdown(0)

    expect(game.getState().screen).toBe('playing_round')
    game.pauseGame()
    expect(game.getState().screen).toBe('paused')
    expect(game.getState().previousScreen).toBe('playing_round')

    game.resumeGame()
    expect(game.getState().screen).toBe('playing_round')
  })

  it('9) onQuestionResolved olayı fırlatma ve tüm alanların doğruluğu (Çalışma ve Yarışma)', () => {
    const events: QuestionResolvedEvent[] = []
    const game = new GameController({
      words: repo,
      level: 'kolay',
      onQuestionResolved: (e) => events.push(e),
    })

    // Çalışma modunda 1 kelime çöz
    game.startNewGame('kolay', 'calisma')
    game.tickCountdown(0)
    const word = game.getState().roundState!.currentWord
    game.submitGuess(word)

    expect(events).toHaveLength(1)
    const ev = events[0]
    expect(ev.mode).toBe('calisma')
    expect(ev.level).toBe('kolay')
    expect(ev.letterCount).toBe(4)
    expect(ev.result).toBe('won')
    expect(ev.attemptCount).toBe(1)
    expect(ev.word).toBe(word)
    expect(Array.isArray(ev.guessTimes)).toBe(true)
    expect(ev.guessTimes.length).toBe(1)
    expect(Array.isArray(ev.invalidGuesses)).toBe(true)

    // Yarışma modunda da olay fırlatılır
    game.startNewGame('kolay', 'yarisma')
    game.tickCountdown(0)
    game.passWord()

    expect(events).toHaveLength(2)
    const yev = events[1]
    expect(yev.mode).toBe('yarisma')
    expect(yev.level).toBe('kolay')
    expect(yev.result).toBe('pass')
    expect(yev.lossReason).toBe('pass')
  })

  it('10) Parametrik bonus uzunluğu (8 ve 11 harf)', () => {
    // 8 harf testi
    const order8 = shuffleRevealOrder(8)
    expect(order8).toHaveLength(7)
    expect(new Set(order8).size).toBe(7)
    expect(order8.every(n => n >= 1 && n <= 7)).toBe(true)

    // 11 harf testi
    const order11 = shuffleRevealOrder(11)
    expect(order11).toHaveLength(10)
    expect(new Set(order11).size).toBe(10)
    expect(order11.every(n => n >= 1 && n <= 10)).toBe(true)

    // Parametrik bonusRevealedAtTime
    expect(bonusRevealedAtTime(2, 10)).toBe(0)
    expect(bonusRevealedAtTime(4, 10)).toBe(1)
    expect(bonusRevealedAtTime(10, 10)).toBe(7)
    expect(bonusRevealedAtTime(13, 10)).toBe(10)
    expect(bonusRevealedAtTime(20, 10)).toBe(10) // 10 ile sınırlı

    // Standart 7 ile sınırlı
    expect(bonusRevealedAtTime(13, 7)).toBe(7)
  })

  it('11) Ağ hatasında ensureLevelsLoaded sessizce Zor havuzuna düşmez, hata fırlatır (A.1)', async () => {
    const fakeRepo = createWordRepository({
      words4: ['ayak'],
      words5: ['kalem'],
      words6: ['bilmek'],
      words7: ['anahtar'],
      bonus8: [{ w: 'sandalye', d: 'Eşya' }],
    })

    // Fetch başarısız taklidi
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    }))

    await expect(ensureLevelsLoaded(fakeRepo, 'kolay')).rejects.toThrow()
  })
})
