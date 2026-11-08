/**
 * LİNGO Yerel Veri Yönetimi (localStorage)
 *
 * SPEC Bölüm 8:
 * - be:highscore -> En yüksek final skor
 * - be:stats -> Oynanan oyun sayısı, en iyi etap (basit istatistik)
 * - be:settings -> { sound: boolean, haptics: boolean }
 *
 * Tüm okuma/yazmalar try/catch ile korunur ve sessizce varsayılan döner.
 */

import type { GameLevel } from './levels'

export const HIGH_SCORE_KEY = 'be:highscore'
export const STATS_KEY = 'be:stats'
export const SETTINGS_KEY = 'be:settings'

export const V2_RECORDS_KEY = 'be:v2:records'
export const V2_STATS_KEY = 'be:v2:stats'

export type KeyboardMode = 'game' | 'system'

export interface SettingsData {
  sound: boolean
  haptics: boolean
  keyboard: KeyboardMode
}

export interface GameStats {
  gamesPlayed: number
  bestStage: string // örn. "7 Harfli Etap" veya "Hiçbiri"
  bestStageNum: number // 0 (hiçbiri), 4, 5, 6, 7
}

export interface LevelRecords {
  kolay: number
  orta: number
  zor: number
}

export interface LevelStatsItem {
  gamesPlayed: number
  bestStage: string
  bestStageNum: number
}

export interface LevelStats {
  kolay: LevelStatsItem
  orta: LevelStatsItem
  zor: LevelStatsItem
}

// ─── En Yüksek Skor (be:highscore) ───────────────────────────────

export function getHighScore(): number {
  try {
    const val = localStorage.getItem(HIGH_SCORE_KEY)
    if (!val) return 0
    const num = Number(val)
    return Number.isFinite(num) && num >= 0 ? num : 0
  } catch {
    return 0
  }
}

export function setHighScore(score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(Math.max(0, Math.floor(score))))
  } catch {
    // Storage dolu veya erişilemez
  }
}

// ─── Ayarlar (be:settings) ────────────────────────────────────────

const DEFAULT_SETTINGS: SettingsData = {
  sound: true,
  haptics: true,
  keyboard: 'game',
}

export function getSettings(): SettingsData {
  try {
    const val = localStorage.getItem(SETTINGS_KEY)
    if (val) {
      const parsed = JSON.parse(val)
      return {
        sound: typeof parsed.sound === 'boolean' ? parsed.sound : DEFAULT_SETTINGS.sound,
        haptics: typeof parsed.haptics === 'boolean' ? parsed.haptics : DEFAULT_SETTINGS.haptics,
        keyboard: parsed.keyboard === 'system' ? 'system' : 'game',
      }
    }
  } catch {
    // Geçersiz veri
  }
  return { ...DEFAULT_SETTINGS }
}

export function setSettings(partial: Partial<SettingsData>): SettingsData {
  try {
    const current = getSettings()
    const updated: SettingsData = {
      sound: partial.sound !== undefined ? Boolean(partial.sound) : current.sound,
      haptics: partial.haptics !== undefined ? Boolean(partial.haptics) : current.haptics,
      keyboard:
        partial.keyboard !== undefined
          ? partial.keyboard === 'system'
            ? 'system'
            : 'game'
          : current.keyboard,
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('be:settings_changed', { detail: updated }))
    }
    return updated
  } catch {
    return { ...DEFAULT_SETTINGS, ...partial }
  }
}

// ─── İstatistikler (be:stats) ─────────────────────────────────────

const DEFAULT_STATS: GameStats = {
  gamesPlayed: 0,
  bestStage: 'Hiçbiri',
  bestStageNum: 0,
}

export function getStats(): GameStats {
  try {
    const val = localStorage.getItem(STATS_KEY)
    if (val) {
      const parsed = JSON.parse(val)
      return {
        gamesPlayed: Number(parsed.gamesPlayed) || 0,
        bestStage: typeof parsed.bestStage === 'string' ? parsed.bestStage : 'Hiçbiri',
        bestStageNum: Number(parsed.bestStageNum) || 0,
      }
    }
  } catch {
    // Geçersiz veri
  }
  return { ...DEFAULT_STATS }
}

export function setStats(stats: GameStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {
    // Sessizce geç
  }
}

/**
 * Oyun bittiğinde istatistiği ve en yüksek skoru günceller.
 * @param finalScore Oyun sonu skoru
 * @param lastCompletedStage Tamamlanan son etap (4, 5, 6, 7 veya null)
 */
export function recordGameResult(finalScore: number, lastCompletedStage: number | null): GameStats {
  const currentStats = getStats()
  const stageNum = lastCompletedStage ?? 0
  const isBetterStage = stageNum > currentStats.bestStageNum

  const updatedStats: GameStats = {
    gamesPlayed: currentStats.gamesPlayed + 1,
    bestStageNum: isBetterStage ? stageNum : currentStats.bestStageNum,
    bestStage: isBetterStage
      ? (stageNum > 0 ? `${stageNum} Harfli Etap` : 'Hiçbiri')
      : currentStats.bestStage,
  }

  setStats(updatedStats)

  // En yüksek skor kontrolü
  const currentHigh = getHighScore()
  if (finalScore > currentHigh) {
    setHighScore(finalScore)
  }

  return updatedStats
}

/**
 * En yüksek skoru ve istatistikleri sıfırlar.
 */
export function resetHighScore(): void {
  try {
    localStorage.removeItem(HIGH_SCORE_KEY)
    localStorage.removeItem(STATS_KEY)
  } catch {
    // Sessizce geç
  }
}

// ─── LİNGO v2 Seviye Rekorları ve İstatistikleri (SPEC-v2 5 & 5.1) ──────────

const DEFAULT_LEVEL_RECORDS: LevelRecords = {
  kolay: 0,
  orta: 0,
  zor: 0,
}

const DEFAULT_LEVEL_STATS_ITEM: LevelStatsItem = {
  gamesPlayed: 0,
  bestStage: 'Hiçbiri',
  bestStageNum: 0,
}

const DEFAULT_LEVEL_STATS: LevelStats = {
  kolay: { ...DEFAULT_LEVEL_STATS_ITEM },
  orta: { ...DEFAULT_LEVEL_STATS_ITEM },
  zor: { ...DEFAULT_LEVEL_STATS_ITEM },
}

export function getLevelRecords(): LevelRecords {
  try {
    const val = localStorage.getItem(V2_RECORDS_KEY)
    if (val) {
      const parsed = JSON.parse(val)
      return {
        kolay: Number(parsed.kolay) || 0,
        orta: Number(parsed.orta) || 0,
        zor: Number(parsed.zor) || 0,
      }
    }
  } catch {
    // Geçersiz veri
  }
  return { ...DEFAULT_LEVEL_RECORDS }
}

export function setLevelRecord(level: GameLevel, score: number): void {
  try {
    const records = getLevelRecords()
    records[level] = Math.max(records[level], Math.max(0, Math.floor(score)))
    localStorage.setItem(V2_RECORDS_KEY, JSON.stringify(records))
  } catch {
    // Sessizce geç
  }
}

export function getLevelStats(): LevelStats {
  try {
    const val = localStorage.getItem(V2_STATS_KEY)
    if (val) {
      const parsed = JSON.parse(val)
      return {
        kolay: {
          gamesPlayed: Number(parsed.kolay?.gamesPlayed) || 0,
          bestStage: typeof parsed.kolay?.bestStage === 'string' ? parsed.kolay.bestStage : 'Hiçbiri',
          bestStageNum: Number(parsed.kolay?.bestStageNum) || 0,
        },
        orta: {
          gamesPlayed: Number(parsed.orta?.gamesPlayed) || 0,
          bestStage: typeof parsed.orta?.bestStage === 'string' ? parsed.orta.bestStage : 'Hiçbiri',
          bestStageNum: Number(parsed.orta?.bestStageNum) || 0,
        },
        zor: {
          gamesPlayed: Number(parsed.zor?.gamesPlayed) || 0,
          bestStage: typeof parsed.zor?.bestStage === 'string' ? parsed.zor.bestStage : 'Hiçbiri',
          bestStageNum: Number(parsed.zor?.bestStageNum) || 0,
        },
      }
    }
  } catch {
    // Geçersiz veri
  }
  return {
    kolay: { ...DEFAULT_LEVEL_STATS.kolay },
    orta: { ...DEFAULT_LEVEL_STATS.orta },
    zor: { ...DEFAULT_LEVEL_STATS.zor },
  }
}

export function setLevelStats(stats: LevelStats): void {
  try {
    localStorage.setItem(V2_STATS_KEY, JSON.stringify(stats))
  } catch {
    // Sessizce geç
  }
}

/**
 * Belirli bir seviyede biten oyun sonucunu kaydeder.
 * SPEC-v2 Bölüm 5: Rekor sadece oynanan seviyeyle karşılaştırılır.
 */
export function recordLevelGameResult(
  level: GameLevel,
  finalScore: number,
  lastCompletedStage: number | null
): { isNewRecord: boolean; currentRecord: number; stats: LevelStats } {
  const records = getLevelRecords()
  const previousRecord = records[level]
  const isNewRecord = finalScore > 0 && finalScore > previousRecord

  if (isNewRecord) {
    records[level] = finalScore
    try {
      localStorage.setItem(V2_RECORDS_KEY, JSON.stringify(records))
    } catch {}
  }

  const allStats = getLevelStats()
  const currentLevelStats = allStats[level]
  const stageNum = lastCompletedStage ?? 0
  const isBetterStage = stageNum > currentLevelStats.bestStageNum

  allStats[level] = {
    gamesPlayed: currentLevelStats.gamesPlayed + 1,
    bestStageNum: isBetterStage ? stageNum : currentLevelStats.bestStageNum,
    bestStage: isBetterStage
      ? (stageNum > 0 ? `${stageNum} Harfli Etap` : 'Hiçbiri')
      : currentLevelStats.bestStage,
  }

  setLevelStats(allStats)

  // v1 geriye dönük uyumluluk: zor seviyesinde oynanmışsa eski anahtarlara da yansıt
  if (level === 'zor') {
    try {
      if (finalScore > getHighScore()) {
        setHighScore(finalScore)
      }
      setStats({
        gamesPlayed: allStats.zor.gamesPlayed,
        bestStage: allStats.zor.bestStage,
        bestStageNum: allStats.zor.bestStageNum,
      })
    } catch {}
  }

  return {
    isNewRecord,
    currentRecord: Math.max(previousRecord, finalScore),
    stats: allStats,
  }
}

/**
 * 3 seviyenin de rekorlarını ve istatistiklerini sıfırlar.
 */
export function resetLevelRecords(): void {
  try {
    localStorage.removeItem(V2_RECORDS_KEY)
    localStorage.removeItem(V2_STATS_KEY)
    localStorage.removeItem(HIGH_SCORE_KEY)
    localStorage.removeItem(STATS_KEY)
  } catch {
    // Sessizce geç
  }
}

/**
 * v1 verilerini tek seferlik ve idempotent olarak v2'ye taşır (SPEC-v2 Bölüm 5.1).
 * Eski be:highscore ve be:stats değerleri Zor seviyesi olarak kopyalanır.
 * Eski anahtarlar bozulmaz/silinmez. be:settings aynen kalır.
 */
export function migrateV1ToV2(): boolean {
  try {
    const rawHigh = localStorage.getItem(HIGH_SCORE_KEY)
    const rawStats = localStorage.getItem(STATS_KEY)

    if (!rawHigh && !rawStats) {
      return false
    }

    const currentRecords = getLevelRecords()
    let recordsUpdated = false

    if (rawHigh) {
      const v1High = Number(rawHigh)
      if (Number.isFinite(v1High) && v1High > currentRecords.zor) {
        currentRecords.zor = Math.floor(v1High)
        recordsUpdated = true
      }
    }

    if (recordsUpdated || !localStorage.getItem(V2_RECORDS_KEY)) {
      localStorage.setItem(V2_RECORDS_KEY, JSON.stringify(currentRecords))
    }

    const currentStats = getLevelStats()
    let statsUpdated = false

    if (rawStats) {
      try {
        const v1Stats = JSON.parse(rawStats)
        const v1Played = Number(v1Stats.gamesPlayed) || 0
        const v1StageNum = Number(v1Stats.bestStageNum) || 0
        const v1Stage = typeof v1Stats.bestStage === 'string' ? v1Stats.bestStage : 'Hiçbiri'

        if (v1Played > currentStats.zor.gamesPlayed || v1StageNum > currentStats.zor.bestStageNum) {
          currentStats.zor = {
            gamesPlayed: Math.max(currentStats.zor.gamesPlayed, v1Played),
            bestStageNum: Math.max(currentStats.zor.bestStageNum, v1StageNum),
            bestStage: v1StageNum >= currentStats.zor.bestStageNum ? v1Stage : currentStats.zor.bestStage,
          }
          statsUpdated = true
        }
      } catch {}
    }

    if (statsUpdated || !localStorage.getItem(V2_STATS_KEY)) {
      localStorage.setItem(V2_STATS_KEY, JSON.stringify(currentStats))
    }

    return true
  } catch {
    return false
  }
}

// ─── Geliştirici Araçları (DEV) ───────────────────────────────────────

/**
 * DEV simülasyonu: v1 rekorunu (varsayılan 12.345) simüle eder.
 */
export function devSimulateV1Record(score = 12345): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score))
    localStorage.setItem(
      STATS_KEY,
      JSON.stringify({
        gamesPlayed: 42,
        bestStage: '6 Harfli Etap',
        bestStageNum: 6,
      })
    )
  } catch {}
}

/**
 * DEV simülasyonu: Taşımayı yeniden tetikler.
 */
export function devRerunMigration(): boolean {
  return migrateV1ToV2()
}
