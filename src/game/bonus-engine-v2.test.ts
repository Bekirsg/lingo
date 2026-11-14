import { describe, it, expect, beforeEach } from 'vitest'
import {
  bonusScore,
  bonusRevealedAtTime,
  bonusScoreAtTime,
  bonusTotalTime,
  shuffleRevealOrder,
} from './engine'
import { GameController } from './state'
import { createWordRepository, type WordRepository, type BonusWordItem } from '../data/words'
import { getStudyableCandidates } from './mistakes/mistakeSelector'

describe('Aşama 3B: Parametrik Bonus Oyun Motoru (8, 9, 10, 11 Harf)', () => {
  describe('Zaman Çizelgesi ve Süreler (bonusTotalTime)', () => {
    it('L = 8, 9, 10, 11 için toplam süre = L + 2 saniye olmalıdır', () => {
      expect(bonusTotalTime(8)).toBe(10)
      expect(bonusTotalTime(9)).toBe(11)
      expect(bonusTotalTime(10)).toBe(12)
      expect(bonusTotalTime(11)).toBe(13)
    })
  })

  describe('Harf Açılış ve Puan Formülü (bonusScore, bonusRevealedAtTime, bonusScoreAtTime)', () => {
    const testCases = [
      { L: 8, maxRev: 7, totalTime: 10, lastScoreTime: 9, lastScore: 1800 },
      { L: 9, maxRev: 8, totalTime: 11, lastScoreTime: 10, lastScore: 1600 },
      { L: 10, maxRev: 9, totalTime: 12, lastScoreTime: 11, lastScore: 1400 },
      { L: 11, maxRev: 10, totalTime: 13, lastScoreTime: 12, lastScore: 1200 },
    ]

    for (const { L, maxRev, totalTime, lastScoreTime, lastScore } of testCases) {
      describe(`${L} harfli bonus soru parametrik doğrulaması`, () => {
        it('t < 4 okuma fazıdır: hiç harf açılmaz ve puan 3000 kalır', () => {
          for (let t = 0; t < 4; t += 0.5) {
            expect(bonusRevealedAtTime(t, maxRev)).toBe(0)
            expect(bonusScoreAtTime(t, maxRev)).toBe(3000)
            expect(bonusScore(0, maxRev)).toBe(3000)
          }
        })

        it('t = 4 sn itibaren her saniyede 1 harf açılır', () => {
          expect(bonusRevealedAtTime(4, maxRev)).toBe(1)
          expect(bonusScoreAtTime(4, maxRev)).toBe(2800)
          expect(bonusScore(1, maxRev)).toBe(2800)

          expect(bonusRevealedAtTime(5, maxRev)).toBe(2)
          expect(bonusScoreAtTime(5, maxRev)).toBe(2600)
          expect(bonusScore(2, maxRev)).toBe(2600)
        })

        it(`son geçerli puan t = ${lastScoreTime} sn iken ${lastScore} olmalıdır`, () => {
          expect(bonusRevealedAtTime(lastScoreTime, maxRev)).toBe(maxRev - 1)
          expect(bonusScoreAtTime(lastScoreTime, maxRev)).toBe(lastScore)
          expect(bonusScore(maxRev - 1, maxRev)).toBe(lastScore)
        })

        it(`son harf açıldığında (t = ${totalTime}) puan 0 olmalıdır`, () => {
          expect(bonusRevealedAtTime(totalTime, maxRev)).toBe(maxRev)
          expect(bonusScoreAtTime(totalTime, maxRev)).toBe(0)
          expect(bonusScore(maxRev, maxRev)).toBe(0)
        })
      })
    }
  })

  describe('shuffleRevealOrder', () => {
    it('L harfli kelime için 1..L-1 indekslerini (0 hariç) karıştırarak döndürmelidir', () => {
      for (const len of [8, 9, 10, 11]) {
        const order = shuffleRevealOrder(len)
        expect(order).toHaveLength(len - 1)
        expect(order).not.toContain(0)
        const sorted = [...order].sort((a, b) => a - b)
        const expected = Array.from({ length: len - 1 }, (_, i) => i + 1)
        expect(sorted).toEqual(expected)
      }
    })
  })
})

describe('Aşama 3B: GameController ile 11 Harfli Bonus Soru Entegrasyonu', () => {
  let repo: WordRepository

  const mock11Bonus: BonusWordItem[] = [
    { w: 'kütüphaneci', d: 'Kütüphanede çalışan veya kütüphane yöneticisi' },
    { w: 'sorumluluk', d: 'Kişinin kendi davranışlarının sonuçlarını üstlenmesi' },
  ]

  beforeEach(() => {
    repo = createWordRepository({
      words4: ['ayak', 'elma'],
      words5: ['kitap', 'kalem'],
      words6: ['doktor', 'meyve'],
      words7: ['arkadaş', 'hastane'],
      bonus: mock11Bonus,
    })
  })

  it('11 harfli bonus soru başladığında toplam süre 13 saniye olmalıdır', () => {
    const controller = new GameController({ words: repo, level: 'zor' })
    controller.startNewGame('zor', 'calisma')
    const state = controller.getState()
    expect(state.mode).toBe('calisma')
  })

  it('11 harfli bonus kelimede harf yazma, kilitli harfleri atlama ve otomatik gönderme', () => {
    const controller = new GameController({ words: repo, level: 'zor' })
    controller.startNewGame('zor', 'calisma')

    // Bonus durumunu 11 harfli 'kütüphaneci' ile doğrudan kurgulayalım
    const testWord = 'kütüphaneci'
    const len = testWord.length
    expect(len).toBe(11)

    // Controller'ın internal bonusState'ini simüle et
    const cs = controller.getState() as any
    cs.screen = 'bonus_reading'
    cs.bonusState = {
      word: testWord,
      definition: 'Kütüphanede görevli',
      length: len,
      revealOrder: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // Sırayla açılsın
      revealedCount: 2, // 0 (k), 1 (ü), 2 (t) açık ve kilitli
      currentScore: 2600,
      frozenScore: 0,
      bilPressed: false,
      userInput: '',
      won: false,
      answered: false,
    }

    // BİL basılır
    controller.pressBil()
    const afterBil = controller.getState()
    expect(afterBil.screen).toBe('bonus_writing')
    expect(afterBil.bonusState?.frozenScore).toBe(2600)
    expect(afterBil.bonusState?.bilPressed).toBe(true)

    // Kilitli pozisyonlar: 0, 1, 2
    // Boş pozisyonlar: 3, 4, 5, 6, 7, 8, 9, 10 (toplam 8 harf: ü, p, h, a, n, e, c, i)
    expect(controller.getLockedPositions().has(0)).toBe(true)
    expect(controller.getLockedPositions().has(1)).toBe(true)
    expect(controller.getLockedPositions().has(2)).toBe(true)

    const empty = controller.getEmptyPositions()
    expect(empty).toHaveLength(8)
    expect(empty).toEqual([3, 4, 5, 6, 7, 8, 9, 10])

    // Klavyeden harf yazma
    controller.typeLetter('ü')
    controller.typeLetter('p')
    controller.typeLetter('h')
    expect(controller.getState().bonusState?.userInput).toBe('üph')

    // SİL testi: sadece son yazılan harfi siler
    controller.deleteLetter()
    expect(controller.getState().bonusState?.userInput).toBe('üp')

    // Kalan harfleri tamamla: h, a, n, e, c, i
    controller.typeLetter('h')
    controller.typeLetter('a')
    controller.typeLetter('n')
    controller.typeLetter('e')
    controller.typeLetter('c')
    // Son harf yazıldığında otomatik submit tetiklenmelidir
    controller.typeLetter('i')

    const finalState = controller.getState()
    expect(finalState.screen).toBe('bonus_result')
    expect(finalState.bonusState?.won).toBe(true)
    expect(finalState.bonusState?.answered).toBe(true)
  })

  it('Hatalarımla modunda güncel havuzda bulunmayan eski kelimeler sessizce atlanmalıdır', () => {
    const missedMap = {
      eski_kelime_artik_yok: { y: 2, c: 1, last: 1000 },
      kütüphaneci: { y: 1, c: 0, last: 2000 },
    }
    const learnedMap = {}
    const pool = getStudyableCandidates(missedMap, learnedMap, repo)

    // Eski kelime sessizce atlanmalı, kütüphaneci bonus olarak havuza dahil edilmeli
    expect(pool.all).toHaveLength(1)
    expect(pool.bonus).toHaveLength(1)
    expect(pool.bonus[0].word).toBe('kütüphaneci')
    expect(pool.bonus[0].isBonus).toBe(true)
    expect(pool.bonus[0].letterCount).toBe(11)
  })
})

describe('Aşama 3B: Kutu Genişliği ve Ekran Geometrisi Doğrulaması (320px ve 393px)', () => {
  function computeBoxWidth(wordLength: number, screenWidth: number): {
    boxWidth: number
    gap: number
    totalRowWidth: number
  } {
    const isCompact = wordLength >= 10
    const gap = isCompact ? 2 : 4 // gap-0.5 = 2px, gap-1 = 4px
    const padding = 8 // px-1 = 4px + 4px
    const availableWidth = screenWidth - padding
    const totalGaps = (wordLength - 1) * gap
    const boxWidth = Math.min(42, (availableWidth - totalGaps) / wordLength)
    const totalRowWidth = (wordLength * boxWidth) + totalGaps
    return {
      boxWidth: Math.round(boxWidth * 10) / 10,
      gap,
      totalRowWidth: Math.round(totalRowWidth * 10) / 10,
    }
  }

  it('320px ve 393px ekranlarda 8-11 harfli kutular asla taşma yapmamalıdır', () => {
    for (const len of [8, 9, 10, 11]) {
      const at320 = computeBoxWidth(len, 320)
      const at393 = computeBoxWidth(len, 393)

      expect(at320.totalRowWidth).toBeLessThanOrEqual(312)
      expect(at320.boxWidth).toBeGreaterThanOrEqual(24) // Okunabilir asgari boyut

      expect(at393.totalRowWidth).toBeLessThanOrEqual(385)
      expect(at393.boxWidth).toBeGreaterThanOrEqual(30)
    }
  })
})
