/**
 * LİNGO v2 — DEV İçin Örnek Analiz Verisi Üretici
 * SPEC-v2 Bölüm 8.3 & 12/V2-M6
 */

import type { AnalyticsData, GameSummaryRecord, SessionSummaryRecord } from './types'
import { createEmptyAnalyticsData, CONFUSING_PAIRS } from './reducer'
import type { GameLevel } from '../data/levels'

// Basit Deterministik Rastgele Sayı Üreteci (LCG)
function createRng(seed: number = 42) {
  let s = seed
  return function next() {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const SAMPLE_WORDS = [
  'elma', 'armut', 'kalem', 'kitap', 'sehpa', 'masa', 'kapı', 'pencere',
  'bardak', 'tabak', 'kaşık', 'çatal', 'bıçak', 'tencere', 'sürahi',
  'yastık', 'yorgan', 'çarşaf', 'karyola', 'dolap', 'çekmece', 'ayna',
  'havlu', 'sabun', 'tarak', 'fırça', 'macun', 'şampuan', 'lif', 'sünger',
  'kazak', 'gömlek', 'pantolon', 'etek', 'ceket', 'palto', 'hırka', 'yelek',
  'çorap', 'ayakkabı', 'terlik', 'çizme', 'bot', 'sandalet', 'kemer', 'kravat',
  'eldiven', 'atkı', 'bere', 'şapka', 'şemsiye', 'çanta', 'cüzdan', 'anahtar',
  'telefon', 'bilgisayar', 'ekran', 'fare', 'klavye', 'kulaklık', 'hoparlör',
  'kamera', 'televizyon', 'radyo', 'saat', 'lamba', 'avize', 'abajur', 'ampul',
  'sokak', 'cadde', 'meydan', 'park', 'bahçe', 'ağaç', 'çiçek', 'yaprak',
  'orman', 'deniz', 'göl', 'nehir', 'ırmak', 'dere', 'tepe', 'dağ', 'vadi',
  'gökyüzü', 'bulut', 'yağmur', 'kar', 'dolu', 'rüzgar', 'fırtına', 'şimşek',
  'yıldırım', 'güneş', 'ay', 'yıldız', 'gece', 'gündüz', 'sabah', 'akşam',
  'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi', 'pazar',
  'ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos',
  'eylül', 'ekim', 'kasım', 'aralık', 'ilkbahar', 'yaz', 'sonbahar', 'kış',
  'türkiye', 'ankara', 'istanbul', 'izmir', 'bursa', 'antalya', 'adana', 'konya',
  'aslan', 'kaplan', 'ayı', 'kurt', 'tilki', 'çakal', 'tavşan', 'sincap',
  'kartal', 'şahin', 'doğan', 'akbaba', 'baykuş', 'güvercin', 'kumru', 'serçe',
  'karga', 'saksağan', 'leylek', 'kırlangıç', 'turna', 'ördek', 'kaz', 'kuğu',
  'horoz', 'tavuk', 'civciv', 'hindi', 'bıldırcın', 'keklik', 'papağan', 'kanarya',
  'balık', 'hamsi', 'istavrit', 'lüfer', 'palamut', 'çipura', 'levrek', 'mezgit',
  'somon', 'alabalık', 'sazan', 'yayın', 'kefal', 'barbun', 'mercan', 'kalkan',
  'köpekbalığı', 'yunus', 'balina', 'ahtapot', 'kalamar', 'karides', 'ıstakoz', 'yengeç',
  'midye', 'istiridye', 'salyangoz', 'solucan', 'tırtıl', 'kelebek', 'arı', 'karınca',
  'sinek', 'sivrisinek', 'böcek', 'örümcek', 'akrep', 'yılan', 'kertenkele', 'kaplumbağa',
  'timsah', 'kurbağa', 'semender', 'bukalemun', 'iguana', 'geko', 'varan', 'anakonda',
]

const SAMPLE_INVALID_WORDS = [
  'asdf', 'qwer', 'zxcv', 'tyui', 'ghjk', 'bnmç', 'plok', 'mijn',
  'uhby', 'tgvr', 'fedc', 'wsxz', 'qaaz', 'wsxx', 'edcc', 'rfvv',
  'tgbb', 'yhnm', 'ujmı', 'ıkol', 'öçlp', 'asdd', 'fghj', 'klşi',
  'zxcb', 'vbnm', 'öçlk', 'jhgf', 'dsaa', 'qwre', 'tyiu', 'opğı',
  'asfg', 'hjkl', 'şizx', 'cvbn', 'mçöo', 'plkı', 'ujhy', 'tgfe',
  'wsad', 'qazx', 'swed', 'cvrf', 'btgy', 'hnum', 'jıkı', 'loöp',
  'zase', 'xdrc', 'cftv', 'vgyb', 'bhnj', 'nmkı', 'kölç', 'pqwo',
  'eiru', 'ytpe', 'roiw', 'ueyq', 'aısu', 'dıfe', 'kome', 'bare',
  'mure', 'turo', 'saru', 'yare', 'pare', 'kare', 'nare', 'zare',
  'lora', 'mora', 'tora', 'sora', 'yora', 'pora', 'kora', 'nora',
  'falo', 'malo', 'talo', 'salo', 'yalo', 'palo', 'kalo', 'nalo',
  'diko', 'miko', 'tiko', 'siko', 'yiko', 'piko', 'kiko', 'niko',
  'beka', 'meka', 'teka', 'seka', 'yeka', 'peka', 'keka', 'neka',
]

export function generateSampleAnalyticsData(seed: number = 20261110): AnalyticsData {
  const rng = createRng(seed)
  const data = createEmptyAnalyticsData()
  const now = Date.now()
  const ONE_DAY = 24 * 60 * 60 * 1000

  const levels: GameLevel[] = ['kolay', 'orta', 'zor']
  const letters = 'abcçdefgğhıijklmnoöprsştuüvyz'.split('')

  // 1) 7 Kovanın hepsini gerçekçi değerlerle doldur
  for (const bucketKey of Object.keys(data.buckets) as (keyof typeof data.buckets)[]) {
    const bucket = data.buckets[bucketKey]
    const isYarisma = bucketKey.startsWith('yarisma:')

    // byLength (4, 5, 6, 7)
    for (const len of [4, 5, 6, 7]) {
      const lb = bucket.byLength[len]
      const seen = Math.floor(15 + rng() * 35) // 15..50
      const solved = Math.floor(seen * (0.55 + rng() * 0.35)) // %55-90 başarı
      const lost = seen - solved

      lb.seen = seen
      lb.solved = solved
      lb.lost = lost

      let remainingSolved = solved
      for (let g = 1; g <= 5; g++) {
        if (g === 5) {
          lb.guessDist[g] = remainingSolved
        } else {
          const count = Math.min(remainingSolved, Math.floor(remainingSolved * (0.2 + rng() * 0.3)))
          lb.guessDist[g] = count
          remainingSolved -= count
        }
        lb.guessSum += g * lb.guessDist[g]
      }

      // lossReasons
      let remainingLost = lost
      const fiveGuesses = Math.floor(remainingLost * 0.5)
      const timeout = Math.floor(remainingLost * 0.25)
      const pass = Math.floor(remainingLost * 0.15)
      const invalidWord = remainingLost - (fiveGuesses + timeout + pass)

      lb.lossReasons = {
        five_guesses: fiveGuesses,
        timeout,
        pass,
        invalid_word: Math.max(0, invalidWord),
      }

      // positions
      for (let pos = 1; pos < len; pos++) {
        bucket.positions[len][pos] = {
          g: Math.floor(20 + rng() * 60),
          y: Math.floor(10 + rng() * 30),
          r: Math.floor(15 + rng() * 45),
        }
      }
    }

    // bonus
    const bonusSeen = Math.floor(5 + rng() * 15)
    const bonusSolved = Math.floor(bonusSeen * (0.4 + rng() * 0.4))
    const bonusWrong = Math.floor((bonusSeen - bonusSolved) * 0.5)
    const bonusTimeout = Math.floor((bonusSeen - bonusSolved) * 0.3)
    const bonusNotPressed = bonusSeen - bonusSolved - bonusWrong - bonusTimeout

    bucket.bonus = {
      seen: bonusSeen,
      solved: bonusSolved,
      wrong: bonusWrong,
      writeTimeout: Math.max(0, bonusTimeout),
      notPressed: Math.max(0, bonusNotPressed),
      lettersOpenedSum: bonusSolved * Math.floor(3 + rng() * 3),
      bilSecondSum: (bonusSolved + bonusWrong + Math.max(0, bonusTimeout)) * Math.floor(4 + rng() * 5),
      bilCount: bonusSolved + bonusWrong + Math.max(0, bonusTimeout),
    }

    // timing
    const totalGuesses = Math.floor(80 + rng() * 150)
    bucket.timing = {
      guessMsSum: totalGuesses * Math.floor(4500 + rng() * 4000), // ~4.5 - 8.5 sn ortalama
      guessCount: totalGuesses,
      timeoutCount: Math.floor(1 + rng() * 6),
    }

    // letters
    for (const char of letters) {
      bucket.letters[char] = {
        g: Math.floor(10 + rng() * 40),
        y: Math.floor(5 + rng() * 25),
        r: Math.floor(8 + rng() * 35),
      }
    }

    // pairs
    for (const pair of CONFUSING_PAIRS) {
      bucket.pairs[pair] = Math.floor(2 + rng() * 12)
    }

    // round4 (sadece yarisma kovalarında)
    if (isYarisma && bucket.round4) {
      const r4Games = Math.floor(3 + rng() * 8)
      bucket.round4 = {
        games: r4Games,
        timeLeftSum: r4Games * Math.floor(10 + rng() * 45),
      }
    }
  }

  // 2) ~30 Yarışma oyunu
  const gameCount = 30
  for (let i = 0; i < gameCount; i++) {
    const lvl = levels[Math.floor(rng() * levels.length)]
    const solved = Math.floor(6 + rng() * 10)
    const lost = Math.floor(rng() * 4)
    const reachedR4 = rng() > 0.4
    const score = Math.floor(1200 + rng() * 5000)

    const gameRecord: GameSummaryRecord = {
      timestamp: now - Math.floor(i * (ONE_DAY / 3) + rng() * 3600000),
      level: lvl,
      finalScore: score,
      treasury: Math.floor(score * (0.3 + rng() * 0.4)),
      lastCompletedStage: reachedR4 ? Math.floor(rng() * 4) : null,
      solvedWordsCount: solved,
      lostWordsCount: lost,
      round4TimeLeft: reachedR4 ? Math.floor(5 + rng() * 50) : 0,
    }
    data.games.push(gameRecord)
  }

  // 3) ~40 Çalışma oturumu
  const sessionCount = 40
  for (let i = 0; i < sessionCount; i++) {
    const lvl = levels[Math.floor(rng() * levels.length)]
    const won = Math.floor(5 + rng() * 15)
    const lost = Math.floor(1 + rng() * 6)
    const pass = Math.floor(rng() * 4)
    const total = won + lost + pass

    const sessionRecord: SessionSummaryRecord = {
      timestamp: now - Math.floor(i * (ONE_DAY / 4) + rng() * 3600000),
      mode: 'calisma',
      level: lvl,
      totalQuestions: total,
      wonCount: won,
      lostCount: lost,
      passCount: pass,
      byLetter: {
        4: { asked: Math.floor(total * 0.25), won: Math.floor(won * 0.25) },
        5: { asked: Math.floor(total * 0.25), won: Math.floor(won * 0.25) },
        6: { asked: Math.floor(total * 0.25), won: Math.floor(won * 0.25) },
        7: { asked: Math.floor(total * 0.25), won: Math.floor(won * 0.25) },
      },
      bonusWonCount: Math.floor(1 + rng() * 3),
      bonusLostCount: Math.floor(rng() * 2),
    }
    data.sessions.push(sessionRecord)
  }

  // 4) ~200 Kaçırılan kelime (missedWords)
  const missedCount = 200
  for (let i = 0; i < missedCount; i++) {
    const word = SAMPLE_WORDS[i % SAMPLE_WORDS.length] + (i >= SAMPLE_WORDS.length ? String(i) : '')
    data.missedWords[word] = {
      y: Math.floor(1 + rng() * 5),
      c: Math.floor(rng() * 4),
      last: now - Math.floor(rng() * 14 * ONE_DAY),
    }
  }

  // 5) ~100 Sözlük dışı kelime (invalidWords)
  const invalidCount = 100
  for (let i = 0; i < invalidCount; i++) {
    const word = SAMPLE_INVALID_WORDS[i % SAMPLE_INVALID_WORDS.length] + (i >= SAMPLE_INVALID_WORDS.length ? String(i) : '')
    data.invalidWords[word] = {
      y: Math.floor(1 + rng() * 4),
      c: Math.floor(rng() * 3),
      h: Math.floor(rng() * 2),
      last: now - Math.floor(rng() * 14 * ONE_DAY),
    }
  }

  return data
}

/**
 * Örnek analiz verisinin serileştirilmiş JSON boyutunu KB cinsinden hesaplar.
 */
export function getSampleAnalyticsSizeKb(data?: AnalyticsData): number {
  const d = data || generateSampleAnalyticsData()
  const json = JSON.stringify(d)
  return Math.round((json.length / 1024) * 10) / 10
}
