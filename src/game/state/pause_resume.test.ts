import { describe, it, expect } from 'vitest'
import { GameController } from './index'
import { getKeyboardStatuses } from '../engine'
import { createWordRepository } from '../../data/words'

const mockRepo = createWordRepository({
  words4: ['kale', 'kutu', 'kedi', 'kuzu', 'kına'],
  words5: ['kalem', 'kitap', 'kazak', 'kavun'],
  words6: ['kelime', 'karaca', 'kartal'],
  words7: ['karanfi', 'kelebek'],
  bonus8: [
    { w: 'makarna', d: 'İtalyan mutfağına özgü hamur işi' },
  ],
})

function skipToRound4ForTest(game: GameController, treasury = 20_000) {
  const g = game as any
  g.clock.stop()
  g.state.roundState = undefined
  g.state.treasury = treasury
  g.state.currentRoundPoints = 0
  g.state.screen = 'round4_intro'
  g.emitState()
}

function skipToBonusForTest(game: GameController) {
  const g = game as any
  g.clock.stop()
  g.setupBonusQuestion()
  g.state.screen = 'countdown'
  g.state.countdownValue = 3
  g.state.countdownTarget = 'bonus_reading'
  g.emitState()
}

describe('Duraklat/Devam ve Renk Güvenliği Regresyon Testleri', () => {
  it('Senaryo A (4. Tur Normal Oyun): Gönderilmemiş harfler duraklat/devam sonrası asla renklenmez, klavye ve tahta nötr kalır', () => {
    let mockTime = 1000
    const game = new GameController({
      words: mockRepo,
      nowFn: () => mockTime,
    })

    // 4. tura atla
    skipToRound4ForTest(game, 20_000)
    expect(game.getState().screen).toBe('round4_intro')

    // 1-3. tur roundState'inin temizlendiğini doğrula
    expect(game.getState().roundState).toBeUndefined()

    game.startRound4()
    game.tickCountdown(0)
    expect(game.getState().screen).toBe('round4_playing')

    const r4 = game.getState().round4State!
    const targetWord = r4.currentWord
    expect(r4.guesses).toHaveLength(0)

    // Oyuncu bazı harfler yazar ama GÖNDERMEZ
    game.typeLetter('a')
    game.typeLetter('l')
    game.typeLetter('e')

    const currentInputBefore = game.getState().round4State!.currentInput
    expect(currentInputBefore.length).toBeGreaterThan(1)

    // Henüz hiçbir tahmin gönderilmediğinden guesses BOŞTUR ve klavyede renk YOKTUR
    expect(game.getState().round4State!.guesses).toHaveLength(0)
    const kbBefore = getKeyboardStatuses(game.getState().round4State!.guesses)
    expect(Object.keys(kbBefore)).toHaveLength(0)

    // Oyuncu oyunu duraklatır (ör. başka uygulamaya geçer)
    game.pauseGame()
    expect(game.getState().screen).toBe('paused')
    expect(game.getState().previousScreen).toBe('round4_playing')
    // 4. turda duraklatıldığında 1-3. tur roundState'i ASLA bulunmamalıdır
    expect(game.getState().roundState).toBeUndefined()

    // Zaman ilerlese bile saat durmalıdır
    mockTime += 10_000
    game.getClock().check()

    // Oyuncu geri döner ve "Devam Et" der
    game.resumeGame()
    expect(game.getState().screen).toBe('round4_playing')

    const r4After = game.getState().round4State!
    // KURAL: Gönderilmemiş tahmin kesinlikle cevaba göre değerlendirilmez
    expect(r4After.guesses).toHaveLength(0)
    expect(r4After.currentInput).toBe(currentInputBefore)

    // Klavye kesinlikle renksiz kalmalıdır
    const kbAfter = getKeyboardStatuses(r4After.guesses)
    expect(Object.keys(kbAfter)).toHaveLength(0)

    // Hedef kelimedeki harflerin sızmadığını doğrula
    for (const char of Array.from(targetWord)) {
      expect(kbAfter[char]).toBeUndefined()
    }
  })

  it('Senaryo B (4. Tur 1 Tahmin Sonrası): Sadece gönderilmiş tahmin renklidir, unsubmitted ikinci girdi renklenmez', () => {
    let mockTime = 1000
    const game = new GameController({
      words: mockRepo,
      nowFn: () => mockTime,
    })

    skipToRound4ForTest(game, 20_000)
    game.startRound4()
    game.tickCountdown(0)

    const r4 = game.getState().round4State!
    const firstChar = Array.from(r4.currentWord)[0]

    // 1. geçerli tahmin gönderilir (ilk harf uyuşmalı)
    const validGuess = mockRepo.getWords(4).find((w) => w.startsWith(firstChar) && w !== r4.currentWord) || firstChar + 'utu'
    game.submitRound4Guess(validGuess)

    // 1 tahmin kaydedildi
    expect(game.getState().round4State!.guesses).toHaveLength(1)
    const kbBefore = getKeyboardStatuses(game.getState().round4State!.guesses)

    // İkinci tahmin için harfler yazılır ama gönderilmez
    game.typeLetter('a')
    game.typeLetter('b')

    // Duraklat ve devam et
    game.pauseGame()
    mockTime += 5_000
    game.resumeGame()

    const r4After = game.getState().round4State!
    expect(r4After.guesses).toHaveLength(1)
    const kbAfter = getKeyboardStatuses(r4After.guesses)

    // Klavye renkleri duraklatma öncesi ile BİREBİR AYNI kalmalıdır
    expect(kbAfter).toEqual(kbBefore)
  })

  it('Senaryo C (4. Tur Kelime Kaybı Dondurma Anında Duraklatma): 3 sn bekleme sırasında duraklat/devam doğru çalışır', () => {
    let mockTime = 1000
    const game = new GameController({
      words: mockRepo,
      nowFn: () => mockTime,
    })

    skipToRound4ForTest(game, 20_000)
    game.startRound4()
    game.tickCountdown(0)

    const r4 = game.getState().round4State!
    const firstChar = Array.from(r4.currentWord)[0]

    // Geçersiz kelime gönder -> round4_word_lost ekranı, 3 sn dondurulmuş bekleme başlar
    game.submitRound4Guess(firstChar + 'xyz')
    expect(game.getState().screen).toBe('round4_word_lost')
    expect(game.getState().round4State!.lostWord).toBeDefined()
    expect(game.getWaitClock().isRunning()).toBe(true)

    // 1 sn sonra duraklat
    mockTime += 1000
    game.getWaitClock().check()
    game.pauseGame()

    expect(game.getState().screen).toBe('paused')
    expect(game.getState().previousScreen).toBe('round4_word_lost')
    expect(game.getWaitClock().isPaused()).toBe(true)

    // Arka planda 10 sn geçsin
    mockTime += 10_000
    game.getWaitClock().check()
    // Süre dondurulduğu için henüz yeni kelimeye geçmemiş olmalı
    expect(game.getState().screen).toBe('paused')

    // Devam et
    game.resumeGame()
    expect(game.getState().screen).toBe('round4_word_lost')
    expect(game.getWaitClock().isRunning()).toBe(true)

    // Kalan 2 sn bekleme dolsun
    mockTime += 2050
    game.getWaitClock().check()

    // 3 sn dolunca otomatik yeni kelimeye geçilmiş olmalı
    expect(game.getState().screen).toBe('round4_playing')
    // Yeni kelimede guesses sıfırlanmış olmalıdır
    expect(game.getState().round4State!.guesses).toHaveLength(0)
    const kbNew = getKeyboardStatuses(game.getState().round4State!.guesses)
    expect(Object.keys(kbNew)).toHaveLength(0)
  })

  it('Senaryo D (1–3. Turlar): Gönderilmemiş harfler varken duraklat/devam tahta ve klavye renklerini değiştirmez', () => {
    let mockTime = 1000
    const game = new GameController({
      words: mockRepo,
      nowFn: () => mockTime,
    })

    game.startNewGame()
    game.tickCountdown(0)
    expect(game.getState().screen).toBe('playing_round')

    // Harf yaz ama gönderme
    game.typeLetter('a')
    game.typeLetter('l')

    const inputBefore = game.getState().roundState!.currentInput
    expect(game.getState().roundState!.guesses).toHaveLength(0)

    game.pauseGame()
    mockTime += 4000
    game.resumeGame()

    expect(game.getState().roundState!.guesses).toHaveLength(0)
    expect(game.getState().roundState!.currentInput).toBe(inputBefore)
    expect(Object.keys(getKeyboardStatuses(game.getState().roundState!.guesses))).toHaveLength(0)
  })

  it('Senaryo E (Bonus Soru): Bonus ekranında duraklatıldığında bonus durumu korunur', () => {
    let mockTime = 1000
    const game = new GameController({
      words: mockRepo,
      nowFn: () => mockTime,
    })

    game.startNewGame()
    game.tickCountdown(0)
    expect(game.getState().screen).toBe('playing_round')

    skipToBonusForTest(game)
    game.tickCountdown(0)
    expect(game.getState().screen).toBe('bonus_reading')

    const bs = game.getState().bonusState!
    expect(bs).toBeDefined()

    game.pauseGame()
    expect(game.getState().screen).toBe('paused')
    expect(game.getState().previousScreen).toBe('bonus_reading')

    mockTime += 5000
    game.resumeGame()
    expect(game.getState().screen).toBe('bonus_reading')
    expect(game.getState().bonusState!.word).toBe('makarna')
  })
})
