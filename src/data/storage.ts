/** localStorage ile en yüksek skoru okur/yazar. Hata durumunda sessizce 0 döner. */

const HIGH_SCORE_KEY = 'be:highscore'
const STATS_KEY = 'be:stats'

export interface GameStats {
  gamesPlayed: number
  bestStage: string // örn. "7 harfli" veya "Hiçbiri"
}

export function getHighScore(): number {
  try {
    const val = localStorage.getItem(HIGH_SCORE_KEY)
    return val ? Number(val) : 0
  } catch {
    return 0
  }
}

export function setHighScore(score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score))
  } catch {
    // Storage dolu veya erişilemez — sessizce geç
  }
}

export function getStats(): GameStats {
  try {
    const val = localStorage.getItem(STATS_KEY)
    if (val) return JSON.parse(val)
  } catch {
    // geçersiz veri
  }
  return { gamesPlayed: 0, bestStage: 'Hiçbiri' }
}

export function setStats(stats: GameStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {
    // sessizce geç
  }
}

export function resetHighScore(): void {
  try {
    localStorage.removeItem(HIGH_SCORE_KEY)
    localStorage.removeItem(STATS_KEY)
  } catch {
    // sessizce geç
  }
}
