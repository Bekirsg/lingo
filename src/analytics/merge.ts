/**
 * LİNGO v2 — Analiz Kova Birleştirme (mergeBuckets)
 * SPEC-v2 Bölüm 8.3
 */

import type {
  AnalyticsData,
  AnalyticsFilter,
  AnalyticsBucketKey,
  AnalyticsBucket,
  MergedAnalytics,
  LengthBucketStats,
  BonusBucketStats,
  TimingBucketStats,
  LetterMarks,
} from './types'

export function mergeBuckets(data: AnalyticsData, filter: AnalyticsFilter): MergedAnalytics {
  const mode = filter.mode || 'all'
  const level = filter.level || 'all'
  const isLevelIrrelevant = mode === 'hatalar' && level !== 'all'

  // Hangi kovaların dahil edileceğini belirle
  const bucketKeys: AnalyticsBucketKey[] = []

  if (mode === 'all') {
    if (level === 'all') {
      bucketKeys.push(
        'yarisma:kolay',
        'yarisma:orta',
        'yarisma:zor',
        'calisma:kolay',
        'calisma:orta',
        'calisma:zor',
        'hatalar'
      )
    } else {
      // Mod=all ve seviye='kolay' vb. seçildiğinde yalnızca yarisma ve calisma birleşir, hatalar hariç
      bucketKeys.push(`yarisma:${level}` as AnalyticsBucketKey)
      bucketKeys.push(`calisma:${level}` as AnalyticsBucketKey)
    }
  } else if (mode === 'yarisma') {
    if (level === 'all') {
      bucketKeys.push('yarisma:kolay', 'yarisma:orta', 'yarisma:zor')
    } else {
      bucketKeys.push(`yarisma:${level}` as AnalyticsBucketKey)
    }
  } else if (mode === 'calisma') {
    if (level === 'all') {
      bucketKeys.push('calisma:kolay', 'calisma:orta', 'calisma:zor')
    } else {
      bucketKeys.push(`calisma:${level}` as AnalyticsBucketKey)
    }
  } else if (mode === 'hatalar') {
    // Hatalar modunda seviye filtresi yok sayılır
    bucketKeys.push('hatalar')
  }

  // Boş birleştirilmiş yapı hazırla
  const byLength: Record<number, LengthBucketStats> = {}
  for (const len of [4, 5, 6, 7]) {
    byLength[len] = {
      seen: 0,
      solved: 0,
      lost: 0,
      guessSum: 0,
      guessDist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      lossReasons: {
        five_guesses: 0,
        invalid_word: 0,
        timeout: 0,
        pass: 0,
      },
    }
  }

  const bonus: BonusBucketStats = {
    seen: 0,
    solved: 0,
    wrong: 0,
    notPressed: 0,
    writeTimeout: 0,
    lettersOpenedSum: 0,
    bilSecondSum: 0,
    bilCount: 0,
  }

  const timing: TimingBucketStats = {
    guessMsSum: 0,
    guessCount: 0,
    timeoutCount: 0,
  }

  const letters: Record<string, LetterMarks> = {}
  const pairs: Record<string, number> = {}
  const positions: Record<number, Record<number, LetterMarks>> = {
    4: {},
    5: {},
    6: {},
    7: {},
  }

  let round4GamesSum = 0
  let round4TimeLeftSum = 0
  let includesYarisma = false

  for (const key of bucketKeys) {
    const b: AnalyticsBucket | undefined = data.buckets[key]
    if (!b) continue

    if (key.startsWith('yarisma:')) {
      includesYarisma = true
    }

    // 1) byLength
    for (const len of [4, 5, 6, 7]) {
      const srcLb = b.byLength[len]
      if (!srcLb) continue
      const targetLb = byLength[len]
      targetLb.seen += srcLb.seen
      targetLb.solved += srcLb.solved
      targetLb.lost += srcLb.lost
      targetLb.guessSum += srcLb.guessSum
      for (let g = 1; g <= 5; g++) {
        targetLb.guessDist[g] += srcLb.guessDist[g] || 0
      }
      targetLb.lossReasons.five_guesses += srcLb.lossReasons?.five_guesses || 0
      targetLb.lossReasons.invalid_word += srcLb.lossReasons?.invalid_word || 0
      targetLb.lossReasons.timeout += srcLb.lossReasons?.timeout || 0
      targetLb.lossReasons.pass += srcLb.lossReasons?.pass || 0
    }

    // 2) bonus
    if (b.bonus) {
      bonus.seen += b.bonus.seen
      bonus.solved += b.bonus.solved
      bonus.wrong += b.bonus.wrong
      bonus.notPressed += b.bonus.notPressed
      bonus.writeTimeout += b.bonus.writeTimeout
      bonus.lettersOpenedSum += b.bonus.lettersOpenedSum
      bonus.bilSecondSum += b.bonus.bilSecondSum
      bonus.bilCount += b.bonus.bilCount
    }

    // 3) timing
    if (b.timing) {
      timing.guessMsSum += b.timing.guessMsSum
      timing.guessCount += b.timing.guessCount
      timing.timeoutCount += b.timing.timeoutCount
    }

    // 4) letters
    if (b.letters) {
      for (const [char, marks] of Object.entries(b.letters)) {
        if (!letters[char]) {
          letters[char] = { g: 0, y: 0, r: 0 }
        }
        letters[char].g += marks.g
        letters[char].y += marks.y
        letters[char].r += marks.r
      }
    }

    // 5) pairs
    if (b.pairs) {
      for (const [pairKey, count] of Object.entries(b.pairs)) {
        pairs[pairKey] = (pairs[pairKey] || 0) + count
      }
    }

    // 6) positions
    if (b.positions) {
      for (const len of [4, 5, 6, 7]) {
        const srcPosMap = b.positions[len]
        if (!srcPosMap) continue
        for (const [posStr, marks] of Object.entries(srcPosMap)) {
          const pos = Number(posStr)
          if (!positions[len][pos]) {
            positions[len][pos] = { g: 0, y: 0, r: 0 }
          }
          positions[len][pos].g += marks.g
          positions[len][pos].y += marks.y
          positions[len][pos].r += marks.r
        }
      }
    }

    // 7) round4
    if (b.round4) {
      round4GamesSum += b.round4.games
      round4TimeLeftSum += b.round4.timeLeftSum
    }
  }

  // hasData kontrolü: En az bir soru veya tahmin görülmüş mü?
  let totalSeen = bonus.seen
  for (const len of [4, 5, 6, 7]) {
    totalSeen += byLength[len].seen
  }
  const hasData = totalSeen > 0 || timing.guessCount > 0

  // mod bazında soru sayıları
  const calcModeCount = (keys: AnalyticsBucketKey[]) => {
    let count = 0
    for (const k of keys) {
      const b = data.buckets[k]
      if (!b) continue
      count += b.bonus?.seen || 0
      for (const len of [4, 5, 6, 7]) {
        count += b.byLength[len]?.seen || 0
      }
    }
    return count
  }

  const modeQuestionCount = {
    yarisma: calcModeCount(['yarisma:kolay', 'yarisma:orta', 'yarisma:zor']),
    calisma: calcModeCount(['calisma:kolay', 'calisma:orta', 'calisma:zor']),
    hatalar: calcModeCount(['hatalar']),
  }

  const result: MergedAnalytics = {
    byLength,
    bonus,
    timing,
    letters,
    pairs,
    positions,
    isLevelIrrelevant,
    hasData,
    modeQuestionCount,
  }

  if (includesYarisma) {
    result.round4 = {
      games: round4GamesSum,
      timeLeftSum: round4TimeLeftSum,
    }
  }

  return result
}
