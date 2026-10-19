/**
 * Kelime yükleyicisi
 * public/data/ dizinindeki JSON dosyalarını yükler ve Set tabanlı O(1) arama sunar.
 */

export interface BonusWordItem {
  w: string
  d: string
}

export interface WordRepository {
  /** Harf sayısına göre tüm kelimeler */
  getWords(length: number): string[]
  /** Kelime geçerli mi (sözlükte var mı)? O(1) Set araması */
  isValidWord(word: string, length: number): boolean
  /** Bonus kelimeler (8 harfli + tanım) */
  getBonusWords(): BonusWordItem[]
}

/** Bellek içi kelime deposu oluşturur */
export function createWordRepository(data: {
  words4: string[]
  words5: string[]
  words6: string[]
  words7: string[]
  bonus8: BonusWordItem[]
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

  return {
    getWords(length: number): string[] {
      return pools[length] ?? []
    },
    isValidWord(word: string, length: number): boolean {
      const set = sets[length]
      return set ? set.has(word) : false
    },
    getBonusWords(): BonusWordItem[] {
      return data.bonus8
    },
  }
}
