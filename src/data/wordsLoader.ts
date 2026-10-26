/**
 * Web tarayıcısı için kelime verisi yükleyicisi
 * public/data/ dizininden JSON dosyalarını fetch ile çeker ve WordRepository oluşturur.
 *
 * SPEC 2.1-5: bonus-8.json yalnızca gerektiğinde (lazy) yüklenir.
 */

import { createWordRepository, type WordRepository, type BonusWordItem } from './words'

let cachedRepo: WordRepository | null = null
let bonusLoaded = false

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
