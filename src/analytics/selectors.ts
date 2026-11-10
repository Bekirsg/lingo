/**
 * LİNGO v2 — Analiz Saf Hesaplama Fonksiyonları ve Seçiciler (Selectors)
 * SPEC-v2 Bölüm 7, 7.7
 */

import type {
  AnalyticsData,
  AnalyticsFilter,
  MergedAnalytics,
  GameSummaryRecord,
  SessionSummaryRecord,
} from './types'

// ─── SPEC 7.7 Öneri Kuralları Sabitleri ──────────────────────────────
export const INSIGHT_THRESHOLDS = {
  WEAKEST_LENGTH_MIN_SEEN: 10,
  WEAKEST_LENGTH_DIFF: 10, // 10 puan düşük
  INVALID_WORD_MIN_LOST: 5,
  INVALID_WORD_RATE: 0.3, // %30
  TIMEOUT_MIN_GUESSES: 20,
  TIMEOUT_RATE: 0.1, // %10
  BONUS_WRITE_MIN_BIL: 5,
  BONUS_WRITE_FAIL_RATE: 0.4, // %40
  CONFUSING_PAIR_MIN_COUNT: 5,
  CONFUSING_PAIR_RATE: 0.3, // %30
  LATE_SOLVE_MIN_SOLVED: 10,
  LATE_SOLVE_AVG_GUESS: 4.0,
  ROUND4_MIN_GAMES: 5,
  ROUND4_REACH_RATE: 0.5, // %50
  MODE_DIFF_MIN_QUESTIONS: 30,
  MODE_DIFF_RATE: 15, // 15 puan fark
}

export interface InsightItem {
  id: string
  priority: number
  title: string
  message: string
  type: 'tip' | 'warning' | 'info'
}

export interface OverviewMetrics {
  hasData: boolean
  // Yarışma kartı
  yarisma: {
    available: boolean
    gamesCount: number
    avgScore: number
    bestScore: number
    r4ReachRate: number | null // %
    r4GamesCount: number
    r4AvgTimeLeft: number | null // saniye
    stageDistribution: {
      none: number
      stage4: number
      stage5: number
      stage6: number
      stage7: number
    }
  }
  // Çalışma kartı
  calisma: {
    available: boolean
    sessionsCount: number
    totalQuestions: number
    wonCount: number
    lostCount: number
    passCount: number
    successRate: number | null // %
    byLetter: Record<number, { asked: number; won: number }>
  }
  // Mod dağılımı
  modeQuestionCount: {
    yarisma: number
    calisma: number
    hatalar: number
  }
  // Öneriler
  insights: InsightItem[]
}

/**
 * 7.1 Özet sekmesi metriklerini hesaplar.
 */
export function computeOverview(
  merged: MergedAnalytics,
  rawData: AnalyticsData,
  filter: AnalyticsFilter
): OverviewMetrics {
  // 1) Yarışma kartı verileri
  const isYarismaRelevant = filter.mode === 'all' || filter.mode === 'yarisma'
  const filteredGames = isYarismaRelevant
    ? rawData.games.filter((g) => filter.level === 'all' || g.level === filter.level)
    : []

  const gamesCount = filteredGames.length
  let avgScore = 0
  let bestScore = 0
  let r4GamesCount = 0
  let r4TimeLeftSum = 0
  const stageDist = { none: 0, stage4: 0, stage5: 0, stage6: 0, stage7: 0 }

  if (gamesCount > 0) {
    let scoreSum = 0
    for (const g of filteredGames) {
      scoreSum += g.finalScore
      if (g.finalScore > bestScore) bestScore = g.finalScore

      const reachedR4 = g.lastCompletedStage !== null || g.round4TimeLeft > 0
      if (reachedR4) {
        r4GamesCount++
        r4TimeLeftSum += g.round4TimeLeft
      }

      if (g.lastCompletedStage === null) stageDist.none++
      else if (g.lastCompletedStage === 4) stageDist.stage4++
      else if (g.lastCompletedStage === 5) stageDist.stage5++
      else if (g.lastCompletedStage === 6) stageDist.stage6++
      else if (g.lastCompletedStage === 7) stageDist.stage7++
    }
    avgScore = Math.round(scoreSum / gamesCount)
  }

  const r4ReachRate = gamesCount > 0 ? Math.round((r4GamesCount / gamesCount) * 100) : null
  const r4AvgTimeLeft = r4GamesCount > 0 ? Math.round(r4TimeLeftSum / r4GamesCount) : null

  // 2) Çalışma kartı verileri
  const isCalismaRelevant = filter.mode === 'all' || filter.mode === 'calisma' || filter.mode === 'hatalar'
  const filteredSessions = isCalismaRelevant
    ? rawData.sessions.filter((s) => {
        if (filter.mode === 'calisma' && s.mode !== 'calisma') return false
        if (filter.mode === 'hatalar' && s.mode !== 'hatalar') return false
        if (filter.level !== 'all' && s.level && s.level !== filter.level) return false
        return true
      })
    : []

  const sessionsCount = filteredSessions.length
  let totalQuestions = 0
  let wonCount = 0
  let lostCount = 0
  let passCount = 0
  const byLetter: Record<number, { asked: number; won: number }> = {
    4: { asked: 0, won: 0 },
    5: { asked: 0, won: 0 },
    6: { asked: 0, won: 0 },
    7: { asked: 0, won: 0 },
    8: { asked: 0, won: 0 },
  }

  for (const s of filteredSessions) {
    totalQuestions += s.totalQuestions
    wonCount += s.wonCount
    lostCount += s.lostCount
    passCount += s.passCount
    if (s.byLetter) {
      for (const [lenStr, stat] of Object.entries(s.byLetter)) {
        const len = Number(lenStr)
        if (!byLetter[len]) byLetter[len] = { asked: 0, won: 0 }
        byLetter[len].asked += stat.asked
        byLetter[len].won += stat.won
      }
    }
  }

  const calismaSuccessRate = totalQuestions > 0 ? Math.round((wonCount / totalQuestions) * 100) : null

  // 3) Öneriler
  const insights = computeInsights(merged, rawData, filter)

  return {
    hasData: merged.hasData,
    yarisma: {
      available: isYarismaRelevant && gamesCount > 0,
      gamesCount,
      avgScore,
      bestScore,
      r4ReachRate,
      r4GamesCount,
      r4AvgTimeLeft,
      stageDistribution: stageDist,
    },
    calisma: {
      available: isCalismaRelevant && sessionsCount > 0,
      sessionsCount,
      totalQuestions,
      wonCount,
      lostCount,
      passCount,
      successRate: calismaSuccessRate,
      byLetter,
    },
    modeQuestionCount: merged.modeQuestionCount,
    insights,
  }
}

/**
 * SPEC 7.7 — Kural Tabanlı Öneriler (en fazla 5 öneri)
 */
export function computeInsights(
  merged: MergedAnalytics,
  rawData: AnalyticsData,
  filter: AnalyticsFilter
): InsightItem[] {
  const list: InsightItem[] = []

  // Kural 1: En zayıf harf sayısı (her biri ≥ 10 soru, en az 10 puan düşük)
  const lenStats: { len: number; rate: number }[] = []
  let allLenHaveMin = true
  for (const len of [4, 5, 6, 7]) {
    const lb = merged.byLength[len]
    if (!lb || lb.seen < INSIGHT_THRESHOLDS.WEAKEST_LENGTH_MIN_SEEN) {
      allLenHaveMin = false
      break
    }
    const rate = Math.round((lb.solved / lb.seen) * 100)
    lenStats.push({ len, rate })
  }

  if (allLenHaveMin && lenStats.length === 4) {
    lenStats.sort((a, b) => a.rate - b.rate)
    const weakest = lenStats[0]
    const othersAvg = (lenStats[1].rate + lenStats[2].rate + lenStats[3].rate) / 3
    if (othersAvg - weakest.rate >= INSIGHT_THRESHOLDS.WEAKEST_LENGTH_DIFF) {
      list.push({
        id: 'weakest_length',
        priority: 1,
        type: 'tip',
        title: 'Harf Uzunluğu Gelişimi',
        message: `${weakest.len} harfli kelimelerde başarın %${weakest.rate}, diğer harf sayılarına göre en düşük bu.`,
      })
    }
  }

  // Kural 2: Sözlük dışı kayıp (Kayıpların ≥ %30'u sözlük dışı kelimeyse)
  let totalLost = 0
  let totalInvalidLosses = 0
  for (const len of [4, 5, 6, 7]) {
    const lb = merged.byLength[len]
    if (lb) {
      totalLost += lb.lost
      totalInvalidLosses += lb.lossReasons?.invalid_word || 0
    }
  }

  if (
    totalLost >= INSIGHT_THRESHOLDS.INVALID_WORD_MIN_LOST &&
    totalInvalidLosses / totalLost >= INSIGHT_THRESHOLDS.INVALID_WORD_RATE
  ) {
    const pct = Math.round((totalInvalidLosses / totalLost) * 100)
    list.push({
      id: 'invalid_word_loss',
      priority: 2,
      type: 'warning',
      title: 'Sözlük Dışı Kelimeler',
      message: `Kayıplarının %${pct}'i sözlük dışı kelimelerden kaynaklanıyor. Emin olmadığın kelimeleri göndermek yerine PAS kullanabilirsin.`,
    })
  }

  // Kural 3: Süre aşımı (Tahmin süresi aşımı oranı ≥ %10)
  if (
    merged.timing.guessCount >= INSIGHT_THRESHOLDS.TIMEOUT_MIN_GUESSES &&
    merged.timing.timeoutCount / merged.timing.guessCount >= INSIGHT_THRESHOLDS.TIMEOUT_RATE
  ) {
    const pct = Math.round((merged.timing.timeoutCount / merged.timing.guessCount) * 100)
    list.push({
      id: 'timeout_rate',
      priority: 3,
      type: 'warning',
      title: 'Süre Yönetimi',
      message: `Tahminlerinin %${pct}'inde 15 saniyelik süre doldu. Süre uyarısını takip etmeyi unutma.`,
    })
  }

  // Kural 4: Bonus yazma (BİL sonrası yanlış/süre dolması oranı ≥ %40)
  const bilCount = merged.bonus?.bilCount || 0
  const bonusFails = (merged.bonus?.wrong || 0) + (merged.bonus?.writeTimeout || 0)
  if (
    bilCount >= INSIGHT_THRESHOLDS.BONUS_WRITE_MIN_BIL &&
    bonusFails / bilCount >= INSIGHT_THRESHOLDS.BONUS_WRITE_FAIL_RATE
  ) {
    const pct = Math.round((bonusFails / bilCount) * 100)
    list.push({
      id: 'bonus_write_fail',
      priority: 4,
      type: 'tip',
      title: 'Bonus Sorular',
      message: `Bonus sorularda BİL'e bastıktan sonra kaybetme oranın %${pct}. BİL'e basmadan önce harfleri zihninde tahmin etmeyi dene.`,
    })
  }

  // Kural 5: Harf karışıklığı (Bir çiftin sayacı toplamın ≥ %30'u ve ≥ 5)
  let totalPairs = 0
  let maxPairKey = ''
  let maxPairCount = 0
  for (const [key, cnt] of Object.entries(merged.pairs || {})) {
    totalPairs += cnt
    if (cnt > maxPairCount) {
      maxPairCount = cnt
      maxPairKey = key
    }
  }

  if (
    maxPairCount >= INSIGHT_THRESHOLDS.CONFUSING_PAIR_MIN_COUNT &&
    totalPairs > 0 &&
    maxPairCount / totalPairs >= INSIGHT_THRESHOLDS.CONFUSING_PAIR_RATE
  ) {
    const pct = Math.round((maxPairCount / totalPairs) * 100)
    const [c1, c2] = maxPairKey.split('')
    list.push({
      id: 'confusing_pair',
      priority: 5,
      type: 'tip',
      title: 'Benzer Harf Karışıklığı',
      message: `"${c1}" ve "${c2}" harflerini sıkça karıştırıyorsun (karışıklıklarının %${pct}'i bu iki harften kaynaklanıyor).`,
    })
  }

  // Kural 6: Geç bulma (Ortalama çözüm tahmini ≥ 4)
  let solvedCount = 0
  let guessSum = 0
  for (const len of [4, 5, 6, 7]) {
    const lb = merged.byLength[len]
    if (lb) {
      solvedCount += lb.solved
      guessSum += lb.guessSum
    }
  }

  if (solvedCount >= INSIGHT_THRESHOLDS.LATE_SOLVE_MIN_SOLVED) {
    const avgGuess = guessSum / solvedCount
    if (avgGuess >= INSIGHT_THRESHOLDS.LATE_SOLVE_AVG_GUESS) {
      list.push({
        id: 'late_solve',
        priority: 6,
        type: 'info',
        title: 'Tahmin Dağılımı',
        message: `Kelimeleri genelde son haklarda buluyorsun (ortalama ${avgGuess.toFixed(1)}. tahminde).`,
      })
    }
  }

  // Kural 7: Final (4. tura ulaşma oranı ≥ %50 ve en sık takılınan etap varsa)
  const isYarisma = filter.mode === 'all' || filter.mode === 'yarisma'
  const relevantGames = isYarisma
    ? rawData.games.filter((g) => filter.level === 'all' || g.level === filter.level)
    : []

  if (relevantGames.length >= INSIGHT_THRESHOLDS.ROUND4_MIN_GAMES) {
    let r4Reached = 0
    const stageFailCounts: Record<number, number> = { 4: 0, 5: 0, 6: 0, 7: 0 }

    for (const g of relevantGames) {
      const reached = g.lastCompletedStage !== null || g.round4TimeLeft > 0
      if (reached) {
        r4Reached++
        if (g.lastCompletedStage === null) {
          stageFailCounts[4]++
        } else if (g.lastCompletedStage === 4) {
          stageFailCounts[5]++
        } else if (g.lastCompletedStage === 5) {
          stageFailCounts[6]++
        } else if (g.lastCompletedStage === 6) {
          stageFailCounts[7]++
        }
      }
    }

    if (r4Reached / relevantGames.length >= INSIGHT_THRESHOLDS.ROUND4_REACH_RATE) {
      let maxStuckStage = 0
      let maxStuckCount = 0
      for (const st of [4, 5, 6, 7]) {
        if (stageFailCounts[st] > maxStuckCount) {
          maxStuckCount = stageFailCounts[st]
          maxStuckStage = st
        }
      }
      if (maxStuckCount >= 2) {
        list.push({
          id: 'round4_stage',
          priority: 7,
          type: 'tip',
          title: 'Büyük Final Performansı',
          message: `Büyük Final'de en çok ${maxStuckStage} harfli kelimelerde takılıyorsun.`,
        })
      }
    }
  }

  // Kural 8: Tekrar çalış (Öğrenilmemiş kaçırılan kelime varsa en çok kaçırılan 5 kelime)
  const missedList = Object.entries(rawData.missedWords || {})
    .filter(([_, r]) => {
      if (filter.mode === 'yarisma') return r.y > 0
      if (filter.mode === 'calisma') return r.c > 0
      return r.y + r.c > 0
    })
    .sort((a, b) => (b[1].y + b[1].c) - (a[1].y + a[1].c))

  if (missedList.length > 0) {
    const topWords = missedList.slice(0, 5).map(([w]) => `"${w}"`).join(', ')
    list.push({
      id: 'review_errors',
      priority: 8,
      type: 'tip',
      title: 'Hatalarımla Çalış',
      message: `En çok kaçırdığın kelimeler: ${topWords}. Hatalarımla Çalış modunda bu kelimeler üzerinde pratik yapabilirsin.`,
    })
  }

  // Kural 9: Yarışma–Çalışma farkı (Her ikisinde ≥ 30 soru, Yarışma Çalışma'dan ≥ 15 puan düşükse)
  let yarismaSeen = 0
  let yarismaSolved = 0
  let calismaSeen = 0
  let calismaSolved = 0

  for (const k of ['yarisma:kolay', 'yarisma:orta', 'yarisma:zor'] as const) {
    const b = rawData.buckets[k]
    if (b) {
      yarismaSeen += b.bonus?.seen || 0
      yarismaSolved += b.bonus?.solved || 0
      for (const len of [4, 5, 6, 7]) {
        yarismaSeen += b.byLength[len]?.seen || 0
        yarismaSolved += b.byLength[len]?.solved || 0
      }
    }
  }

  for (const k of ['calisma:kolay', 'calisma:orta', 'calisma:zor'] as const) {
    const b = rawData.buckets[k]
    if (b) {
      calismaSeen += b.bonus?.seen || 0
      calismaSolved += b.bonus?.solved || 0
      for (const len of [4, 5, 6, 7]) {
        calismaSeen += b.byLength[len]?.seen || 0
        calismaSolved += b.byLength[len]?.solved || 0
      }
    }
  }

  if (
    yarismaSeen >= INSIGHT_THRESHOLDS.MODE_DIFF_MIN_QUESTIONS &&
    calismaSeen >= INSIGHT_THRESHOLDS.MODE_DIFF_MIN_QUESTIONS
  ) {
    const yRate = Math.round((yarismaSolved / yarismaSeen) * 100)
    const cRate = Math.round((calismaSolved / calismaSeen) * 100)
    if (cRate - yRate >= INSIGHT_THRESHOLDS.MODE_DIFF_RATE) {
      list.push({
        id: 'mode_difference',
        priority: 9,
        type: 'info',
        title: 'Modlar Arası Odak',
        message: `Çalışmada daha başarılısın (%${cRate}); Yarışma'da (%${yRate}) da aynı sakinliği korumayı dene.`,
      })
    }
  }

  // Öncelik sırasına göre sırala ve en fazla 5 tanesini döndür
  list.sort((a, b) => a.priority - b.priority)
  return list.slice(0, 5)
}

// ─── 7.4 Performans Sekmesi Hesaplayıcıları ──────────────────────────

export interface LengthPerformanceItem {
  length: number
  seen: number
  solved: number
  lost: number
  successRate: number | null // %
  avgGuess: number | null
  guessDist: Record<number, number>
  lossReasons: {
    five_guesses: number
    invalid_word: number
    timeout: number
    pass: number
  }
}

export interface BonusPerformanceStats {
  seen: number
  solved: number
  wrong: number
  notPressed: number
  writeTimeout: number
  successRate: number | null
  avgLettersOpened: number | null
  avgBilSecond: number | null
}

export interface TimingPerformanceStats {
  avgGuessSeconds: number | null
  timeoutCount: number
  timeoutRate: number | null
}

export interface PassPerformanceStats {
  totalPass: number
  passPerQuestion: number | null
}

export interface PerformanceMetrics {
  byLength: LengthPerformanceItem[]
  bonus: BonusPerformanceStats
  timing: TimingPerformanceStats
  pass: PassPerformanceStats
}

export function computePerformance(merged: MergedAnalytics): PerformanceMetrics {
  const byLength: LengthPerformanceItem[] = []

  let totalQuestionsSeen = merged.bonus?.seen || 0
  let totalPass = 0

  for (const len of [4, 5, 6, 7]) {
    const lb = merged.byLength[len]
    const seen = lb?.seen || 0
    const solved = lb?.solved || 0
    const lost = lb?.lost || 0
    totalQuestionsSeen += seen

    const successRate = seen >= 5 ? Math.round((solved / seen) * 100) : null
    const avgGuess = solved > 0 ? Math.round((lb.guessSum / solved) * 10) / 10 : null
    const passCount = lb?.lossReasons?.pass || 0
    totalPass += passCount

    byLength.push({
      length: len,
      seen,
      solved,
      lost,
      successRate,
      avgGuess,
      guessDist: { ...(lb?.guessDist || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }) },
      lossReasons: {
        five_guesses: lb?.lossReasons?.five_guesses || 0,
        invalid_word: lb?.lossReasons?.invalid_word || 0,
        timeout: lb?.lossReasons?.timeout || 0,
        pass: passCount,
      },
    })
  }

  // Bonus
  const bs = merged.bonus
  const bonusSeen = bs?.seen || 0
  const bonusSolved = bs?.solved || 0
  const bonusSuccessRate = bonusSeen > 0 ? Math.round((bonusSolved / bonusSeen) * 100) : null
  const avgLettersOpened =
    bonusSolved > 0 ? Math.round((bs.lettersOpenedSum / bonusSolved) * 10) / 10 : null
  const avgBilSecond =
    bs && bs.bilCount > 0 ? Math.round((bs.bilSecondSum / bs.bilCount) * 10) / 10 : null

  const bonus: BonusPerformanceStats = {
    seen: bonusSeen,
    solved: bonusSolved,
    wrong: bs?.wrong || 0,
    notPressed: bs?.notPressed || 0,
    writeTimeout: bs?.writeTimeout || 0,
    successRate: bonusSuccessRate,
    avgLettersOpened,
    avgBilSecond,
  }

  // Zaman
  const gCount = merged.timing?.guessCount || 0
  const gMsSum = merged.timing?.guessMsSum || 0
  const tCount = merged.timing?.timeoutCount || 0
  const avgGuessSeconds = gCount > 0 ? Math.round((gMsSum / gCount / 1000) * 10) / 10 : null
  const timeoutRate = gCount > 0 ? Math.round((tCount / gCount) * 100) : null

  const timing: TimingPerformanceStats = {
    avgGuessSeconds,
    timeoutCount: tCount,
    timeoutRate,
  }

  // PAS kullanımı
  const passPerQuestion =
    totalQuestionsSeen > 0 ? Math.round((totalPass / totalQuestionsSeen) * 100) / 100 : null

  return {
    byLength,
    bonus,
    timing,
    pass: {
      totalPass,
      passPerQuestion,
    },
  }
}

// ─── 7.5 Harfler Sekmesi Hesaplayıcıları ──────────────────────────────

export interface LetterDifficultyItem {
  char: string
  redCount: number
  totalCount: number
  redRate: number // %
  isTurkishSpecial: boolean
}

export interface PositionHeatmapItem {
  pos: number
  greenRate: number
  yellowRate: number
  redRate: number
  total: number
}

export interface LettersMetrics {
  hardestLetters: LetterDifficultyItem[]
  allLetters: LetterDifficultyItem[]
  pairs: Record<string, number>
  positions: Record<number, PositionHeatmapItem[]>
}

const TURKISH_SPECIAL_LETTERS = new Set(['ç', 'ğ', 'ı', 'i', 'ö', 'ş', 'ü'])
const TURKISH_ALPHABET = 'abcçdefgğhıijklmnoöprsştuüvyz'.split('')

export function computeLetters(merged: MergedAnalytics): LettersMetrics {
  const lettersMap = merged.letters || {}
  const list: LetterDifficultyItem[] = []

  for (const char of TURKISH_ALPHABET) {
    const marks = lettersMap[char] || { g: 0, y: 0, r: 0 }
    const total = marks.g + marks.y + marks.r
    const redCount = marks.r
    const redRate = total >= 10 ? Math.round((redCount / total) * 100) : 0

    list.push({
      char,
      redCount,
      totalCount: total,
      redRate,
      isTurkishSpecial: TURKISH_SPECIAL_LETTERS.has(char),
    })
  }

  // En zorlanılan 10 harf: En az 10 deneme yapılmış harfler arasından kırmızı oranı en yüksek olanlar
  const eligible = list.filter((item) => item.totalCount >= 10)
  eligible.sort((a, b) => b.redRate - a.redRate || b.totalCount - a.totalCount)
  const hardestLetters = eligible.slice(0, 10)

  // Konum ısı haritası (4–7)
  const positions: Record<number, PositionHeatmapItem[]> = {}
  for (const len of [4, 5, 6, 7]) {
    positions[len] = []
    const posMap = merged.positions?.[len] || {}
    for (let pos = 1; pos < len; pos++) {
      const m = posMap[pos] || { g: 0, y: 0, r: 0 }
      const total = m.g + m.y + m.r
      const greenRate = total > 0 ? Math.round((m.g / total) * 100) : 0
      const yellowRate = total > 0 ? Math.round((m.y / total) * 100) : 0
      const redRate = total > 0 ? Math.round((m.r / total) * 100) : 0
      positions[len].push({
        pos,
        greenRate,
        yellowRate,
        redRate,
        total,
      })
    }
  }

  return {
    hardestLetters,
    allLetters: list,
    pairs: merged.pairs || {},
    positions,
  }
}

// ─── 7.6 İlerleme Sekmesi Hesaplayıcıları ──────────────────────────────

export interface ProgressMetrics {
  lastGames: GameSummaryRecord[]
  lastSessions: SessionSummaryRecord[]
  gameTrend: {
    last5Avg: number
    prev5Avg: number
    diff: number
    direction: 'up' | 'down' | 'same'
  } | null
  sessionTrend: {
    last5SuccessRate: number
    prev5SuccessRate: number
    diff: number
    direction: 'up' | 'down' | 'same'
  } | null
}

export function computeProgress(
  rawData: AnalyticsData,
  filter: AnalyticsFilter
): ProgressMetrics {
  // 1) Yarışma oyunları
  const isYarismaRelevant = filter.mode === 'all' || filter.mode === 'yarisma'
  const filteredGames = isYarismaRelevant
    ? rawData.games.filter((g) => filter.level === 'all' || g.level === filter.level)
    : []
  const lastGames = filteredGames.slice(0, 10)

  let gameTrend: ProgressMetrics['gameTrend'] = null
  if (filteredGames.length >= 10) {
    const last5 = filteredGames.slice(0, 5)
    const prev5 = filteredGames.slice(5, 10)
    const last5Avg = Math.round(last5.reduce((sum, g) => sum + g.finalScore, 0) / 5)
    const prev5Avg = Math.round(prev5.reduce((sum, g) => sum + g.finalScore, 0) / 5)
    const diff = last5Avg - prev5Avg
    gameTrend = {
      last5Avg,
      prev5Avg,
      diff,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
    }
  }

  // 2) Çalışma oturumları
  const isCalismaRelevant = filter.mode === 'all' || filter.mode === 'calisma' || filter.mode === 'hatalar'
  const filteredSessions = isCalismaRelevant
    ? rawData.sessions.filter((s) => {
        if (filter.mode === 'calisma' && s.mode !== 'calisma') return false
        if (filter.mode === 'hatalar' && s.mode !== 'hatalar') return false
        if (filter.level !== 'all' && s.level && s.level !== filter.level) return false
        return true
      })
    : []
  const lastSessions = filteredSessions.slice(0, 10)

  let sessionTrend: ProgressMetrics['sessionTrend'] = null
  if (filteredSessions.length >= 10) {
    const last5 = filteredSessions.slice(0, 5)
    const prev5 = filteredSessions.slice(5, 10)

    const calcRate = (arr: SessionSummaryRecord[]) => {
      const q = arr.reduce((s, item) => s + item.totalQuestions, 0)
      const w = arr.reduce((s, item) => s + item.wonCount, 0)
      return q > 0 ? Math.round((w / q) * 100) : 0
    }

    const last5SuccessRate = calcRate(last5)
    const prev5SuccessRate = calcRate(prev5)
    const diff = last5SuccessRate - prev5SuccessRate
    sessionTrend = {
      last5SuccessRate,
      prev5SuccessRate,
      diff,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
    }
  }

  return {
    lastGames,
    lastSessions,
    gameTrend,
    sessionTrend,
  }
}

// ─── 7.2 & 7.3 Liste Filtreleme ve Sıralama ──────────────────────────

export interface FilteredMissedWordItem {
  word: string
  y: number
  c: number
  total: number
  letterCount: number
  level?: 'kolay' | 'orta' | 'zor'
  isLearned: boolean
}

export function filterAndSortMissedWords(
  missedWordsMap: Record<string, { y: number; c: number; last: number }>,
  options: {
    mode: AnalyticsFilter['mode']
    searchQuery: string
    letterFilter: number | 'all'
    levelFilter: 'all' | 'kolay' | 'orta' | 'zor'
    sortBy: 'alpha' | 'count'
    levelsMap?: Record<string, 'kolay' | 'orta' | 'zor'>
    learnedSet?: Set<string>
  }
): FilteredMissedWordItem[] {
  const { mode, searchQuery, letterFilter, levelFilter, sortBy, levelsMap, learnedSet } = options
  const q = searchQuery.trim().toLocaleLowerCase('tr-TR')

  const list: FilteredMissedWordItem[] = []

  for (const [word, record] of Object.entries(missedWordsMap)) {
    // 1) Mod filtresi
    if (mode === 'yarisma' && record.y <= 0) continue
    if (mode === 'calisma' && record.c <= 0) continue
    if (record.y + record.c <= 0) continue

    const len = Array.from(word).length

    // 2) Harf sayısı filtresi
    if (letterFilter !== 'all') {
      if (letterFilter === 8 && len < 8) continue
      if (letterFilter !== 8 && len !== letterFilter) continue
    }

    // 3) Seviye filtresi
    const wordLevel = levelsMap?.[word] || 'zor'
    if (levelFilter !== 'all' && wordLevel !== levelFilter) continue

    // 4) Arama
    if (q && !word.toLocaleLowerCase('tr-TR').includes(q)) continue

    const isLearned = learnedSet?.has(word) ?? false

    list.push({
      word,
      y: record.y,
      c: record.c,
      total: record.y + record.c,
      letterCount: len,
      level: wordLevel,
      isLearned,
    })
  }

  // 5) Sıralama
  if (sortBy === 'count') {
    list.sort((a, b) => b.total - a.total || a.word.localeCompare(b.word, 'tr-TR'))
  } else {
    list.sort((a, b) => a.word.localeCompare(b.word, 'tr-TR'))
  }

  return list
}

export interface FilteredInvalidWordItem {
  word: string
  y: number
  c: number
  h: number
  total: number
  letterCount: number
}

export function filterAndSortInvalidWords(
  invalidWordsMap: Record<string, { y: number; c: number; h: number; last: number }>,
  options: {
    mode: AnalyticsFilter['mode']
    searchQuery: string
    letterFilter: number | 'all'
    sortBy: 'alpha' | 'count'
  }
): FilteredInvalidWordItem[] {
  const { mode, searchQuery, letterFilter, sortBy } = options
  const q = searchQuery.trim().toLocaleLowerCase('tr-TR')

  const list: FilteredInvalidWordItem[] = []

  for (const [word, record] of Object.entries(invalidWordsMap)) {
    // 1) Mod filtresi
    if (mode === 'yarisma' && record.y <= 0) continue
    if (mode === 'calisma' && record.c <= 0) continue
    if (mode === 'hatalar' && record.h <= 0) continue
    const total = record.y + record.c + record.h
    if (total <= 0) continue

    const len = Array.from(word).length

    // 2) Harf sayısı filtresi
    if (letterFilter !== 'all') {
      if (letterFilter === 8 && len < 8) continue
      if (letterFilter !== 8 && len !== letterFilter) continue
    }

    // 3) Arama
    if (q && !word.toLocaleLowerCase('tr-TR').includes(q)) continue

    list.push({
      word,
      y: record.y,
      c: record.c,
      h: record.h,
      total,
      letterCount: len,
    })
  }

  // 4) Sıralama
  if (sortBy === 'count') {
    list.sort((a, b) => b.total - a.total || a.word.localeCompare(b.word, 'tr-TR'))
  } else {
    list.sort((a, b) => a.word.localeCompare(b.word, 'tr-TR'))
  }

  return list
}
