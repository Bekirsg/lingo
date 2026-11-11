/**
 * LİNGO v2 — Analiz ve İstatistik Veri Modeli
 * SPEC-v2 Bölüm 8.3 & 7.0
 */

import type { GameLevel } from '../data/levels'

export type AnalyticsBucketKey =
  | 'yarisma:kolay'
  | 'yarisma:orta'
  | 'yarisma:zor'
  | 'calisma:kolay'
  | 'calisma:orta'
  | 'calisma:zor'
  | 'hatalar'

export interface LengthBucketStats {
  seen: number
  solved: number
  lost: number
  guessSum: number
  guessDist: Record<number, number> // 1..5
  lossReasons: {
    five_guesses: number
    invalid_word: number
    timeout: number
    pass: number
  }
}

export interface BonusBucketStats {
  seen: number
  solved: number
  wrong: number
  notPressed: number
  writeTimeout: number
  /** Doğru çözülenlerde BİL anındaki açık harf toplamı */
  lettersOpenedSum: number
  bilSecondSum: number
  bilCount: number
}

export interface TimingBucketStats {
  guessMsSum: number
  guessCount: number
  timeoutCount: number
}

export interface LetterMarks {
  g: number // green
  y: number // yellow
  r: number // red
}

export interface AnalyticsBucket {
  /** 4..7 harfli kelime istatistikleri */
  byLength: Record<number, LengthBucketStats>
  bonus: BonusBucketStats
  timing: TimingBucketStats
  letters: Record<string, LetterMarks>
  /** Benzer harf karışıklığı sayaçları: "iı", "oö", "uü", "cç", "sş", "gğ" */
  pairs: Record<string, number>
  /** [uzunluk][konum] (1..uzunluk-1; 0. kilitli ilk harf kaydedilmez) */
  positions: Record<number, Record<number, LetterMarks>>
  /** 4. tur sayaçları (yalnızca yarisma:* kovalarında bulunur) */
  round4?: {
    /** 4. tura başlanan oyun sayısı */
    games: number
    timeLeftSum: number
  }
}

export interface MissedWordRecord {
  /** Yarışma modunda kaçırılma sayısı */
  y: number
  /** Çalışma modunda kaçırılma sayısı */
  c: number
  /** Son kaçırılma zaman damgası */
  last: number
}

export interface InvalidWordRecord {
  /** Yarışma modunda yazılma sayısı */
  y: number
  /** Çalışma modunda yazılma sayısı */
  c: number
  /** Hatalar modunda yazılma sayısı */
  h: number
  /** Son yazılma zaman damgası */
  last: number
}

export interface GameSummaryRecord {
  timestamp: number
  level: GameLevel
  finalScore: number
  treasury: number
  lastCompletedStage: number | null
  solvedWordsCount: number
  lostWordsCount: number
  round4TimeLeft: number
}

export interface SessionSummaryRecord {
  timestamp: number
  mode: 'calisma' | 'hatalar'
  level?: GameLevel
  totalQuestions: number
  wonCount: number
  lostCount: number
  passCount: number
  byLetter: Record<number, { asked: number; won: number }>
  bonusWonCount: number
  bonusLostCount: number
}

export interface AnalyticsData {
  version: number
  buckets: Record<AnalyticsBucketKey, AnalyticsBucket>
  /** En az 1 kez kaçırılan kelimeler */
  missedWords: Record<string, MissedWordRecord>
  /** Sözlük dışı gönderilen diziler (en fazla 500 kayıt) */
  invalidWords: Record<string, InvalidWordRecord>
  /** Son 50 Yarışma oyunu özeti */
  games: GameSummaryRecord[]
  /** Son 50 Çalışma/Hatalarımla oturum özeti */
  sessions: SessionSummaryRecord[]
}

export type FilterType = 'all' | 'length' | 'initial'
export type FilterMode = 'all' | 'yarisma' | 'calisma' | 'hatalar'
export type FilterLevel = 'all' | 'kolay' | 'orta' | 'zor'

export interface AnalyticsFilter {
  /** Grnm tr: Tm, Harf saysna gre, Ba harfe gre */
  type?: FilterType
  /** SeA ilen harf uzunluYu (4, 5, 6, 7) */
  length?: number
  /** SeA ilen ba harf (kA Ak harf tr-TR) */
  initial?: string
  /** Mod filtresi (geriye dnk uyumluluk ve kova birleYtirme) */
  mode?: FilterMode
  /** Seviye filtresi (geriye dnk uyumluluk ve kova birleYtirme) */
  level?: FilterLevel
}

export interface MergedAnalytics {
  byLength: Record<number, LengthBucketStats>
  bonus: BonusBucketStats
  timing: TimingBucketStats
  letters: Record<string, LetterMarks>
  pairs: Record<string, number>
  positions: Record<number, Record<number, LetterMarks>>
  round4?: {
    games: number
    timeLeftSum: number
  }
  /** Hatalarımla seçili ve seviye !== 'all' ise true (Seviye ayrımı yok) */
  isLevelIrrelevant: boolean
  hasData: boolean
  /** Her moddaki toplam soru sayısı (Özet ekranı için) */
  modeQuestionCount: {
    yarisma: number
    calisma: number
    hatalar: number
  }
}
