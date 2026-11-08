/**
 * Web tarayıcısı için kelime ve seviye verisi yükleyicisi
 * public/data/ dizininden JSON dosyalarını fetch ile çeker ve WordRepository oluşturur.
 *
 * SPEC 2.1-5: bonus-8.json yalnızca gerektiğinde (lazy) yüklenir.
 * SPEC-v2 4.6: levels-*.json dosyaları Kolay veya Orta seçilirse lazy yüklenir.
 * Zor seviyede yüklenmesine gerek yoktur.
 */

import { createWordRepository, type WordRepository, type BonusWordItem } from './words'
import type { GameLevel, LevelData } from './levels'

let cachedRepo: WordRepository | null = null
let bonusLoaded = false
const loadedLevelLengths = new Set<number>()

export async function loadWordRepository(): Promise<WordRepository> {
  if (cachedRepo) return cachedRepo

  const [words4, words5, words6, words7] = await Promise.all([
    fetch('/data/words-4.json').then(r => r.json() as Promise<string[]>),
    fetch('/data/words-5.json').then(r => r.json() as Promise<string[]>),
    fetch('/data/words-6.json').then(r => r.json() as Promise<string[]>),
    fetch('/data/words-7.json').then(r => r.json() as Promise<string[]>),
  ])

  cachedRepo = createWordRepository({
    words4,
    words5,
    words6,
    words7,
  })

  return cachedRepo
}

/**
 * Bonus kelimelerini lazy olarak yükler.
 * SPEC: bonus-8.json sadece bonusa gelince yüklensin.
 */
export async function ensureBonusLoaded(repo: WordRepository): Promise<void> {
  if (bonusLoaded) return

  const bonus8 = await fetch('/data/bonus-8.json')
    .then(r => r.json() as Promise<BonusWordItem[]>)

  repo.loadBonusWords?.(bonus8)
  bonusLoaded = true
}

/**
 * Seviye verilerini (levels-4..7.json) lazy olarak yükler.
 * SPEC-v2 4.6 & M4 Düzeltmesi: Seçilen seviye Kolay veya Orta ise oyun başlarken yüklenir.
 * Zor seviyede yüklenmesine gerek yoktur.
 * Dosyalar yüklenemezse (404, ağ hatası vb.) hata fırlatılır; böylece arayüz yükleme hatası ekranı gösterir.
 */
export async function ensureLevelsLoaded(
  repo: WordRepository,
  level: GameLevel,
  lengths: number[] = [4, 5, 6, 7]
): Promise<void> {
  if (level === 'zor') return

  const toFetch = lengths.filter(len => !loadedLevelLengths.has(len))
  if (toFetch.length === 0) return

  await Promise.all(
    toFetch.map(async len => {
      const res = await fetch(`/data/levels-${len}.json`)
      if (!res.ok) {
        throw new Error(`levels-${len}.json yüklenemedi (HTTP ${res.status})`)
      }
      const data = (await res.json()) as LevelData
      repo.loadLevelData?.(len, data)
      loadedLevelLengths.add(len)
    })
  )
}

/**
 * Bonus seviye verisini (levels-8.json) lazy olarak yükler.
 * Yüklenemezse hata fırlatır.
 */
export async function ensureBonusLevelLoaded(
  repo: WordRepository,
  level: GameLevel
): Promise<void> {
  if (level === 'zor') return
  if (loadedLevelLengths.has(8)) return

  const res = await fetch('/data/levels-8.json')
  if (!res.ok) {
    throw new Error(`levels-8.json yüklenemedi (HTTP ${res.status})`)
  }
  const data = (await res.json()) as LevelData
  repo.loadLevelData?.(8, data)
  loadedLevelLengths.add(8)
}

/** Testler için yükleme önbelleğini sıfırlar */
export function _resetLoaderCache(): void {
  cachedRepo = null
  bonusLoaded = false
  loadedLevelLengths.clear()
}
