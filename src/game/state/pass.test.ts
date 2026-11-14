import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { GameController } from './index'
import type { WordRepository } from '../../data/words'

function createMockRepository(): WordRepository {
  const words4 = ['kale', 'kaza', 'kedi', 'kutu', 'kuzu', 'masa', 'saka']
  const words5 = ['kalem', 'kavun', 'kazan', 'kayak', 'kelep', 'kemik']
  const words6 = ['bardak', 'başkan', 'çarşaf', 'dernek', 'fincan']
  const words7 = ['anahtar', 'çerçeve', 'domates', 'hastane', 'pencere']
  const bonusWords = [
    { w: 'arkadaş', d: 'Birbirlerine karşı sevgi ve anlayış gösteren kimselerden her biri' },
  ]

  return {
    getWords(length: number): string[] {
      if (length === 4) return words4
      if (length === 5) return words5
      if (length === 6) return words6
      if (length === 7) return words7
      return []
    },
    getBonusWords() {
      return bonusWords
    },
    isValidWord(word: string, length: number): boolean {
      const pool = this.getWords(length)
      return pool.includes(word)
    },
  }
}

describe('SPEC-v2 Bölüm 10 ve 11.1 (madde 12) - PAS Sistemi Testleri', () => {
  let controller: GameController
  let repo: WordRepository

  beforeEach(() => {
    vi.useFakeTimers()
    repo = createMockRepository()
    controller = new GameController({
      words: repo,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('1–3. turda PAS: kelime kaybedilir (lossReason: pass, 0 puan, sonuç kartı)', () => {
    controller.startNewGame()
    // 3-2-1 geri sayımını bitir
    controller.tickCountdown(0)

    expect(controller.getState().screen).toBe('playing_round')
    const initialTreasury = controller.getState().treasury

    // PAS kullan
    const passed = controller.passWord()
    expect(passed).toBe(true)

    const updatedState = controller.getState()
    const updatedRs = updatedState.roundState!

    expect(updatedState.screen).toBe('word_result')
    expect(updatedRs.wordLost).toBe(true)
    expect(updatedRs.wordWon).toBe(false)
    expect(updatedRs.lossReason).toBe('pass')
    // Puan kazanılmadı
    expect(updatedState.treasury).toBe(initialTreasury)
    expect(updatedState.currentRoundPoints).toBe(0)

    // Devam Et -> 3 sn geri sayım -> sıradaki kelime
    controller.dismissWordResult()
    expect(controller.getState().screen).toBe('countdown')
    expect(controller.getState().countdownTarget).toBe('playing_round')

    controller.tickCountdown(0)
    expect(controller.getState().screen).toBe('playing_round')
    expect(controller.getState().roundState?.wordIndex).toBe(2)
  })

  it('4. turda PAS: kelime kaybedilir, doğru cevap gösterilir, ~3 sn donuk süre, yeni kelime', () => {
    // 4. tura geçiş
    ;(controller as any).state.screen = 'round4_intro'
    controller.startRound4()
    controller.tickCountdown(0)

    expect(controller.getState().screen).toBe('round4_playing')
    const r4Before = controller.getState().round4State!
    const firstWord = r4Before.currentWord

    // PAS kullan
    const passed = controller.passWord()
    expect(passed).toBe(true)

    const lostState = controller.getState()
    expect(lostState.screen).toBe('round4_word_lost')
    expect(lostState.round4State?.lostWord).toBe(firstWord)
    expect(lostState.round4State?.wordsAttemptedInStage).toBe(2)

    // ~3 sn bekleme süresini ilerlet
    vi.advanceTimersByTime(3000)

    const afterWaitState = controller.getState()
    expect(afterWaitState.screen).toBe('round4_playing')
    expect(afterWaitState.round4State?.stage).toBe(4)
    expect(afterWaitState.round4State?.guesses).toHaveLength(0)
    expect(afterWaitState.round4State?.lostWord).toBeUndefined()
  })

  it('Bonus ekranında veya oyun dışı ekranlarda PAS yok sayılır', () => {
    // Henüz oyun başlamadı (menu)
    expect(controller.passWord()).toBe(false)

    // Geri sayım katmanında
    controller.startNewGame()
    expect(controller.getState().screen).toBe('countdown')
    expect(controller.passWord()).toBe(false)

    // Bonus okuma ekranına geç
    controller.tickCountdown(0) // playing_round
    // 5 kelimeyi hızla bitirelim veya setupBonusQuestion çağıralım
    for (let i = 1; i <= 5; i++) {
      controller.passWord()
      controller.dismissWordResult()
      if (i < 5) controller.tickCountdown(0)
    }

    // 5. kelimeden sonra bonus geri sayımına geldi
    expect(controller.getState().screen).toBe('countdown')
    expect(controller.getState().countdownTarget).toBe('bonus_reading')
    controller.tickCountdown(0)
    expect(controller.getState().screen).toBe('bonus_reading')

    // Bonusta PAS yok!
    expect(controller.passWord()).toBe(false)
  })
})
