/**
 * Web tarayıcısı için kelime verisi yükleyicisi
 * public/data/ dizininden JSON dosyalarını fetch ile çeker ve WordRepository oluşturur.
 */

import { createWordRepository, type WordRepository, type BonusWordItem } from './words'

let cachedRepo: WordRepository | null = null

export async function loadWordRepository(): Promise<WordRepository> {
  if (cachedRepo) return cachedRepo

  const [words4, words5, words6, words7, bonus8] = await Promise.all([
    fetch('/data/words-4.json').then(r => r.json() as Promise<string[]>),
    fetch('/data/words-5.json').then(r => r.json() as Promise<string[]>),
    fetch('/data/words-6.json').then(r => r.json() as Promise<string[]>),
    fetch('/data/words-7.json').then(r => r.json() as Promise<string[]>),
    fetch('/data/bonus-8.json').then(r => r.json() as Promise<BonusWordItem[]>),
  ])

  cachedRepo = createWordRepository({
    words4,
    words5,
    words6,
    words7,
    bonus8,
  })

  return cachedRepo
}
