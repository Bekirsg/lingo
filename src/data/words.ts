/**
 * Kelime yükleyicisi
 * public/data/ dizinindeki JSON dosyalarını yükler ve Set tabanlı O(1) arama sunar.
 * v2: Seviye sistemi entegrasyonu (Kolay, Orta, Zor).
 */

import type { GameLevel, LevelData, PickWordResult, PickBonusResult } from './levels'
import { pickWordWithFallback, pickBonusWordWithFallback } from './levels'

export interface BonusWordItem {
  w: string
  d: string
}

export interface WordRepository {
  /** Harf sayısına göre tüm kelimeler */
  getWords(length: number): string[]
  /** Kelime geçerli mi (sözlükte var mı)? O(1) Set araması */
  isValidWord(word: string, length: number): boolean
  /** Bonus kelimeler (8 harfli + tanım) — lazy yüklenir */
  getBonusWords(): BonusWordItem[]
  /** Bonus verisini sonradan yükler (lazy) */
  loadBonusWords?(items: BonusWordItem[]): void

  /** Seviye verisini getirir (yüklüyse) */
  getLevelData?(length: number): LevelData | null
  /** Seviye verisini yükler (lazy) */
  loadLevelData?(length: number, data: LevelData): void
  /** Seviyeye ve yedek kurala göre kelime seçer */
  pickWordByLevel?(length: number, level: GameLevel, usedWords: Set<string>): PickWordResult | null
  /** Seviyeye ve yedek kurala göre bonus kelimesi seçer */
  pickBonusWordByLevel?(level: GameLevel, usedWords: Set<string>): PickBonusResult | null
}

/** Bellek içi kelime deposu oluşturur */
export function createWordRepository(data: {
  words4: string[]
  words5: string[]
  words6: string[]
  words7: string[]
  bonus?: BonusWordItem[]
  bonus8?: BonusWordItem[]
  levels?: Record<number, LevelData>
}): WordRepository {
  const pools: Record<number, string[]> = {
    4: data.words4,
    5: data.words5,
    6: data.words6,
    7: data.words7,
  }

  const sets: Record<number, Set<string>> = {
    4: new Set(data.words4),
    5: new Set(data.words5),
    6: new Set(data.words6),
    7: new Set(data.words7),
  }

  let bonusData: BonusWordItem[] = data.bonus ?? data.bonus8 ?? []
  const levelsData: Record<number, LevelData> = data.levels ? { ...data.levels } : {}

  return {
    getWords(length: number): string[] {
      return pools[length] ?? []
    },
    isValidWord(word: string, length: number): boolean {
      const set = sets[length]
      return set ? set.has(word) : false
    },
    getBonusWords(): BonusWordItem[] {
      return bonusData
    },
    loadBonusWords(items: BonusWordItem[]): void {
      bonusData = items
    },
    getLevelData(length: number): LevelData | null {
      return levelsData[length] ?? null
    },
    loadLevelData(length: number, data: LevelData): void {
      levelsData[length] = data
    },
    pickWordByLevel(length: number, level: GameLevel, usedWords: Set<string>): PickWordResult | null {
      const allWords = pools[length] ?? []
      const levelData = levelsData[length] ?? null
      return pickWordWithFallback(allWords, levelData, level, usedWords)
    },
    pickBonusWordByLevel(level: GameLevel, usedWords: Set<string>): PickBonusResult | null {
      const levelData = levelsData[8] ?? null
      return pickBonusWordWithFallback(bonusData, levelData, level, usedWords)
    },
  }
}
