/**
 * LİNGO v2 — Test Fixtures (Sahte Seviye Verisi)
 * SPEC-v2 Bölüm 4.5: Sahte örnek tests/fixtures/ altında tutulur, public/ altına girmez.
 */

import type { LevelData } from '../../src/data/levels'
import type { BonusWordItem } from '../../src/data/words'

export const SAMPLE_LEVELS_4: LevelData = {
  kolay: ['ayak', 'elma', 'kedi', 'masa', 'okul', 'para'],
  orta: ['adak', 'boru', 'caba', 'dere', 'gece', 'hata'],
}

export const SAMPLE_LEVELS_5: LevelData = {
  kolay: ['araba', 'bahçe', 'çocuk', 'ekmek', 'güneş', 'kitap'],
  orta: ['baskı', 'ceviz', 'diken', 'fener', 'görev', 'hızlı'],
}

export const SAMPLE_LEVELS_6: LevelData = {
  kolay: ['doktor', 'gazete', 'karpuz', 'meyve', 'otobüs'],
  orta: ['bakkal', 'cetvel', 'destan', 'fırtına', 'rehber'],
}

export const SAMPLE_LEVELS_7: LevelData = {
  kolay: ['arkadaş', 'hastane', 'öğrenci', 'patates', 'telefon'],
  orta: ['biberon', 'çikolata', 'fabrika', 'karınca', 'lokanta'],
}

export const SAMPLE_LEVELS_8: LevelData = {
  kolay: ['apartman', 'bisiklet'],
  orta: ['ameliyat', 'coğrafya'],
}

export const SAMPLE_BONUS_WORDS: BonusWordItem[] = [
  { w: 'apartman', d: 'Birkaç katlı yapı' },
  { w: 'bisiklet', d: 'Tekerlekli binek aracı' },
  { w: 'ameliyat', d: 'Cerrahi operasyon' },
  { w: 'coğrafya', d: 'Yeryüzünü inceleyen bilim' },
  { w: 'antifriz', d: 'Donmayı önleyen kimyasal sıvı' },
  { w: 'antrasit', d: 'Bir tür taş kömürü' },
]

export const SAMPLE_LEVELS_BY_LENGTH: Record<number, LevelData> = {
  4: SAMPLE_LEVELS_4,
  5: SAMPLE_LEVELS_5,
  6: SAMPLE_LEVELS_6,
  7: SAMPLE_LEVELS_7,
  8: SAMPLE_LEVELS_8,
}
