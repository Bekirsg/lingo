/**
 * LİNGO v2 — Analiz İndirgeyici (Reducer) & Saf Hesaplama Fonksiyonları
 * SPEC-v2 Bölüm 8.2, 8.3
 */

import type { GameLevel } from '../data/levels'
import type { GameMode } from '../game/state/types'
import type {
  AnalyticsData,
  AnalyticsBucket,
  AnalyticsBucketKey,
  LengthBucketStats,
  BonusBucketStats,
  TimingBucketStats,
  LetterMarks,
} from './types'
import type { QuestionResolvedEvent, GameCompletedEvent, SessionCompletedEvent } from '../game/state/types'

// Benzer harf karışıklığı çiftleri (SPEC 7.5 & 8.3: "cç", "gğ", "iı", "oö", "sş", "uü")
export const CONFUSING_PAIRS = new Set<string>([
  'cç',
  'gğ',
  'iı',
  'oö',
  'sş',
  'uü',
])

/**
 * İki Türkçe harf arasındaki benzerlik çifti anahtarını yönsüz ve sıralı döndürür (örn: "iı").
 */
export function getConfusingPairKey(a: string, b: string): string | null {
  if (!a || !b || a === b) return null
  const pair = [a, b].sort().join('')
  return CONFUSING_PAIRS.has(pair) ? pair : null
}

export function createEmptyBucket(includeRound4: boolean = false): AnalyticsBucket {
  const byLength: Record<number, LengthBucketStats> = {}
  const positions: Record<number, Record<number, LetterMarks>> = {}

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
    positions[len] = {}
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

  const bucket: AnalyticsBucket = {
    byLength,
    bonus,
    timing,
    letters: {},
    pairs: {},
    positions,
  }

  if (includeRound4) {
    bucket.round4 = {
      // "games": 4. tura (Büyük Final) başlanan oyun sayısı
      games: 0,
      timeLeftSum: 0,
    }
  }

  return bucket
}

export function createEmptyAnalyticsData(): AnalyticsData {
  return {
    version: 1,
    buckets: {
      'yarisma:kolay': createEmptyBucket(true),
      'yarisma:orta': createEmptyBucket(true),
      'yarisma:zor': createEmptyBucket(true),
      'calisma:kolay': createEmptyBucket(false),
      'calisma:orta': createEmptyBucket(false),
      'calisma:zor': createEmptyBucket(false),
      'hatalar': createEmptyBucket(false),
    },
    missedWords: {},
    invalidWords: {},
    games: [],
    sessions: [],
  }
}

export function getBucketKey(mode: GameMode, level?: GameLevel): AnalyticsBucketKey {
  if (mode === 'hatalar') {
    return 'hatalar'
  }
  const lvl = level || 'zor'
  return `${mode}:${lvl}` as AnalyticsBucketKey
}

/**
 * Bir soru sonuçlandığında analiz verisini günceller (Saf fonksiyon).
 */
export function recordQuestionToAnalytics(
  data: AnalyticsData,
  event: QuestionResolvedEvent,
  timestamp: number = Date.now()
): AnalyticsData {
  const bucketKey = getBucketKey(event.mode, event.level)
  const bucket = data.buckets[bucketKey]
  if (!bucket) return data

  const isBonus = event.letterCount >= 8

  // ─── 1) byLength & bonus sayaçları ─────────────────────────────────
  if (!isBonus && bucket.byLength[event.letterCount]) {
    const lb = bucket.byLength[event.letterCount]
    lb.seen++

    if (event.result === 'won') {
      lb.solved++
      lb.guessSum += event.attemptCount
      const attempt = Math.min(5, Math.max(1, event.attemptCount))
      lb.guessDist[attempt] = (lb.guessDist[attempt] || 0) + 1
    } else {
      lb.lost++
      let reason: 'five_guesses' | 'invalid_word' | 'timeout' | 'pass' = 'five_guesses'
      if (event.lossReason === 'invalid_word') {
        reason = 'invalid_word'
      } else if (event.lossReason === 'timeout' || event.lossReason === 'time_out') {
        reason = 'timeout'
      } else if (event.lossReason === 'pass') {
        reason = 'pass'
      } else {
        reason = 'five_guesses'
      }
      lb.lossReasons[reason] = (lb.lossReasons[reason] || 0) + 1
    }
  } else if (isBonus) {
    const bb = bucket.bonus
    bb.seen++

    if (event.result === 'won') {
      bb.solved++
      bb.bilCount++
      if (event.bonusLettersOpened !== undefined) {
        bb.lettersOpenedSum += event.bonusLettersOpened
      }
      if (event.bonusBilSeconds !== undefined) {
        bb.bilSecondSum += event.bonusBilSeconds
      }
    } else {
      if (event.bonusResultType === 'not_pressed') {
        bb.notPressed++
      } else if (event.bonusResultType === 'write_timeout') {
        bb.writeTimeout++
        bb.bilCount++
        if (event.bonusBilSeconds !== undefined) {
          bb.bilSecondSum += event.bonusBilSeconds
        }
      } else {
        // 'wrong'
        bb.wrong++
        bb.bilCount++
        if (event.bonusLettersOpened !== undefined) {
          bb.lettersOpenedSum += event.bonusLettersOpened
        }
        if (event.bonusBilSeconds !== undefined) {
          bb.bilSecondSum += event.bonusBilSeconds
        }
      }
    }
  }

  // ─── 2) Zaman sayaçları (timing) ───────────────────────────────────
  // PAS bir tahmin değildir; harf/konum/süre sayaçlarını etkilemez
  if (event.result !== 'pass') {
    const durations = event.guessDurationsMs || []
    for (const ms of durations) {
      bucket.timing.guessMsSum += ms
      bucket.timing.guessCount++
    }
    if (event.lossReason === 'timeout' || event.lossReason === 'time_out') {
      bucket.timing.timeoutCount++
    }
  }

  // ─── 3) Harf, Konum ve Çift Sayaçları ──────────────────────────────
  // Kural: PAS tahmin değildir; sözlük dışı dizi harf sayacını artırmaz;
  // harf/konum sayaçlarında kilitli ilk harf (index 0) YOK; bonusta tahmin yok.
  if (!isBonus && event.result !== 'pass') {
    const guesses = event.guesses || []
    const guessMarks = event.guessMarks || []
    const invalidSet = new Set<string>(event.invalidWords || event.invalidGuesses || [])

    for (let gIdx = 0; gIdx < guesses.length; gIdx++) {
      const guess = guesses[gIdx]
      // Sözlük dışı tahminler harf/konum sayaçlarını etkilemez
      if (invalidSet.has(guess)) continue

      const marks = guessMarks[gIdx]
      if (!marks) continue

      // Konum indeksleri 0 tabanlıdır ve 0. (kilitli) konum kaydedilmez (pos >= 1)
      for (let pos = 1; pos < event.letterCount; pos++) {
        const charGuess = guess[pos]
        const charTarget = event.word[pos]
        // marks kilitli ilk harf hariç (uzunluk - 1) veya tam (uzunluk) gelebilir
        const mark = marks.length === event.letterCount - 1 ? marks[pos - 1] : marks[pos]
        if (!charGuess || !mark) continue

        // letters: { [harf]: { g, y, r } }
        if (!bucket.letters[charGuess]) {
          bucket.letters[charGuess] = { g: 0, y: 0, r: 0 }
        }
        if (mark === 'green') bucket.letters[charGuess].g++
        else if (mark === 'yellow') bucket.letters[charGuess].y++
        else if (mark === 'red') bucket.letters[charGuess].r++

        // positions: [uzunluk][konum]: { g, y, r }
        if (!bucket.positions[event.letterCount]) {
          bucket.positions[event.letterCount] = {}
        }
        if (!bucket.positions[event.letterCount][pos]) {
          bucket.positions[event.letterCount][pos] = { g: 0, y: 0, r: 0 }
        }
        if (mark === 'green') bucket.positions[event.letterCount][pos].g++
        else if (mark === 'yellow') bucket.positions[event.letterCount][pos].y++
        else if (mark === 'red') bucket.positions[event.letterCount][pos].r++

        // pairs: benzer harf karışıklığı sayaçları
        if (charTarget && charGuess !== charTarget) {
          const pairKey = getConfusingPairKey(charGuess, charTarget)
          if (pairKey) {
            bucket.pairs[pairKey] = (bucket.pairs[pairKey] || 0) + 1
          }
        }
      }
    }
  }

  // ─── 4) missedWords (Kaçırılan Kelimeler) ───────────────────────────
  // Kural: Yalnızca yarisma veya calisma modunda artar (hatalar modunda artmaz).
  // 4. turda 120 sn bittiği için yarım kalan kelime sayılmaz (event.lossReason != 'timeout' veya finishGame ile yönetilir).
  // Bonusta bilinemeyen her sonuç yarisma/calisma'da kaçırılan kelime sayılır.
  const isLostOrPass = event.result === 'lost' || event.result === 'pass'
  if (isLostOrPass && (event.mode === 'yarisma' || event.mode === 'calisma')) {
    if (!data.missedWords[event.word]) {
      data.missedWords[event.word] = { y: 0, c: 0, last: 0 }
    }
    if (event.mode === 'yarisma') {
      data.missedWords[event.word].y++
    } else if (event.mode === 'calisma') {
      data.missedWords[event.word].c++
    }
    data.missedWords[event.word].last = timestamp
  }

  // ─── 5) invalidWords (Sözlük Dışı Diziler) ───────────────────────────
  // Kural: Tüm modlarda toplam en fazla 500 kayıt; taşarsa en az sayaçlı ve en eski atılır.
  const allInvalid = event.invalidWords || event.invalidGuesses || []
  for (const inv of allInvalid) {
    if (!data.invalidWords[inv]) {
      data.invalidWords[inv] = { y: 0, c: 0, h: 0, last: 0 }
    }
    if (event.mode === 'yarisma') data.invalidWords[inv].y++
    else if (event.mode === 'calisma') data.invalidWords[inv].c++
    else if (event.mode === 'hatalar') data.invalidWords[inv].h++
    data.invalidWords[inv].last = timestamp
  }

  // 500 kayıt sınırını uygula
  const invKeys = Object.keys(data.invalidWords)
  if (invKeys.length > 500) {
    invKeys.sort((a, b) => {
      const countA = data.invalidWords[a].y + data.invalidWords[a].c + data.invalidWords[a].h
      const countB = data.invalidWords[b].y + data.invalidWords[b].c + data.invalidWords[b].h
      if (countA !== countB) return countA - countB // en az sayaçlı önce
      return data.invalidWords[a].last - data.invalidWords[b].last // en eski önce
    })

    const toRemove = invKeys.slice(0, invKeys.length - 500)
    for (const k of toRemove) {
      delete data.invalidWords[k]
    }
  }

  return data
}

/**
 * Yarışma oyunu bittiğinde analiz verisini günceller (Saf fonksiyon).
 */
export function recordGameToAnalytics(
  data: AnalyticsData,
  event: GameCompletedEvent
): AnalyticsData {
  // 1) games listesine ekle (en fazla 50)
  data.games.unshift({
    timestamp: event.timestamp,
    level: event.level,
    finalScore: event.finalScore,
    treasury: event.treasury,
    lastCompletedStage: event.lastCompletedStage,
    solvedWordsCount: event.solvedWordsCount,
    lostWordsCount: event.lostWordsCount,
    round4TimeLeft: event.round4TimeLeft,
  })

  if (data.games.length > 50) {
    data.games.length = 50
  }

  // 2) İlgili yarisma kovasındaki round4 sayacını güncelle
  // "games": 4. tura (Büyük Final) başlanan oyun sayısı
  const bucketKey: AnalyticsBucketKey = `yarisma:${event.level}`
  const bucket = data.buckets[bucketKey]
  if (bucket && bucket.round4) {
    // 4. tura başlanmış mı? (lastCompletedStage !== null veya round4TimeLeft > 0)
    const reachedRound4 = event.lastCompletedStage !== null || event.round4TimeLeft > 0
    if (reachedRound4) {
      bucket.round4.games++
      bucket.round4.timeLeftSum += event.round4TimeLeft
    }
  }

  return data
}

/**
 * Çalışma veya Hatalarımla oturumu bittiğinde analiz verisini günceller (Saf fonksiyon).
 */
export function recordSessionToAnalytics(
  data: AnalyticsData,
  event: SessionCompletedEvent
): AnalyticsData {
  // sessions listesine ekle (en fazla 50)
  data.sessions.unshift({
    timestamp: event.timestamp,
    mode: event.mode,
    level: event.level,
    totalQuestions: event.totalQuestions,
    wonCount: event.wonCount,
    lostCount: event.lostCount,
    passCount: event.passCount,
    byLetter: { ...event.byLetter },
    bonusWonCount: event.bonusWonCount,
    bonusLostCount: event.bonusLostCount,
  })

  if (data.sessions.length > 50) {
    data.sessions.length = 50
  }

  return data
}

/**
 * Boyut koruması: Serileştirilmiş veri ~1,5 MB'ı aşarsa en eski/en az sayaçlı missedWords kayıtlarını atar.
 */
export function pruneAnalyticsData(
  data: AnalyticsData,
  maxBytes: number = 1.5 * 1024 * 1024
): AnalyticsData {
  let serialized = JSON.stringify(data)
  if (serialized.length <= maxBytes) return data

  const missedKeys = Object.keys(data.missedWords)
  // En az sayaçlı ve en eski kelimeleri önce sırala
  missedKeys.sort((a, b) => {
    const countA = data.missedWords[a].y + data.missedWords[a].c
    const countB = data.missedWords[b].y + data.missedWords[b].c
    if (countA !== countB) return countA - countB
    return data.missedWords[a].last - data.missedWords[b].last
  })

  // 50'şer 50'şer silerek boyutu kontrol et
  while (missedKeys.length > 0 && serialized.length > maxBytes) {
    const chunk = missedKeys.splice(0, 50)
    for (const key of chunk) {
      delete data.missedWords[key]
    }
    serialized = JSON.stringify(data)
  }

  return data
}
