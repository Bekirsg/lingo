/**
 * LİNGO v2 — 7 Harfli Kelime Listesi ve Seviye Doğrulayıcı
 * 
 * SPEC-v2 ve docs/KELIME-REVIZYON-PLANI.md standardına uygun olarak:
 * - words-7.json uzunluk, Türkçe alfabe ve TDK geçerliliği
 * - levels-7.json şema, ayrıklık ve havuz minimumları
 * - 40 Kolay + 40 Orta + 40 Zor sağduyu (sanity) seti doğrulaması
 * - Kabul testi (level-acceptance) kritik kelimeleri doğrulaması
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '../..')

// Sağduyu (Sanity) Seti (40 Kolay, 40 Orta, 40 Zor)
const SANITY_WORDS_7 = {
  kolay: [
    'merhaba', 'arkadaş', 'telefon', 'sevgili', 'güvenli', 'kırmızı', 'yaşamak', 'korumak', 'yiyecek', 'pencere',
    'patates', 'domates', 'makarna', 'ıspanak', 'eldiven', 'tiyatro', 'kolayca', 'rahatça', 'ağlamak', 'anlamak',
    'anlatma', 'bırakma', 'başlama', 'bekleme', 'dinleme', 'istemek', 'oturmak', 'yürümek', 'özlemek', 'yıkamak',
    'oynamak', 'anahtar', 'hastane', 'çalışan', 'gençlik', 'dostluk', 'akılsız', 'öğrenci', 'yumurta', 'konuşma'
  ],
  orta: [
    'ıpıssız', 'ıraklık', 'ısırıcı', 'ısıtıcı', 'ışılama', 'içilmek', 'içlilik', 'iffetli', 'iğrenme', 'iğrenti',
    'ihbarlı', 'ihlaslı', 'ihtilaf', 'ikebana', 'iliksiz', 'ilkesel', 'illegal', 'ilmikli', 'imgesel', 'imrence',
    'imrenti', 'inisyal', 'inkarcı', 'insaflı', 'insansı', 'insülin', 'intihal', 'ipliksi', 'irkinti', 'irticai',
    'ishalli', 'isnaden', 'ispiyon', 'isterik', 'işgalci', 'işitsel', 'işkilli', 'itinalı', 'ivedili', 'ifadeli'
  ],
  zor: [
    'abidevi', 'abramak', 'abuhava', 'afsuncu', 'afsunlu', 'ağızotu', 'ağnamcı', 'ahzüita', 'akbakla', 'akbasma',
    'akilane', 'akliyat', 'albasma', 'alınlık', 'ameliye', 'ananevi', 'anudane', 'aparmak', 'arakiye', 'arifane',
    'arkalıç', 'arpağan', 'artağan', 'arziyat', 'ayakçak', 'ayaktaş', 'ayıkmak', 'aylamak', 'ayniyet', 'azıklık',
    'azimkar', 'bahname', 'bahusus', 'bakanak', 'bakındı', 'balaban', 'barhana', 'barhane', 'bayatsı', 'bedahet'
  ]
}

// TR alfabesi: a b c ç d e f g ğ h ı i j k l m n o ö p r s ş t u ü v y z
const TR_ALPHABET = new Set([
  'a', 'b', 'c', 'ç', 'd', 'e', 'f', 'g', 'ğ', 'h', 'ı', 'i', 'j', 'k', 'l',
  'm', 'n', 'o', 'ö', 'p', 'r', 's', 'ş', 't', 'u', 'ü', 'v', 'y', 'z'
])

function isValidTR(word: string): boolean {
  return Array.from(word).every(c => TR_ALPHABET.has(c))
}

// JSON dosyalarını yükle
const words7: string[] = JSON.parse(
  readFileSync(resolve(ROOT, 'public/data/words-7.json'), 'utf-8')
)

interface LevelsData {
  kolay: string[]
  orta: string[]
}

const levels7: LevelsData = JSON.parse(
  readFileSync(resolve(ROOT, 'public/data/levels-7.json'), 'utf-8')
)

const tdk7harf: { count: number; words: string[] } = JSON.parse(
  readFileSync(resolve(ROOT, 'data-src/tdk-7harf.json'), 'utf-8')
)
const tdkSet = new Set(tdk7harf.words)

const kolaySet = new Set(levels7.kolay)
const ortaSet = new Set(levels7.orta)

function getLevel(w: string): 'kolay' | 'orta' | 'zor' {
  if (kolaySet.has(w)) return 'kolay'
  if (ortaSet.has(w)) return 'orta'
  return 'zor'
}

describe('words-7.json Doğrulama', () => {
  it('tüm kelimeler tam 7 karakter uzunluğunda', () => {
    const invalid = words7.filter(w => Array.from(w).length !== 7)
    expect(invalid, `Uzunluk hatası: ${invalid.join(', ')}`).toHaveLength(0)
  })

  it('tüm kelimeler yalnızca Türkçe alfabesi harflerini içeriyor (q/w/x yok)', () => {
    const invalid = words7.filter(w => !isValidTR(w))
    expect(invalid, `Harf hatası: ${invalid.join(', ')}`).toHaveLength(0)
  })

  it('yinelenen kelime yok', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const w of words7) {
      if (seen.has(w)) dupes.push(w)
      seen.add(w)
    }
    expect(dupes, `Yinelenenler: ${dupes.join(', ')}`).toHaveLength(0)
  })

  it('toplam kelime sayısı 7.500 ile 8.500 arasında (makul aralık)', () => {
    expect(words7.length).toBeGreaterThanOrEqual(7500)
    expect(words7.length).toBeLessThanOrEqual(8500)
  })

  it('tüm kelimeler TDK GTS referansında (tdk-7harf.json) mevcut', () => {
    const notInTdk = words7.filter(w => !tdkSet.has(w))
    expect(notInTdk, `TDK dışı: ${notInTdk.join(', ')}`).toHaveLength(0)
  })
})

describe('levels-7.json Doğrulama', () => {
  it('kolay ve orta listeleri words-7.json içinde mevcut', () => {
    const w7set = new Set(words7)
    const missingKolay = levels7.kolay.filter(w => !w7set.has(w))
    const missingOrta = levels7.orta.filter(w => !w7set.has(w))
    expect(missingKolay, `Kolay listesinde words-7 dışı: ${missingKolay.join(', ')}`).toHaveLength(0)
    expect(missingOrta, `Orta listesinde words-7 dışı: ${missingOrta.join(', ')}`).toHaveLength(0)
  })

  it('kolay ve orta listeleri kesişmiyor (kolay ∩ orta = ∅)', () => {
    const intersection = levels7.orta.filter(w => kolaySet.has(w))
    expect(intersection, `Kolay ∩ Orta kesişimi: ${intersection.join(', ')}`).toHaveLength(0)
  })

  it('kolay listesinde yinelenen kelime yok', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const w of levels7.kolay) {
      if (seen.has(w)) dupes.push(w)
      seen.add(w)
    }
    expect(dupes).toHaveLength(0)
  })

  it('orta listesinde yinelenen kelime yok', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const w of levels7.orta) {
      if (seen.has(w)) dupes.push(w)
      seen.add(w)
    }
    expect(dupes).toHaveLength(0)
  })

  it('tüm seviye kelimeleri TDK referansında mevcut', () => {
    const allLevel = [...levels7.kolay, ...levels7.orta]
    const notInTdk = allLevel.filter(w => !tdkSet.has(w))
    expect(notInTdk, `TDK referansında olmayan: ${notInTdk.join(', ')}`).toHaveLength(0)
  })

  it('kolay listesi en az 2.000 kelime içeriyor (hedef ~%33, min 2.000)', () => {
    expect(levels7.kolay.length).toBeGreaterThanOrEqual(2000)
  })

  it('orta listesi en az 2.000 kelime içeriyor (hedef ~%33, min 2.000)', () => {
    expect(levels7.orta.length).toBeGreaterThanOrEqual(2000)
  })

  it('zor havuzu en az 2.000 kelime içeriyor (hedef ~%34, min 2.000)', () => {
    const zorCount = words7.length - levels7.kolay.length - levels7.orta.length
    expect(zorCount).toBeGreaterThanOrEqual(2000)
  })
})

describe('Sağduyu (Sanity) Seti Doğrulaması (40 Kolay, 40 Orta, 40 Zor)', () => {
  const sanity7 = SANITY_WORDS_7

  it('40 Kolay kelimenin tümü kolay seviyesinde olmalı', () => {
    expect(sanity7.kolay).toHaveLength(40)
    for (const word of sanity7.kolay) {
      expect(getLevel(word), `"${word}" kolay olmalı`).toBe('kolay')
    }
  })

  it('40 Orta kelimenin tümü orta seviyesinde olmalı', () => {
    expect(sanity7.orta).toHaveLength(40)
    for (const word of sanity7.orta) {
      expect(getLevel(word), `"${word}" orta olmalı`).toBe('orta')
    }
  })

  it('40 Zor kelimenin tümü zor seviyesinde olmalı', () => {
    expect(sanity7.zor).toHaveLength(40)
    for (const word of sanity7.zor) {
      expect(getLevel(word), `"${word}" zor olmalı`).toBe('zor')
    }
  })
})

describe('Kabul Testi 7 Harfli Kelimeler Doğrulaması (level-acceptance)', () => {
  it('anahtar kelimesi kolay seviyesinde olmalı', () => {
    expect(getLevel('anahtar')).toBe('kolay')
  })

  it('MUST_BE_AT_LEAST_ORTA 7 harfli kelimeleri kolay veya orta olmalı (mahkeme, hemşire, görüntü)', () => {
    const words = ['mahkeme', 'hemşire', 'görüntü']
    for (const w of words) {
      expect(['kolay', 'orta']).toContain(getLevel(w))
    }
  })
})
