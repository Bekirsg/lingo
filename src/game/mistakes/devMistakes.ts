/**
 * LİNGO v2 — Hatalarımla Çalış: Geliştirici Modu Örnek Veri Üreteci (DEV only)
 * SPEC-v2 Bölüm 6.5 & 12/V2-M8
 */

import { loadAnalytics, saveAnalytics } from '../../analytics/storage'
import { loadStudyData, saveStudyData } from './studyStorage'

/**
 * Havuzdaki GERÇEK kelimelerden ~15 kelimeyi missedWords'e ve bir kısmını streak=1 olarak ekler.
 * Bu sayede tek doğru cevapla 2. doğruya ulaşıp öğrenilme akışı test edilebilir.
 */
export function generateMistakesDevData(): void {
  const analytics = loadAnalytics()
  const study = loadStudyData()
  const now = Date.now()

  // Gerçek sözlük kelimeleri: 4, 5, 6, 7 harfli ve bonus (8 harfli) tanımlı kelimeler
  const sampleWords = [
    // 4 Harf
    { word: 'kale', y: 3, c: 1, streak: 1 },
    { word: 'elma', y: 2, c: 0, streak: 0 },
    { word: 'kedi', y: 1, c: 2, streak: 1 },
    // 5 Harf
    { word: 'kalem', y: 4, c: 2, streak: 1 },
    { word: 'kitap', y: 1, c: 1, streak: 0 },
    { word: 'çilek', y: 2, c: 3, streak: 1 },
    // 6 Harf
    { word: 'karpuz', y: 5, c: 2, streak: 0 },
    { word: 'gözlük', y: 2, c: 1, streak: 1 },
    { word: 'yaprak', y: 3, c: 0, streak: 0 },
    // 7 Harf
    { word: 'pencere', y: 2, c: 4, streak: 1 },
    { word: 'kelebek', y: 4, c: 1, streak: 0 },
    { word: 'makarna', y: 1, c: 2, streak: 1 },
    // Bonus (8 Harfli, bonus-8.json'da tanımlı gerçek kelimeler)
    { word: 'apartman', y: 3, c: 1, streak: 1 },
    { word: 'bisiklet', y: 2, c: 2, streak: 0 },
    { word: 'çikolata', y: 1, c: 1, streak: 1 },
  ]

  for (const item of sampleWords) {
    analytics.missedWords[item.word] = {
      y: item.y,
      c: item.c,
      last: now,
    }

    if (item.streak > 0) {
      study.streak[item.word] = item.streak
    } else {
      delete study.streak[item.word]
    }

    // Başlangıçta öğrenilmiş olmasın ki çalışılabilsin
    delete study.learned[item.word]
  }

  saveAnalytics(analytics)
  saveStudyData(study)
}
