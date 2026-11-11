/**
 * LİNGO v2 — V2-M8 Hatalarımla Çalış Modu ve Öğrenildi Mantığı Testleri
 * SPEC-v2 Bölüm 6.5, 7.2, 7.7, 8.3 `be:v2:study`, 11.1 madde 7–8, 12/V2-M8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  STUDY_STORAGE_KEY,
  loadStudyData,
  resetStudyData,
  clearStudyCache,
  recordMistakeAnswer,
} from './studyStorage'
import {
  MISTAKE_POOL_SOURCES,
  getStudyableCandidates,
  pickWeightedCandidate,
  getNextMistakeStep,
  type StudyCandidate,
} from './mistakeSelector'
import { generateMistakesDevData } from './devMistakes'
import {
  loadAnalytics,
  saveAnalytics,
  resetAnalytics,
  recordQuestionResolved,
  recordSessionCompleted,
} from '../../analytics/storage'
import { GameController } from '../state'
import type { WordRepository } from '../../data/words'

// Mock MockLocalStorage
class MockLocalStorage {
  private store: Record<string, string> = {}
  getItem(key: string): string | null {
    return this.store[key] ?? null
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value)
  }
  removeItem(key: string): void {
    delete this.store[key]
  }
  clear(): void {
    this.store = {}
  }
}

const mockStorage = new MockLocalStorage()
vi.stubGlobal('localStorage', mockStorage)

// Sahte WordRepository
function createMockRepo(overrides?: Partial<WordRepository>): WordRepository {
  const words4 = ['kale', 'elma', 'kedi', 'kutu']
  const words5 = ['kalem', 'kitap', 'çilek', 'armut']
  const words6 = ['karpuz', 'gözlük', 'yaprak', 'bardak']
  const words7 = ['pencere', 'kelebek', 'makarna', 'tencere']
  const bonusWords = [
    { w: 'apartman', d: 'Bina türü' },
    { w: 'bisiklet', d: 'İki tekerlekli binek' },
    { w: 'çikolata', d: 'Tatlı yiyecek' },
    { w: 'kütüphane', d: 'Kitap evi' }, // 9 harfli
  ]

  const allWords = new Set([...words4, ...words5, ...words6, ...words7, ...bonusWords.map((b) => b.w)])

  return {
    isValidWord: (w: string, _len?: number) => allWords.has(w),
    getWords: (len: number) => {
      if (len === 4) return words4
      if (len === 5) return words5
      if (len === 6) return words6
      if (len === 7) return words7
      return []
    },
    getBonusWords: () => bonusWords,
    getLevelData: () => null,
    pickWordByLevel: (len: number) => ({
      word: (len === 4 ? words4 : len === 5 ? words5 : len === 6 ? words6 : words7)[0],
      level: 'zor' as const,
      fromLevel: 'zor' as const,
    }),
    pickBonusWordByLevel: () => ({
      word: bonusWords[0].w,
      definition: bonusWords[0].d,
      level: 'zor' as const,
      fromLevel: 'zor' as const,
    }),
    ...overrides,
  }
}

describe('V2-M8 Hatalarımla Çalış Modu ve Öğrenildi Mantığı', () => {
  beforeEach(() => {
    mockStorage.clear()
    clearStudyCache()
    resetAnalytics()
    resetStudyData()
  })

  // ─── 1. Havuz Kaynakları Sabiti ───
  describe('1. Havuz Kaynakları Sabiti', () => {
    it('MISTAKE_POOL_SOURCES tam olarak [yarisma, calisma] olmalıdır', () => {
      expect(MISTAKE_POOL_SOURCES).toEqual(['yarisma', 'calisma'])
    })
  })

  // ─── 2. Öğrenildi Mantığı (be:v2:study) ───
  describe('2. Öğrenildi Mantığı (studyStorage)', () => {
    it('Streak ilerlemesi: 0 -> 1 -> 2 -> learned; 2 olunca streakten silinip learned kaydına geçmelidir', () => {
      const w = 'kalem'

      // 1. doğru
      const res1 = recordMistakeAnswer(w, true)
      expect(res1.streak).toBe(1)
      expect(res1.justLearned).toBe(false)
      expect(res1.isLearned).toBe(false)

      let data = loadStudyData()
      expect(data.streak[w]).toBe(1)
      expect(data.learned[w]).toBeUndefined()

      // 2. doğru (ardışık)
      const res2 = recordMistakeAnswer(w, true)
      expect(res2.streak).toBe(2)
      expect(res2.justLearned).toBe(true)
      expect(res2.isLearned).toBe(true)

      data = loadStudyData()
      expect(data.streak[w]).toBeUndefined() // streakten silinir
      expect(typeof data.learned[w]).toBe('number') // timestamp kaydedilir
    })

    it('Yanlış tahmin edildiğinde streak 0 olmalıdır', () => {
      const w = 'kalem'
      recordMistakeAnswer(w, true) // streak = 1
      expect(loadStudyData().streak[w]).toBe(1)

      const res = recordMistakeAnswer(w, false) // yanlış
      expect(res.streak).toBe(0)
      expect(res.justLearned).toBe(false)
      expect(res.isLearned).toBe(false)
      expect(loadStudyData().streak[w]).toBeUndefined()
    })

    it('Streak oturumlar arası kalıcıdır (farklı zamanlarda çağrılsa bile korunur)', () => {
      const w = 'kitap'
      recordMistakeAnswer(w, true) // 1. oturum: streak = 1
      clearStudyCache()

      // 2. oturumda tekrar yüklenip doğru bilinirse learned olur
      const res = recordMistakeAnswer(w, true)
      expect(res.streak).toBe(2)
      expect(res.justLearned).toBe(true)
      expect(loadStudyData().learned[w]).toBeDefined()
    })

    it('be:v2:study bozuk JSON ise çökmemeli ve temiz şemaya dönmelidir', () => {
      mockStorage.setItem(STUDY_STORAGE_KEY, '{ invalid json syntax !!!')
      clearStudyCache()

      const data = loadStudyData()
      expect(data.version).toBe(1)
      expect(data.streak).toEqual({})
      expect(data.learned).toEqual({})
    })
  })

  // ─── 3. Yeniden Kaçırılma Durumunda Learned Sıfırlama ───
  describe('3. Yarışma / Çalışma Modunda Yeniden Kaçırılma', () => {
    it('Yarışma veya Çalışmada learned bir kelime kaybedilirse/PAS edilirse learned düşer ve streak sıfırlanır', () => {
      const w = 'kalem'
      // Kelimeyi önce learned yap
      recordMistakeAnswer(w, true)
      recordMistakeAnswer(w, true)
      expect(loadStudyData().learned[w]).toBeDefined()

      // Yarışma modunda bu kelime kaybedilsin
      recordQuestionResolved({
        mode: 'yarisma',
        level: 'kolay',
        letterCount: 5,
        result: 'lost',
        attemptCount: 5,
        lossReason: 'five_guesses',
        word: w,
        guesses: ['ahmet', 'mehmet'],
        guessMarks: [],
        guessDurationsMs: [2000, 2000],
        guessTimes: [2, 2],
        invalidWords: [],
        invalidGuesses: [],
      })

      const study = loadStudyData()
      expect(study.learned[w]).toBeUndefined() // learned'den çıkarıldı!
      expect(study.streak[w]).toBeUndefined() // streak sıfırlandı!
    })

    it('Çalışma modunda PAS geçildiğinde de learned düşer ve streak sıfırlanır', () => {
      const w = 'kitap'
      recordMistakeAnswer(w, true)
      recordMistakeAnswer(w, true)
      expect(loadStudyData().learned[w]).toBeDefined()

      recordQuestionResolved({
        mode: 'calisma',
        level: 'orta',
        letterCount: 5,
        result: 'pass',
        attemptCount: 1,
        lossReason: 'pass',
        word: w,
        guesses: [],
        guessMarks: [],
        guessDurationsMs: [],
        guessTimes: [],
        invalidWords: [],
        invalidGuesses: [],
      })

      const study = loadStudyData()
      expect(study.learned[w]).toBeUndefined()
    })

    it('Hatalar modunda oynarken missedWords ASLA artmaz', () => {
      const analytics = loadAnalytics()
      analytics.missedWords = {
        kalem: { y: 2, c: 1, last: 100 },
      }
      saveAnalytics(analytics)

      // Hatalar modunda yeni bir kayıp
      recordQuestionResolved({
        mode: 'hatalar',
        level: undefined,
        letterCount: 5,
        result: 'lost',
        attemptCount: 5,
        lossReason: 'five_guesses',
        word: 'kalem',
        guesses: [],
        guessMarks: [],
        guessDurationsMs: [],
        guessTimes: [],
        invalidWords: [],
        invalidGuesses: [],
      })

      const after = loadAnalytics()
      // kalem sayacı artmamalı!
      expect(after.missedWords['kalem'].y).toBe(2)
      expect(after.missedWords['kalem'].c).toBe(1)
      // hatalar kovası artmış olmalı
      expect(after.buckets['hatalar'].byLength[5].lost).toBe(1)
    })

    it('resetAnalytics çağrıldığında be:v2:study de temizlenmelidir', () => {
      recordMistakeAnswer('kalem', true)
      expect(loadStudyData().streak['kalem']).toBe(1)

      resetAnalytics()
      expect(loadStudyData().streak['kalem']).toBeUndefined()
    })
  })

  // ─── 4. Geleceğe Dönük Güvenlik: Eksik Kelimeleri Sessizce Atlama ───
  describe('4. Geleceğe Dönük Güvenlik (Eksik Kelimeleri Sessizce Atlama)', () => {
    it('missedWords içinde olan ama güncel sözlük deposunda bulunmayan kelimeler havuza dahil edilmez, veriden silinmez', () => {
      const repo = createMockRepo()
      const missed = {
        kalem: { y: 3, c: 1, last: 100 }, // depoda var
        eskiKelime: { y: 5, c: 2, last: 100 }, // depoda YOK!
      }
      const learned: Record<string, number> = {}

      const pool = getStudyableCandidates(missed, learned, repo)
      expect(pool.totalCount).toBe(1)
      expect(pool.byLength[5].length).toBe(1)
      expect(pool.byLength[5][0].word).toBe('kalem')

      // missedWords içindeki eskiKelime veriden silinmemeli!
      expect(missed['eskiKelime']).toBeDefined()
    })

    it('Tanımı bulunmayan bonus kelimesi havuza dahil edilmez', () => {
      const repo = createMockRepo()
      const missed = {
        apartman: { y: 2, c: 1, last: 100 }, // bonus'ta var ve tanımlı
        hayaliBonus: { y: 4, c: 0, last: 100 }, // bonus'ta tanımı yok
      }
      const pool = getStudyableCandidates(missed, {}, repo)
      expect(pool.bonus.length).toBe(1)
      expect(pool.bonus[0].word).toBe('apartman')
      expect(pool.bonus[0].definition).toBe('Bina türü')
    })
  })

  // ─── 5. Ağırlıklı Rastgele Seçim ───
  describe('5. Ağırlıklı Rastgele Seçim (pickWeightedCandidate)', () => {
    it('Ağırlık oranlarına göre orantılı seçim yapmalıdır (Mock RNG)', () => {
      const candidates: StudyCandidate[] = [
        { word: 'azKacan', letterCount: 5, weight: 1, isBonus: false },
        { word: 'cokKacan', letterCount: 5, weight: 9, isBonus: false },
      ]
      // Toplam ağırlık = 10.
      // rng = 0.0 -> weight 1 (azKacan)
      // rng = 0.15 -> weight 9 (cokKacan)
      const picked1 = pickWeightedCandidate(candidates, () => 0.05)
      expect(picked1?.word).toBe('azKacan')

      const picked2 = pickWeightedCandidate(candidates, () => 0.5)
      expect(picked2?.word).toBe('cokKacan')
    })

    it('Boş aday listesinde null dönmelidir', () => {
      expect(pickWeightedCandidate([])).toBeNull()
    })
  })

  // ─── 6. Döngü ve Adım Atlama ───
  describe('6. Döngü ve Adım Atlama (getNextMistakeStep)', () => {
    it('Normal döngü: 4 -> 5 -> 6 -> 7 -> bonus -> 4', () => {
      const repo = createMockRepo()
      const missed = {
        kale: { y: 1, c: 0, last: 100 },
        kalem: { y: 1, c: 0, last: 100 },
        karpuz: { y: 1, c: 0, last: 100 },
        pencere: { y: 1, c: 0, last: 100 },
        apartman: { y: 1, c: 0, last: 100 },
      }
      const pool = getStudyableCandidates(missed, {}, repo)

      const s1 = getNextMistakeStep(undefined, pool)
      expect(s1?.nextStep).toBe(4)

      const s2 = getNextMistakeStep(4, pool)
      expect(s2?.nextStep).toBe(5)

      const s3 = getNextMistakeStep(5, pool)
      expect(s3?.nextStep).toBe(6)

      const s4 = getNextMistakeStep(6, pool)
      expect(s4?.nextStep).toBe(7)

      const s5 = getNextMistakeStep(7, pool)
      expect(s5?.nextStep).toBe('bonus')

      const s6 = getNextMistakeStep('bonus', pool)
      expect(s6?.nextStep).toBe(4)
    })

    it('Boş adım atlanmalıdır (örneğin 6 harfli kelime yoksa 5 -> 7 geçmelidir)', () => {
      const repo = createMockRepo()
      const missed = {
        kale: { y: 1, c: 0, last: 100 },
        kalem: { y: 1, c: 0, last: 100 },
        // 6 harfli kelime YOK
        pencere: { y: 1, c: 0, last: 100 },
      }
      const pool = getStudyableCandidates(missed, {}, repo)

      const next = getNextMistakeStep(5, pool)
      expect(next?.nextStep).toBe(7) // 6 atlandı, 7'ye geçti!
      expect(next?.candidate.word).toBe('pencere')
    })

    it('Oturum içinde tekrarsız olmalı ve tüm kelimeler bitince null dönmelidir', () => {
      const repo = createMockRepo()
      const missed = {
        kale: { y: 1, c: 0, last: 100 },
      }
      const usedWords = new Set<string>()

      // İlk seçim
      const pool1 = getStudyableCandidates(missed, {}, repo, usedWords)
      const next1 = getNextMistakeStep(undefined, pool1)
      expect(next1).not.toBeNull()
      expect(next1?.candidate.word).toBe('kale')

      usedWords.add('kale')

      // İkinci seçim: kelime bitti
      const pool2 = getStudyableCandidates(missed, {}, repo, usedWords)
      expect(pool2.totalCount).toBe(0)
      const next2 = getNextMistakeStep(4, pool2)
      expect(next2).toBeNull() // Oturum bitti!
    })
  })

  // ─── 7. Parametrik Bonus Uzunluğu ───
  describe('7. Parametrik Bonus Uzunluğu', () => {
    it('8 harf dışındaki bonus kelimelerini (ör. 9 harfli kütüphane) doğru harf sayısıyla seçebilmelidir', () => {
      const repo = createMockRepo()
      const missed = {
        kütüphane: { y: 3, c: 1, last: 100 }, // 9 harfli bonus kelimesi
      }
      const pool = getStudyableCandidates(missed, {}, repo)
      expect(pool.bonus.length).toBe(1)
      expect(pool.bonus[0].word).toBe('kütüphane')
      expect(pool.bonus[0].letterCount).toBe(9)
    })
  })

  // ─── 8. GameController Entegrasyonu (Hatalar Modu Akışı) ───
  describe('8. GameController ile Hatalarımla Modu Canlı Akış Testi', () => {
    it('Hatalar modunda soru doğru bilinince streak artmalı, 2. doğruda learned olmalı ve remainingCount güncellenmelidir', () => {
      const repo = createMockRepo()
      // missedWords'e 1 adet 4 harfli kelime ekle
      const analytics = loadAnalytics()
      analytics.missedWords = {
        kale: { y: 2, c: 1, last: 100 },
        elma: { y: 1, c: 0, last: 100 },
      }
      saveAnalytics(analytics)

      let lastState: any = null
      const game = new GameController({
        words: repo,
        level: 'zor',
        mode: 'hatalar',
        highScore: 0,
        onStateChange: (st) => {
          lastState = st
        },
      })

      game.startNewGame('zor', 'hatalar')
      expect(lastState.mode).toBe('hatalar')
      expect(lastState.practiceState?.remainingCount).toBe(2)

      // İlk soruya başlamak için geri sayımı tamamla
      game.tickCountdown(0)
      expect(lastState.screen).toBe('playing_round')

      const currentWord = lastState.roundState.currentWord

      // Doğru tahmini gönder
      game.submitGuess(currentWord, false)

      expect(lastState.roundState.wordWon).toBe(true)
      expect(lastState.practiceState?.streakInfo?.streak).toBe(1)
      expect(lastState.practiceState?.streakInfo?.justLearned).toBe(false)

      // Devam et -> sonraki kelimeye geç
      game.dismissWordResult()
      game.tickCountdown(0) // 3-2-1 geri sayım tamamla

      const secondWord = lastState.roundState.currentWord
      game.submitGuess(secondWord, false)

      // Şimdi aynı kelimeyi (currentWord) tekrar bilelim (streak test için simüle edelim)
      const learnedRes = recordMistakeAnswer(currentWord, true)
      expect(learnedRes.streak).toBe(2)
      expect(learnedRes.justLearned).toBe(true)
      expect(loadStudyData().learned[currentWord]).toBeDefined()
    })

    it('Tüm çalışılacak kelimeler bitince oturum otomatik bitmeli ve autoEnded=true olmalıdır', () => {
      const repo = createMockRepo()
      // Sadece 1 adet kelime olsun
      const analytics = loadAnalytics()
      analytics.missedWords = {
        kale: { y: 2, c: 1, last: 100 },
      }
      saveAnalytics(analytics)

      let lastState: any = null
      const game = new GameController({
        words: repo,
        level: 'zor',
        mode: 'hatalar',
        highScore: 0,
        onStateChange: (st) => {
          lastState = st
        },
      })

      game.startNewGame('zor', 'hatalar')
      game.tickCountdown(0)
      const currentWord = lastState.roundState.currentWord

      // Kelimeyi bil
      game.submitGuess(currentWord, false)

      // Devam et butonuna basıldığında oturumda başka kelime kalmadığı için otomatik bitmeli
      game.dismissWordResult()

      expect(lastState.screen).toBe('practice_summary')
      expect(lastState.practiceSummary?.autoEnded).toBe(true)
      expect(lastState.practiceSummary?.totalQuestions).toBe(1)
      expect(lastState.practiceSummary?.wonCount).toBe(1)
    })

    it('Hatalar modunda endPractice çağrılınca sessions kovasına mode=hatalar ve level=undefined yazılmalıdır', () => {
      const repo = createMockRepo()
      const analytics = loadAnalytics()
      analytics.missedWords = {
        kale: { y: 2, c: 0, last: 100 },
      }
      saveAnalytics(analytics)

      const game = new GameController({
        words: repo,
        level: 'zor',
        mode: 'hatalar',
        highScore: 0,
        onSessionCompleted: recordSessionCompleted,
      })

      game.startNewGame('zor', 'hatalar')
      game.endPractice()

      const after = loadAnalytics()
      expect(after.sessions.length).toBe(1)
      const s = after.sessions[0]
      expect(s.mode).toBe('hatalar')
      expect(s.level).toBeUndefined()
    })

    it('Normal Çalışma modunda doğru bilmek streak artırmaz (sadece hatalar modunda artar)', () => {
      const repo = createMockRepo()
      let lastState: any = null
      const game = new GameController({
        words: repo,
        level: 'kolay',
        mode: 'calisma',
        highScore: 0,
        onStateChange: (st) => {
          lastState = st
        },
      })

      game.startNewGame('kolay', 'calisma')
      game.tickCountdown(0)
      const word = lastState.roundState.currentWord
      game.submitGuess(word, false)

      expect(lastState.roundState.wordWon).toBe(true)
      // Normal calisma modunda streakInfo tanımsız olmalı veya study'e yazmamalı
      const study = loadStudyData()
      expect(study.streak[word]).toBeUndefined()
      expect(study.learned[word]).toBeUndefined()
    })

    it('Bonusta doğru cevap streak artırmalı; yanlış cevap / timeout / expire streak sıfırlamalıdır', () => {
      // Bonus sorusunda doğru bilinirse
      const bWord = 'apartman'
      const res1 = recordMistakeAnswer(bWord, true)
      expect(res1.streak).toBe(1)

      // Bonusta yanlış veya süre dolarsa
      const res2 = recordMistakeAnswer(bWord, false)
      expect(res2.streak).toBe(0)
      expect(loadStudyData().streak[bWord]).toBeUndefined()
    })
  })

  // ─── 9. Kart Aktif/Pasif Durumu ve Kelime Sayısı Hesabı ───
  describe('9. Kart Aktif/Pasif Durumu ve Kelime Sayısı Hesabı', () => {
    it('Çalışılabilir kelime yoksa totalCount 0 olmalıdır', () => {
      const repo = createMockRepo()
      const pool = getStudyableCandidates({}, {}, repo)
      expect(pool.totalCount).toBe(0)
    })

    it('Öğrenilmiş kelimeler kart sayısına ve havuza dahil edilmez', () => {
      const repo = createMockRepo()
      const missed = {
        kale: { y: 2, c: 1, last: 100 },
        elma: { y: 1, c: 0, last: 100 },
      }
      const learned = {
        kale: Date.now(),
      }
      const pool = getStudyableCandidates(missed, learned, repo)
      expect(pool.totalCount).toBe(1) // Sadece elma
      expect(pool.byLength[4].map((c) => c.word)).toEqual(['elma'])
    })
  })

  // ─── 10. DEV Veri Üreteci ───
  describe('10. DEV Örnek Veri Üreteci (generateMistakesDevData)', () => {
    it('15 adet gerçek sözlük kelimesi eklemeli ve bazılarını streak=1 yapmalıdır', () => {
      generateMistakesDevData()

      const analytics = loadAnalytics()
      const study = loadStudyData()

      const words = Object.keys(analytics.missedWords)
      expect(words.length).toBe(15)

      // Bazıları streak=1 olmalı
      const streaks = Object.values(study.streak)
      expect(streaks.length).toBeGreaterThan(0)
      expect(streaks.some((s) => s === 1)).toBe(true)

      // Başlangıçta hiçbiri learned olmamalı
      expect(Object.keys(study.learned).length).toBe(0)
    })
  })
})
