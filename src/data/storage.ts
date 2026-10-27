/**
 * BEKİR-EREN Yerel Veri Yönetimi (localStorage)
 *
 * SPEC Bölüm 8:
 * - be:highscore -> En yüksek final skor
 * - be:stats -> Oynanan oyun sayısı, en iyi etap (basit istatistik)
 * - be:settings -> { sound: boolean, haptics: boolean }
 *
 * Tüm okuma/yazmalar try/catch ile korunur ve sessizce varsayılan döner.
 */

export const HIGH_SCORE_KEY = 'be:highscore'
export const STATS_KEY = 'be:stats'
export const SETTINGS_KEY = 'be:settings'

export interface SettingsData {
  sound: boolean
  haptics: boolean
}

export interface GameStats {
  gamesPlayed: number
  bestStage: string // örn. "7 Harfli Etap" veya "Hiçbiri"
  bestStageNum: number // 0 (hiçbiri), 4, 5, 6, 7
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
}

export function getSettings(): SettingsData {
  try {
    const val = localStorage.getItem(SETTINGS_KEY)
    if (val) {
      const parsed = JSON.parse(val)
      return {
        sound: typeof parsed.sound === 'boolean' ? parsed.sound : DEFAULT_SETTINGS.sound,
        haptics: typeof parsed.haptics === 'boolean' ? parsed.haptics : DEFAULT_SETTINGS.haptics,
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
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
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
