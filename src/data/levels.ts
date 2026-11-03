/**
 * LİNGO v2 — Seviye Sistemi (Level System)
 *
 * SPEC-v2 Bölüm 4:
 * - 3 Seviye: Kolay (A1–A2), Orta (A1–B2, Kolay'ı kapsar), Zor (Tüm TDK kelimeleri)
 * - Havuz tanımı (iç içe seviyeler):
 *   - havuz(Kolay) = "kolay"
 *   - havuz(Orta) = "kolay" ∪ "orta"
 *   - havuz(Zor) = tüm TDK kelimeleri
 * - Yedek Kural (Fallback Rule):
 *   - Seçilen seviyede kullanılmamış kelime kalmadıysa bir üst seviyeye geçer (Kolay -> Orta -> Zor).
 * - "levels yok" davranışı:
 *   - Seviye dosyaları yoksa tüm kelimeler zor sayılır, console.warn ile uyarılır.
 */

import type { BonusWordItem } from './words'

export type GameLevel = 'kolay' | 'orta' | 'zor'

export interface LevelData {
  kolay: string[]
  orta: string[]
}

export interface PickWordResult {
  word: string
  fromLevel: GameLevel
}

export interface PickBonusResult {
  word: string
  definition: string
  fromLevel: GameLevel
}

/**
 * Seviye string'ini güvenli bir şekilde GameLevel türüne dönüştürür.
 * 'k' | 'kolay' -> 'kolay'
 * 'o' | 'orta'  -> 'orta'
 * 'z' | 'zor'   -> 'zor'
 */
export function parseGameLevel(raw: string): GameLevel | null {
  const s = raw.trim().toLocaleLowerCase('tr-TR')
  if (s === 'kolay' || s === 'k') return 'kolay'
  if (s === 'orta' || s === 'o') return 'orta'
  if (s === 'zor' || s === 'z') return 'zor'
  return null
}

let hasWarnedMissingLevels = false

/**
 * Belirli bir harf sayısı ve seviye için kullanılabilir kelime havuzunu döner.
 * SPEC-v2 Bölüm 4.1
 */
export function getWordPool(
  allWords: string[],
  levelData: LevelData | null | undefined,
  level: GameLevel
): string[] {
  if (level === 'zor') {
    return allWords
  }

  if (!levelData) {
    if (!hasWarnedMissingLevels) {
      console.warn('[LİNGO v2] Seviye verisi (levels) bulunamadı. Zor havuzuna geçiliyor.')
      hasWarnedMissingLevels = true
    }
    return allWords
  }

  if (level === 'kolay') {
    return levelData.kolay
  }

  // Orta havuzu = kolay ∪ orta
  const ortaSet = new Set(levelData.kolay)
  for (const w of levelData.orta) {
    ortaSet.add(w)
  }
  return Array.from(ortaSet)
}

/**
 * Seviyeye ve SPEC-v2 Bölüm 4.3 Yedek Kuralı'na göre rastgele kelime seçer.
 *
 * Akış:
 * - 'kolay':
 *    1) Kolay havuzundan kullanılmamış kelime ara
 *    2) Yoksa Orta havuzundan kullanılmamış kelime ara
 *    3) Yoksa Zor (tüm kelimeler) havuzundan kullanılmamış kelime ara
 * - 'orta':
 *    1) (Kolay ∪ Orta) havuzundan kullanılmamış kelime ara
 *    2) Yoksa Zor havuzundan kullanılmamış kelime ara
 * - 'zor':
 *    1) Tüm kelimeler havuzundan kullanılmamış kelime ara
 *
 * @param allWords O uzunluktaki tüm TDK kelimeleri
 * @param levelData Seviye verisi ({ kolay, orta }) veya null
 * @param level İstenen seviye
 * @param usedWords Bu oyunda kullanılmış kelimeler kümesi
 * @returns Seçilen kelime ve hangi seviyeden geldiği, veya havuz tamamen tükenmişse null
 */
export function pickWordWithFallback(
  allWords: string[],
  levelData: LevelData | null | undefined,
  level: GameLevel,
  usedWords: Set<string>
): PickWordResult | null {
  // 1. levels verisi yoksa veya level zor ise doğrudan allWords kullan
  if (!levelData || level === 'zor') {
    if (!levelData && level !== 'zor' && !hasWarnedMissingLevels) {
      console.warn('[LİNGO v2] Seviye verisi (levels) bulunamadı. Zor havuzuna geçiliyor.')
      hasWarnedMissingLevels = true
    }
    const available = allWords.filter(w => !usedWords.has(w))
    if (available.length === 0) return null
    const idx = Math.floor(Math.random() * available.length)
    return { word: available[idx], fromLevel: 'zor' }
  }

  const kolayWords = levelData.kolay
  const ortaWords = levelData.orta

  if (level === 'kolay') {
    // 1) Kolay dene
    const availKolay = kolayWords.filter(w => !usedWords.has(w))
    if (availKolay.length > 0) {
      const idx = Math.floor(Math.random() * availKolay.length)
      return { word: availKolay[idx], fromLevel: 'kolay' }
    }

    // 2) Yedek: Orta dene
    const availOrta = ortaWords.filter(w => !usedWords.has(w))
    if (availOrta.length > 0) {
      const idx = Math.floor(Math.random() * availOrta.length)
      return { word: availOrta[idx], fromLevel: 'orta' }
    }

    // 3) Yedek: Zor (tüm liste) dene
    const availZor = allWords.filter(w => !usedWords.has(w))
    if (availZor.length > 0) {
      const idx = Math.floor(Math.random() * availZor.length)
      return { word: availZor[idx], fromLevel: 'zor' }
    }

    return null
  }

  if (level === 'orta') {
    // 1) Kolay ∪ Orta dene
    const combinedSet = new Set(kolayWords)
    for (const w of ortaWords) {
      combinedSet.add(w)
    }
    const availCombined = Array.from(combinedSet).filter(w => !usedWords.has(w))
    if (availCombined.length > 0) {
      const idx = Math.floor(Math.random() * availCombined.length)
      return { word: availCombined[idx], fromLevel: 'orta' }
    }

    // 2) Yedek: Zor dene
    const availZor = allWords.filter(w => !usedWords.has(w))
    if (availZor.length > 0) {
      const idx = Math.floor(Math.random() * availZor.length)
      return { word: availZor[idx], fromLevel: 'zor' }
    }

    return null
  }

  return null
}

/**
 * Bonus sorusu (8 harfli + tanımlı) için seviyeye ve yedek kurala göre kelime seçer.
 *
 * @param bonusItems Tüm bonus kelimeleri listesi
 * @param levelData 8 harfli bonus seviye verisi ({ kolay, orta }) veya null
 * @param level İstenen seviye
 * @param usedWords Kullanılmış kelimeler kümesi
 */
export function pickBonusWordWithFallback(
  bonusItems: BonusWordItem[],
  levelData: LevelData | null | undefined,
  level: GameLevel,
  usedWords: Set<string>
): PickBonusResult | null {
  // 1. levels verisi yoksa veya level zor ise tüm bonus items arasından seç
  if (!levelData || level === 'zor') {
    if (!levelData && level !== 'zor' && !hasWarnedMissingLevels) {
      console.warn('[LİNGO v2] Bonus seviye verisi bulunamadı. Zor havuzuna geçiliyor.')
      hasWarnedMissingLevels = true
    }
    const available = bonusItems.filter(item => !usedWords.has(item.w))
    if (available.length === 0) return null
    const idx = Math.floor(Math.random() * available.length)
    const picked = available[idx]
    return { word: picked.w, definition: picked.d, fromLevel: 'zor' }
  }

  const kolaySet = new Set(levelData.kolay)
  const ortaSet = new Set(levelData.orta)

  if (level === 'kolay') {
    // 1) Kolay
    const availKolay = bonusItems.filter(item => kolaySet.has(item.w) && !usedWords.has(item.w))
    if (availKolay.length > 0) {
      const idx = Math.floor(Math.random() * availKolay.length)
      const picked = availKolay[idx]
      return { word: picked.w, definition: picked.d, fromLevel: 'kolay' }
    }

    // 2) Yedek: Orta
    const availOrta = bonusItems.filter(item => ortaSet.has(item.w) && !usedWords.has(item.w))
    if (availOrta.length > 0) {
      const idx = Math.floor(Math.random() * availOrta.length)
      const picked = availOrta[idx]
      return { word: picked.w, definition: picked.d, fromLevel: 'orta' }
    }

    // 3) Yedek: Zor (tüm bonus havuzu)
    const availZor = bonusItems.filter(item => !usedWords.has(item.w))
    if (availZor.length > 0) {
      const idx = Math.floor(Math.random() * availZor.length)
      const picked = availZor[idx]
      return { word: picked.w, definition: picked.d, fromLevel: 'zor' }
    }

    return null
  }

  if (level === 'orta') {
    // 1) Kolay ∪ Orta
    const availCombined = bonusItems.filter(
      item => (kolaySet.has(item.w) || ortaSet.has(item.w)) && !usedWords.has(item.w)
    )
    if (availCombined.length > 0) {
      const idx = Math.floor(Math.random() * availCombined.length)
      const picked = availCombined[idx]
      return { word: picked.w, definition: picked.d, fromLevel: 'orta' }
    }

    // 2) Yedek: Zor
    const availZor = bonusItems.filter(item => !usedWords.has(item.w))
    if (availZor.length > 0) {
      const idx = Math.floor(Math.random() * availZor.length)
      const picked = availZor[idx]
      return { word: picked.w, definition: picked.d, fromLevel: 'zor' }
    }

    return null
  }

  return null
}

/** Testler için uyarı durumunu sıfırlar */
export function _resetLevelWarning(): void {
  hasWarnedMissingLevels = false
}
