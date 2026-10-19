import { describe, it, expect } from 'vitest'
import { GameController } from './index'
import { createWordRepository } from '../../data/words'

describe('Game State Machine (SPEC Bölüm 2.1-2, Bölüm 4)', () => {
  // Deterministic mock repository
  const mockRepo = createWordRepository({
    words4: ['kale', 'kutu', 'kedi', 'kuzu', 'kına', 'kupa', 'kare', 'kuru', 'kura', 'kola'],
    words5: ['kalem', 'kitap', 'kazak', 'kavun', 'kayık', 'köpek', 'kaşık', 'keser', 'koyun', 'külah'],
    words6: ['kelime', 'karaca', 'kartal', 'kaynak', 'kudret', 'kandil', 'kabile', 'karpuz', 'kavram', 'koltuk'],
    words7: ['karanfi', 'kelebek', 'karınca', 'kestane', 'kurnazı', 'kaplıca', 'kadayıf', 'kolonya', 'kılavuz', 'kıvılcı'],
    bonus8: [
      { w: 'bilgisay', d: 'Elektronik veri işleme cihazı' },
      { w: 'çalışmak', d: 'Bir sonuca ulaşmak için güç harcamak' },
      { w: 'karanlık', d: 'Işık olmama durumu' },
      { w: 'öğretmen', d: 'Mesleği bilgi öğretmek olan kimse' },
    ],
  })

  // ─── 1. Mükemmel Oyun Simülasyonu (Maksimum Skor = 328.000) ──────

  it('senaryo 1: mükemmel oyun -> maksimum skor 250.000 + 2×39.000 = 328.000', () => {
    let mockTime = 1000
    const game = new GameController({
      words: mockRepo,
      nowFn: () => mockTime,
      highScore: 100_000,
    })

    // Ana menüden başlat
    expect(game.getState().screen).toBe('menu')
    game.startNewGame()

    // ─── 1. TUR (5 adet 4 harfli kelime + 3000 bonus = 8.000) ───
    expect(game.getState().screen).toBe('countdown')
    game.tickCountdown(1)
    game.tickCountdown(0) // playing_round'a geçer
    expect(game.getState().screen).toBe('playing_round')

    // 1–3. turları tamamla
    for (let r = 1; r <= 3; r++) {
      for (let w = 1; w <= 5; w++) {
        expect(game.getState().screen).toBe('playing_round')
        const currentWord = game.getState().roundState!.currentWord

        // İlk tahminde doğru bil
        game.submitGuess(currentWord)
        expect(game.getState().screen).toBe('word_result')
        expect(game.getState().roundState!.wordWon).toBe(true)

        // Sonuç kartını geç
        game.dismissWordResult()

        if (w < 5) {
          // Sıradaki kelime için 3-2-1
          expect(game.getState().screen).toBe('countdown')
          game.tickCountdown(0)
          expect(game.getState().screen).toBe('playing_round')
        }
      }

      // 5 kelime bitti -> Bonus soru 3-2-1
      expect(game.getState().screen).toBe('countdown')
      expect(game.getState().countdownTarget).toBe('bonus_reading')
      game.tickCountdown(0)
      expect(game.getState().screen).toBe('bonus_reading')

      // Okuma süresinde (t=1 sn) BİL'e bas (3000 puan sabit)
      mockTime += 1000
      game.updateBonusTime(1)
      expect(game.getState().bonusState!.currentScore).toBe(3000)
      game.pressBil()
      expect(game.getState().screen).toBe('bonus_writing')
      expect(game.getState().bonusState!.frozenScore).toBe(3000)

      // 3 sn dolmadan doğru kelimeyi gönder
      const bonusWord = game.getState().bonusState!.word
      game.submitBonusAnswer(bonusWord)
      expect(game.getState().screen).toBe('bonus_result')
      expect(game.getState().bonusState!.won).toBe(true)

      // Bonus sonucunu geç
      game.dismissBonusResult()

      if (r < 3) {
        // Tur özeti ekranı
        expect(game.getState().screen).toBe('round_summary')
        game.nextRound()
        expect(game.getState().screen).toBe('countdown')
        game.tickCountdown(0)
      }
    }

    // 1–3. turlar bitti! Kasa maksimum 39.000 olmalı
    // 1. tur: 5x1000 + 3000 = 8.000
    // 2. tur: 5x2000 + 3000 = 13.000
    // 3. tur: 5x3000 + 3000 = 18.000
    // Toplam: 39.000
    expect(game.getState().treasury).toBe(39_000)

    // 4. tur giriş ekranı
    expect(game.getState().screen).toBe('round4_intro')
    game.startRound4()
    expect(game.getState().screen).toBe('countdown')
    game.tickCountdown(0)

    // 4. tur başladı (120 sn sayaç)
    expect(game.getState().screen).toBe('round4_playing')

    // Etap 4: 4 harfli bilindi
    const w4 = game.getState().round4State!.currentWord
    game.submitRound4Guess(w4)
    expect(game.getState().screen).toBe('round4_stage_cleared')
    expect(game.getState().round4State!.lastCompletedStage).toBe(4)
    game.continueRound4()

    // Etap 5: 5 harfli bilindi
    expect(game.getState().screen).toBe('round4_playing')
    const w5 = game.getState().round4State!.currentWord
    game.submitRound4Guess(w5)
    expect(game.getState().screen).toBe('round4_stage_cleared')
    expect(game.getState().round4State!.lastCompletedStage).toBe(5)
    game.continueRound4()

    // Etap 6: 6 harfli bilindi
    expect(game.getState().screen).toBe('round4_playing')
    const w6 = game.getState().round4State!.currentWord
    game.submitRound4Guess(w6)
    expect(game.getState().screen).toBe('round4_stage_cleared')
    expect(game.getState().round4State!.lastCompletedStage).toBe(6)
    game.continueRound4()

    // Etap 7: 7 harfli bilindi -> Oyun biter!
    expect(game.getState().screen).toBe('round4_playing')
    const w7 = game.getState().round4State!.currentWord
    game.submitRound4Guess(w7)

    // Final skor: 250.000 + (2 × 39.000) = 328.000
    expect(game.getState().screen).toBe('game_over')
    expect(game.getState().finalScore).toBe(328_000)
    expect(game.getState().isNewRecord).toBe(true)
  })

  // ─── 2. 4. Turda Hiç Etap Bitmeden Süre Dolması -> 0 ──────────────

  it('senaryo 2: 4. turda hiç etap bitmeden süre dolması -> final skor 0', () => {
    let mockTime = 1000
    const game = new GameController({
      words: mockRepo,
      nowFn: () => mockTime,
    })

    game.startNewGame()
    game.tickCountdown(0)

    // 1-3 turlar hızlıca geçilsin
    for (let r = 1; r <= 3; r++) {
      for (let w = 1; w <= 5; w++) {
        game.submitGuess(game.getState().roundState!.currentWord)
        game.dismissWordResult()
        if (w < 5) game.tickCountdown(0)
      }
      game.tickCountdown(0)
      game.pressBil()
      game.submitBonusAnswer(game.getState().bonusState!.word)
      game.dismissBonusResult()
      if (r < 3) {
        game.nextRound()
        game.tickCountdown(0)
      }
    }

    expect(game.getState().treasury).toBe(39_000)
    game.startRound4()
    game.tickCountdown(0)
    expect(game.getState().screen).toBe('round4_playing')

    // 4. turda 4 harfli aşamasında 120 sn doldu (hiçbir etap tamamlanmadı)
    mockTime += 125_000
    game.getClock().check()

    // Kasa yanar -> final skor = 0
    expect(game.getState().screen).toBe('game_over')
    expect(game.getState().finalScore).toBe(0)
  })

  // ─── 3. Duraklat / Devam'da Süre Kaybı Olmaması ─────────────────────

  it('senaryo 3: duraklat/devam esnasında süre kaybı olmaz', () => {
    let mockTime = 1000
    const game = new GameController({
      words: mockRepo,
      nowFn: () => mockTime,
    })

    game.startNewGame()
    game.tickCountdown(0)
    expect(game.getState().screen).toBe('playing_round')

    // 3 saniye oynadı (kalan süre 7 sn)
    mockTime += 3000
    game.getClock().check()
    expect(game.getClock().getRemainingSeconds()).toBe(7)

    // Sekme arka plana atıldı / duraklatıldı
    game.pauseGame()
    expect(game.getState().screen).toBe('paused')
    expect(game.getState().previousScreen).toBe('playing_round')

    // 1 saat arka planda kaldı
    mockTime += 3_600_000
    game.getClock().check()
    expect(game.getClock().getRemainingSeconds()).toBe(7)

    // Oyuncu döndü ve "Devam Et" dedi
    game.resumeGame()
    expect(game.getState().screen).toBe('playing_round')
    expect(game.getClock().getRemainingSeconds()).toBe(7)

    // 7 saniye doldu -> süre biter
    mockTime += 7000
    game.getClock().check()
    expect(game.getState().screen).toBe('word_result')
    expect(game.getState().roundState!.wordLost).toBe(true)
    expect(game.getState().roundState!.lossReason).toBe('time_out')
  })

  // ─── 4. Bonus Zaman Çizelgesi ve BİL ────────────────────────────────

  it('senaryo 4: bonus zaman çizelgesi, harf açılması ve BİL mekaniği', () => {
    let mockTime = 1000
    const game = new GameController({
      words: mockRepo,
      nowFn: () => mockTime,
    })

    game.startNewGame()
    game.tickCountdown(0)

    // 1. tur 5 kelimeyi bitir
    for (let w = 1; w <= 5; w++) {
      game.submitGuess(game.getState().roundState!.currentWord)
      game.dismissWordResult()
      if (w < 5) game.tickCountdown(0)
    }

    // Bonus başla
    game.tickCountdown(0)
    expect(game.getState().screen).toBe('bonus_reading')

    // t=2.5 sn: okuma süresi, harf açılmadı, puan 3000
    game.updateBonusTime(2.5)
    expect(game.getState().bonusState!.revealedCount).toBe(0)
    expect(game.getState().bonusState!.currentScore).toBe(3000)

    // t=4 sn: 1. harf açıldı, puan 2800
    game.updateBonusTime(4)
    expect(game.getState().bonusState!.revealedCount).toBe(1)
    expect(game.getState().bonusState!.currentScore).toBe(2800)

    // t=6 sn: 3. harf açıldı, puan 2400
    game.updateBonusTime(6)
    expect(game.getState().bonusState!.revealedCount).toBe(3)
    expect(game.getState().bonusState!.currentScore).toBe(2400)

    // t=6 sn iken BİL'e basıldı -> puan 2400'de donar, yazma fazına geçer
    game.pressBil()
    expect(game.getState().screen).toBe('bonus_writing')
    expect(game.getState().bonusState!.frozenScore).toBe(2400)

    // 3 sn içinde doğru cevap girildi
    const bonusWord = game.getState().bonusState!.word
    game.submitBonusAnswer(bonusWord)
    expect(game.getState().screen).toBe('bonus_result')
    expect(game.getState().bonusState!.won).toBe(true)
    // 5 kelimeden 5000 + 2400 bonus = 7400
    expect(game.getState().treasury).toBe(7400)
  })

  it('senaryo 4b: bonus soruda 3 sn yazma süresi dolarsa 0 puan alır', () => {
    let mockTime = 1000
    const game = new GameController({
      words: mockRepo,
      nowFn: () => mockTime,
    })

    game.startNewGame()
    game.tickCountdown(0)

    for (let w = 1; w <= 5; w++) {
      game.submitGuess(game.getState().roundState!.currentWord)
      game.dismissWordResult()
      if (w < 5) game.tickCountdown(0)
    }

    game.tickCountdown(0)
    expect(game.getState().screen).toBe('bonus_reading')

    game.pressBil()
    expect(game.getState().screen).toBe('bonus_writing')

    // 3 sn yazma süresi doldu
    mockTime += 3500
    game.getClock().check()

    expect(game.getState().screen).toBe('bonus_result')
    expect(game.getState().bonusState!.won).toBe(false)
    expect(game.getState().treasury).toBe(5000) // bonus puanı eklenmedi
  })

  // ─── 5. Geçersiz Kelime ve Süre Aşımı Senaryoları ───────────────────

  it('senaryo 5a: 1-3. turda geçersiz kelime -> anında kaybedilir, doğru cevap gösterilir', () => {
    const game = new GameController({
      words: mockRepo,
    })

    game.startNewGame()
    game.tickCountdown(0)
    expect(game.getState().screen).toBe('playing_round')

    const firstLetter = Array.from(game.getState().roundState!.currentWord)[0]
    // İlk harfi uyan ama TDK'da olmayan uydurma kelime
    const fakeWord = firstLetter + 'xyz'

    game.submitGuess(fakeWord)

    // SPEC 4.2-3: anında kaybedilir, kelime sonuç kartına geçer
    expect(game.getState().screen).toBe('word_result')
    expect(game.getState().roundState!.wordLost).toBe(true)
    expect(game.getState().roundState!.lossReason).toBe('invalid_word')
    expect(game.getState().roundState!.guesses[0].marks).toEqual(['red', 'red', 'red', 'red'])
  })

  it('senaryo 5b: 4. turda geçersiz kelime veya 5 hak bitmesi -> duraklama YOK, yeni kelime anında gelir', () => {
    let mockTime = 1000
    const game = new GameController({
      words: mockRepo,
      nowFn: () => mockTime,
    })

    game.startNewGame()
    game.tickCountdown(0)

    // 1-3. turları tamamla
    for (let r = 1; r <= 3; r++) {
      for (let w = 1; w <= 5; w++) {
        game.submitGuess(game.getState().roundState!.currentWord)
        game.dismissWordResult()
        if (w < 5) game.tickCountdown(0)
      }
      game.tickCountdown(0)
      game.pressBil()
      game.submitBonusAnswer(game.getState().bonusState!.word)
      game.dismissBonusResult()
      if (r < 3) {
        game.nextRound()
        game.tickCountdown(0)
      }
    }

    game.startRound4()
    game.tickCountdown(0)
    expect(game.getState().screen).toBe('round4_playing')

    const firstWord = game.getState().round4State!.currentWord
    const firstChar = Array.from(firstWord)[0]

    // 4. turda geçersiz kelime gönder
    const invalidWord = firstChar + 'xyz'
    game.submitRound4Guess(invalidWord)

    // SPEC 4.8: Duraklama YOK, cevap gösterilmez, anında YENİ bir 4 harfli kelime gelir!
    expect(game.getState().screen).toBe('round4_playing')
    expect(game.getState().round4State!.stage).toBe(4)
    expect(game.getState().round4State!.wordsAttemptedInStage).toBe(2)
    const newWord = game.getState().round4State!.currentWord
    expect(newWord).not.toBe(firstWord)
    expect(game.getState().round4State!.guesses).toHaveLength(0)

    // 5 yanlış geçerli tahmin yapınca da aynı şekilde yeni kelime gelir
    const secondFirstChar = Array.from(newWord)[0]
    // 5 adet yanlış ama geçerli tahmin
    const validWrongGuesses = mockRepo
      .getWords(4)
      .filter(w => Array.from(w)[0] === secondFirstChar && w !== newWord)

    if (validWrongGuesses.length >= 2) {
      for (let i = 0; i < 5; i++) {
        game.submitRound4Guess(validWrongGuesses[i % validWrongGuesses.length])
      }

      // 5 hak bitti -> duraklama YOK, 3. kelime anında geldi!
      expect(game.getState().screen).toBe('round4_playing')
      expect(game.getState().round4State!.wordsAttemptedInStage).toBe(3)
      expect(game.getState().round4State!.guesses).toHaveLength(0)
    }
  })

  // ─── 6. Harf Yazma, Silme ve Kilitli İlk Harf Kontrolü ───────────

  it('senaryo 6: typeLetter ve deleteLetter ile kilitli ilk harf silinemez', () => {
    const game = new GameController({ words: mockRepo })
    game.startNewGame()
    game.tickCountdown(0)

    const firstChar = Array.from(game.getState().roundState!.currentWord)[0]
    expect(game.getState().roundState!.currentInput).toBe(firstChar)

    // Silmeye çalış -> ilk harf silinemez
    game.deleteLetter()
    game.deleteLetter()
    expect(game.getState().roundState!.currentInput).toBe(firstChar)

    // Harf yaz
    game.typeLetter('A')
    game.typeLetter('L')
    expect(game.getState().roundState!.currentInput).toBe(firstChar + 'al')

    // Sil
    game.deleteLetter()
    expect(game.getState().roundState!.currentInput).toBe(firstChar + 'a')
  })

  // ─── 7. Animasyon Sonrası Tahmin Süresi Başlatma (startGuessTimer) ──

  it('senaryo 7: animasyon sırasında 10 sn sayacı beklemede kalır, startGuessTimer ile başlar', () => {
    let mockTime = 1000
    const game = new GameController({
      words: mockRepo,
      nowFn: () => mockTime,
    })

    game.startNewGame()
    game.tickCountdown(0)

    const currentWord = game.getState().roundState!.currentWord
    const firstChar = Array.from(currentWord)[0]
    const otherValid = mockRepo.getWords(4).find(w => Array.from(w)[0] === firstChar && w !== currentWord)!

    // Tahmin gönder ama autoStartNextTimer = false (animasyon oynayacak)
    game.submitGuess(otherValid, false)
    expect(game.getClock().isRunning()).toBe(false)

    // Animasyon süresi geçti (örn. 600 ms)
    mockTime += 600
    expect(game.getClock().isRunning()).toBe(false)

    // Animasyon bitti sinyali geldi -> Sayaç başlar
    game.startGuessTimer()
    expect(game.getClock().isRunning()).toBe(true)
    expect(game.getClock().getRemainingSeconds()).toBe(10)
  })
})
