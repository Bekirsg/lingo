/**
 * LİNGO v2 — Analiz Seçiciler (Selectors) ve Öneri Kuralları Test Paketi
 * SPEC-v2 Bölüm 7, 7.7, 11.1 madde 10
 */

import { describe, it, expect } from 'vitest'
import {
  computeOverview,
  computeInsights,
  computePerformance,
  computeLetters,
  computeProgress,
  filterAndSortMissedWords,
  filterAndSortInvalidWords,
  INSIGHT_THRESHOLDS,
} from './selectors'
import { createEmptyAnalyticsData } from './reducer'
import { mergeBuckets } from './merge'
import type { AnalyticsFilter } from './types'

describe('V2-M7 Analiz Seçicileri (Selectors)', () => {
  it('INSIGHT_THRESHOLDS: Sabitler SPEC 7.7 kurallarına uygun tanımlanmalıdır', () => {
    expect(INSIGHT_THRESHOLDS.WEAKEST_LENGTH_MIN_SEEN).toBe(10)
    expect(INSIGHT_THRESHOLDS.INVALID_WORD_MIN_LOST).toBe(5)
    expect(INSIGHT_THRESHOLDS.TIMEOUT_MIN_GUESSES).toBe(20)
    expect(INSIGHT_THRESHOLDS.BONUS_WRITE_MIN_BIL).toBe(5)
    expect(INSIGHT_THRESHOLDS.CONFUSING_PAIR_MIN_COUNT).toBe(5)
    expect(INSIGHT_THRESHOLDS.LATE_SOLVE_MIN_SOLVED).toBe(10)
    expect(INSIGHT_THRESHOLDS.ROUND4_MIN_GAMES).toBe(5)
    expect(INSIGHT_THRESHOLDS.MODE_DIFF_MIN_QUESTIONS).toBe(30)
  })

  it('computeOverview: Veri yokken veya boşken güvenli varsayılanlar üretmelidir', () => {
    const rawData = createEmptyAnalyticsData()
    const filter: AnalyticsFilter = { mode: 'all', level: 'all' }
    const merged = mergeBuckets(rawData, filter)

    const overview = computeOverview(merged, rawData, filter)
    expect(overview.hasData).toBe(false)
    expect(overview.yarisma.available).toBe(false)
    expect(overview.calisma.available).toBe(false)
    expect(overview.insights).toEqual([])
  })

  it('computeOverview: Yarışma ve Çalışma kartları metriklerini doğru hesaplamalıdır', () => {
    const rawData = createEmptyAnalyticsData()
    rawData.games.push(
      {
        timestamp: 1000,
        level: 'kolay',
        finalScore: 10000,
        treasury: 5000,
        lastCompletedStage: 5,
        solvedWordsCount: 8,
        lostWordsCount: 1,
        round4TimeLeft: 20,
      },
      {
        timestamp: 2000,
        level: 'kolay',
        finalScore: 20000,
        treasury: 8000,
        lastCompletedStage: 7,
        solvedWordsCount: 12,
        lostWordsCount: 0,
        round4TimeLeft: 40,
      }
    )

    rawData.sessions.push({
      timestamp: 3000,
      mode: 'calisma',
      level: 'kolay',
      totalQuestions: 10,
      wonCount: 8,
      lostCount: 1,
      passCount: 1,
      byLetter: { 4: { asked: 5, won: 4 }, 5: { asked: 5, won: 4 } },
      bonusWonCount: 0,
      bonusLostCount: 0,
    })

    const filter: AnalyticsFilter = { mode: 'all', level: 'kolay' }
    const merged = mergeBuckets(rawData, filter)
    const overview = computeOverview(merged, rawData, filter)

    expect(overview.yarisma.available).toBe(true)
    expect(overview.yarisma.gamesCount).toBe(2)
    expect(overview.yarisma.avgScore).toBe(15000)
    expect(overview.yarisma.bestScore).toBe(20000)
    expect(overview.yarisma.r4ReachRate).toBe(100)
    expect(overview.yarisma.r4AvgTimeLeft).toBe(30) // (20 + 40) / 2
    expect(overview.yarisma.stageDistribution.stage5).toBe(1)
    expect(overview.yarisma.stageDistribution.stage7).toBe(1)

    expect(overview.calisma.available).toBe(true)
    expect(overview.calisma.sessionsCount).toBe(1)
    expect(overview.calisma.totalQuestions).toBe(10)
    expect(overview.calisma.wonCount).toBe(8)
    expect(overview.calisma.passCount).toBe(1)
    expect(overview.calisma.successRate).toBe(80)
  })

  it('computePerformance: Düşük örneklemde (<5) başarı yüzdesi yerine null dönmelidir', () => {
    const rawData = createEmptyAnalyticsData()
    const b = rawData.buckets['yarisma:kolay']
    b.byLength[4].seen = 4 // < 5
    b.byLength[4].solved = 3

    const merged = mergeBuckets(rawData, { mode: 'yarisma', level: 'kolay' })
    const perf = computePerformance(merged)

    const item4 = perf.byLength.find((x) => x.length === 4)
    expect(item4).toBeDefined()
    expect(item4?.seen).toBe(4)
    expect(item4?.successRate).toBeNull() // "Yeterli veri yok"
  })

  it('computeLetters: En az 10 deneme yapılmış harfler arasından en zorlanılanları sıralamalıdır', () => {
    const rawData = createEmptyAnalyticsData()
    const b = rawData.buckets['yarisma:orta']
    // 'ş' harfi: 12 deneme, 9 kırmızı (%75 kırmızı oranı)
    b.letters['ş'] = { g: 2, y: 1, r: 9 }
    // 'a' harfi: 20 deneme, 5 kırmızı (%25 kırmızı oranı)
    b.letters['a'] = { g: 10, y: 5, r: 5 }
    // 'z' harfi: 4 deneme, 4 kırmızı (deneme < 10, elenir)
    b.letters['z'] = { g: 0, y: 0, r: 4 }

    const merged = mergeBuckets(rawData, { mode: 'yarisma', level: 'orta' })
    const letters = computeLetters(merged)

    expect(letters.hardestLetters.length).toBe(2)
    expect(letters.hardestLetters[0].char).toBe('ş')
    expect(letters.hardestLetters[0].redRate).toBe(75)
    expect(letters.hardestLetters[0].isTurkishSpecial).toBe(true)

    expect(letters.hardestLetters[1].char).toBe('a')
    expect(letters.hardestLetters[1].redRate).toBe(25)
  })

  it('computeProgress: Son 10 oyun ve oturumu ile 5 vs 5 trendini hesaplamalıdır', () => {
    const rawData = createEmptyAnalyticsData()
    // 10 oyun ekle: Son 5 oyun ortalaması 15.000, önceki 5 oyun ortalaması 10.000
    for (let i = 0; i < 5; i++) {
      rawData.games.push({
        timestamp: 1000 - i,
        level: 'zor',
        finalScore: 15000,
        treasury: 7000,
        lastCompletedStage: 6,
        solvedWordsCount: 10,
        lostWordsCount: 2,
        round4TimeLeft: 20,
      })
    }
    for (let i = 5; i < 10; i++) {
      rawData.games.push({
        timestamp: 1000 - i,
        level: 'zor',
        finalScore: 10000,
        treasury: 4000,
        lastCompletedStage: 4,
        solvedWordsCount: 6,
        lostWordsCount: 3,
        round4TimeLeft: 5,
      })
    }

    const prog = computeProgress(rawData, { mode: 'yarisma', level: 'zor' })
    expect(prog.lastGames.length).toBe(10)
    expect(prog.gameTrend).toBeDefined()
    expect(prog.gameTrend?.last5Avg).toBe(15000)
    expect(prog.gameTrend?.prev5Avg).toBe(10000)
    expect(prog.gameTrend?.diff).toBe(5000)
    expect(prog.gameTrend?.direction).toBe('up')
  })
})

describe('V2-M7 SPEC 7.7 Öneri Kuralları (9 Kural Eşik Testleri)', () => {
  it('Kural 1 (WEAKEST_LENGTH): 4..7 harfli kelimelerden biri ≥10 puan düşükse tetiklenmeli', () => {
    const rawData = createEmptyAnalyticsData()
    const merged = mergeBuckets(rawData, { mode: 'all', level: 'all' })
    // 4, 5, 6, 7 hepsinde seen = 10
    merged.byLength[4] = { seen: 10, solved: 8, lost: 2, guessSum: 20, guessDist: {}, lossReasons: { five_guesses: 2, invalid_word: 0, timeout: 0, pass: 0 } } // %80
    merged.byLength[5] = { seen: 10, solved: 8, lost: 2, guessSum: 20, guessDist: {}, lossReasons: { five_guesses: 2, invalid_word: 0, timeout: 0, pass: 0 } } // %80
    merged.byLength[6] = { seen: 10, solved: 8, lost: 2, guessSum: 20, guessDist: {}, lossReasons: { five_guesses: 2, invalid_word: 0, timeout: 0, pass: 0 } } // %80
    merged.byLength[7] = { seen: 10, solved: 5, lost: 5, guessSum: 20, guessDist: {}, lossReasons: { five_guesses: 5, invalid_word: 0, timeout: 0, pass: 0 } } // %50 (diğerlerinin ortalaması %80, fark 30 puan >= 10)

    const insights = computeInsights(merged, rawData, { mode: 'all', level: 'all' })
    const rule1 = insights.find((x) => x.id === 'weakest_length')
    expect(rule1).toBeDefined()
    expect(rule1?.message).toContain('7 harfli kelimelerde başarın %50')
  })

  it('Kural 2 (INVALID_WORD_LOSS): Kayıpların ≥ %30u sözlük dışı kelime ise tetiklenmeli', () => {
    const rawData = createEmptyAnalyticsData()
    const merged = mergeBuckets(rawData, { mode: 'all', level: 'all' })
    merged.byLength[5] = {
      seen: 20,
      solved: 10,
      lost: 10, // toplam kayıp 10 >= 5
      guessSum: 30,
      guessDist: {},
      lossReasons: { five_guesses: 6, invalid_word: 4, timeout: 0, pass: 0 }, // 4 / 10 = %40 >= %30
    }

    const insights = computeInsights(merged, rawData, { mode: 'all', level: 'all' })
    const rule2 = insights.find((x) => x.id === 'invalid_word_loss')
    expect(rule2).toBeDefined()
    expect(rule2?.message).toContain('%40')
  })

  it('Kural 3 (TIMEOUT_RATE): Tahmin süre aşımı oranı ≥ %10 ise tetiklenmeli', () => {
    const rawData = createEmptyAnalyticsData()
    const merged = mergeBuckets(rawData, { mode: 'all', level: 'all' })
    merged.timing.guessCount = 30 // >= 20
    merged.timing.timeoutCount = 5 // 5 / 30 = %17 >= %10

    const insights = computeInsights(merged, rawData, { mode: 'all', level: 'all' })
    const rule3 = insights.find((x) => x.id === 'timeout_rate')
    expect(rule3).toBeDefined()
    expect(rule3?.message).toContain('%17')
  })

  it('Kural 4 (BONUS_WRITE_FAIL): BİL sonrası kayıp oranı ≥ %40 ise tetiklenmeli', () => {
    const rawData = createEmptyAnalyticsData()
    const merged = mergeBuckets(rawData, { mode: 'all', level: 'all' })
    merged.bonus.bilCount = 10 // >= 5
    merged.bonus.wrong = 3
    merged.bonus.writeTimeout = 2 // toplam kayıp 5 / 10 = %50 >= %40

    const insights = computeInsights(merged, rawData, { mode: 'all', level: 'all' })
    const rule4 = insights.find((x) => x.id === 'bonus_write_fail')
    expect(rule4).toBeDefined()
    expect(rule4?.message).toContain('%50')
  })

  it('Kural 5 (CONFUSING_PAIR): Bir benzer harf çifti toplam karışıklığın ≥ %30u ve ≥ 5 ise tetiklenmeli', () => {
    const rawData = createEmptyAnalyticsData()
    const merged = mergeBuckets(rawData, { mode: 'all', level: 'all' })
    merged.pairs = {
      iı: 6, // 6 / 10 = %60 >= %30 ve >= 5
      sş: 4,
    }

    const insights = computeInsights(merged, rawData, { mode: 'all', level: 'all' })
    const rule5 = insights.find((x) => x.id === 'confusing_pair')
    expect(rule5).toBeDefined()
    expect(rule5?.message).toContain('"i" ve "ı"')
  })

  it('Kural 6 (LATE_SOLVE): Ortalama çözüm tahmini ≥ 4 ise tetiklenmeli', () => {
    const rawData = createEmptyAnalyticsData()
    const merged = mergeBuckets(rawData, { mode: 'all', level: 'all' })
    merged.byLength[5] = {
      seen: 15,
      solved: 10, // >= 10
      lost: 5,
      guessSum: 42, // ortalama 42 / 10 = 4.2 >= 4.0
      guessDist: {},
      lossReasons: { five_guesses: 5, invalid_word: 0, timeout: 0, pass: 0 },
    }

    const insights = computeInsights(merged, rawData, { mode: 'all', level: 'all' })
    const rule6 = insights.find((x) => x.id === 'late_solve')
    expect(rule6).toBeDefined()
    expect(rule6?.message).toContain('4.2. tahminde')
  })

  it('Kural 7 (ROUND4_STAGE): 4. tura ulaşma oranı ≥ %50 ve en sık takılınan etap varsa tetiklenmeli', () => {
    const rawData = createEmptyAnalyticsData()
    // 6 oyun: hepsi 4. tura ulaştı, 3 tanesi 5 harflide takıldı (lastCompletedStage = 4)
    for (let i = 0; i < 6; i++) {
      rawData.games.push({
        timestamp: 1000 + i,
        level: 'zor',
        finalScore: 5000,
        treasury: 3000,
        lastCompletedStage: i < 3 ? 4 : 6, // i < 3: stage 5'te takıldı
        solvedWordsCount: 8,
        lostWordsCount: 2,
        round4TimeLeft: 10,
      })
    }

    const merged = mergeBuckets(rawData, { mode: 'yarisma', level: 'zor' })
    const insights = computeInsights(merged, rawData, { mode: 'yarisma', level: 'zor' })
    const rule7 = insights.find((x) => x.id === 'round4_stage')
    expect(rule7).toBeDefined()
    expect(rule7?.message).toContain('5 harfli kelimelerde takılıyorsun')
  })

  it('Kural 8 (REVIEW_ERRORS): Kaçırılan kelimeler varsa en çok kaçırılanları önermelidir', () => {
    const rawData = createEmptyAnalyticsData()
    rawData.missedWords['armut'] = { y: 3, c: 2, last: 1000 } // toplam 5
    rawData.missedWords['kiraz'] = { y: 2, c: 1, last: 1000 } // toplam 3

    const merged = mergeBuckets(rawData, { mode: 'all', level: 'all' })
    const insights = computeInsights(merged, rawData, { mode: 'all', level: 'all' })
    const rule8 = insights.find((x) => x.id === 'review_errors')
    expect(rule8).toBeDefined()
    expect(rule8?.message).toContain('"armut"')
    expect(rule8?.message).toContain('"kiraz"')
  })

  it('Kural 9 (MODE_DIFFERENCE): Hem Yarışma hem Çalışma ≥ 30 soru ve Çalışma başarısı ≥ 15 puan yüksekse tetiklenmeli', () => {
    const rawData = createEmptyAnalyticsData()
    // Yarışma: 30 soru, 15 doğru (%50)
    const yk = rawData.buckets['yarisma:kolay']
    yk.byLength[4].seen = 30
    yk.byLength[4].solved = 15

    // Çalışma: 30 soru, 24 doğru (%80) -> fark 30 puan >= 15
    const ck = rawData.buckets['calisma:kolay']
    ck.byLength[4].seen = 30
    ck.byLength[4].solved = 24

    const merged = mergeBuckets(rawData, { mode: 'all', level: 'all' })
    const insights = computeInsights(merged, rawData, { mode: 'all', level: 'all' })
    const rule9 = insights.find((x) => x.id === 'mode_difference')
    expect(rule9).toBeDefined()
    expect(rule9?.message).toContain('Çalışmada daha başarılısın (%80)')
    expect(rule9?.message).toContain("Yarışma'da (%50)")
  })

  it('En fazla 5 öneri öncelik sırasına göre döndürülmelidir', () => {
    // Tüm kuralları sağlayan bir sahte veri oluştur
    const rawData = createEmptyAnalyticsData()
    const merged = mergeBuckets(rawData, { mode: 'all', level: 'all' })

    // Kural 1
    for (const len of [4, 5, 6]) {
      merged.byLength[len] = { seen: 10, solved: 9, lost: 1, guessSum: 20, guessDist: {}, lossReasons: { five_guesses: 1, invalid_word: 0, timeout: 0, pass: 0 } }
    }
    merged.byLength[7] = { seen: 10, solved: 4, lost: 6, guessSum: 20, guessDist: {}, lossReasons: { five_guesses: 2, invalid_word: 4, timeout: 0, pass: 0 } } // kural 1 ve 2 tetikler

    // Kural 3
    merged.timing.guessCount = 30
    merged.timing.timeoutCount = 5

    // Kural 4
    merged.bonus.bilCount = 10
    merged.bonus.wrong = 5

    // Kural 5
    merged.pairs = { iı: 6 }

    // Kural 6
    merged.byLength[4].solved = 10
    merged.byLength[4].guessSum = 45

    // Kural 8
    rawData.missedWords['kavun'] = { y: 2, c: 1, last: 1000 }

    const list = computeInsights(merged, rawData, { mode: 'all', level: 'all' })
    expect(list.length).toBeLessThanOrEqual(5)
    // Priority sıralı olmalı
    for (let i = 1; i < list.length; i++) {
      expect(list[i].priority).toBeGreaterThanOrEqual(list[i - 1].priority)
    }
  })
})

describe('V2-M7 Türkçe Sıralama ve Kelime Listesi Filtreleme', () => {
  it('filterAndSortMissedWords: Türkçe karakterleri (ç, ğ, ı, i, ö, ş, ü) doğru sırada listelemelidir', () => {
    const missedMap = {
      ışık: { y: 1, c: 0, last: 1000 },
      iğne: { y: 1, c: 0, last: 1000 },
      çilek: { y: 1, c: 0, last: 1000 },
      şapka: { y: 1, c: 0, last: 1000 },
      üzüm: { y: 1, c: 0, last: 1000 },
      armut: { y: 1, c: 0, last: 1000 },
    }

    const sortedAlpha = filterAndSortMissedWords(missedMap, {
      mode: 'all',
      searchQuery: '',
      letterFilter: 'all',
      levelFilter: 'all',
      sortBy: 'alpha',
    })

    const words = sortedAlpha.map((x) => x.word)
    // Türkçe alfabetik sıra: armut -> çilek -> ışık -> iğne -> şapka -> üzüm
    expect(words).toEqual(['armut', 'çilek', 'ışık', 'iğne', 'şapka', 'üzüm'])
  })

  it('filterAndSortMissedWords: En çok kaçırılana göre sıralama ve harf sayısı filtreleme çalışmalıdır', () => {
    const missedMap = {
      elma: { y: 2, c: 1, last: 1000 }, // 4 harf, toplam 3
      karpuz: { y: 5, c: 5, last: 1000 }, // 6 harf, toplam 10
      muz: { y: 1, c: 0, last: 1000 }, // 3 harf
    }

    const sortedCount = filterAndSortMissedWords(missedMap, {
      mode: 'all',
      searchQuery: '',
      letterFilter: 'all',
      levelFilter: 'all',
      sortBy: 'count',
    })

    expect(sortedCount[0].word).toBe('karpuz')
    expect(sortedCount[0].total).toBe(10)
    expect(sortedCount[1].word).toBe('elma')

    // Yalnızca 4 harfli filtresi
    const only4 = filterAndSortMissedWords(missedMap, {
      mode: 'all',
      searchQuery: '',
      letterFilter: 4,
      levelFilter: 'all',
      sortBy: 'count',
    })
    expect(only4.length).toBe(1)
    expect(only4[0].word).toBe('elma')
  })

  it('filterAndSortInvalidWords: Sözlük dışı dizileri doğru sıralamalı ve filtrelemelidir', () => {
    const invMap = {
      asdf: { y: 2, c: 1, h: 0, last: 1000 }, // toplam 3
      qwerty: { y: 5, c: 5, h: 1, last: 1000 }, // toplam 11
    }

    const res = filterAndSortInvalidWords(invMap, {
      mode: 'all',
      searchQuery: '',
      letterFilter: 'all',
      sortBy: 'count',
    })

    expect(res[0].word).toBe('qwerty')
    expect(res[0].total).toBe(11)
  })
})
