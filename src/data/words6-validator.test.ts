/**
 * LİNGO v2 — 6 Harfli Kelime Listesi ve Seviye Doğrulayıcı
 * 
 * SPEC-v2 ve docs/KELIME-REVIZYON-PLANI.md standardına uygun olarak:
 * - words-6.json uzunluk, Türkçe alfabe ve TDK geçerliliği
 * - levels-6.json şema, ayrıklık ve havuz minimumları
 * - 40 Kolay + 40 Orta + 40 Zor sağduyu (sanity) seti doğrulaması
 * - Kabul testi (level-acceptance) kritik kelimeleri doğrulaması
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '../..')

// Sağduyu (Sanity) Seti (40 Kolay, 40 Orta, 40 Zor)
const SANITY_WORDS_6 = {
  kolay: [
    'bardak', 'mutfak', 'okumak', 'yazmak', 'gitmek', 'gelmek', 'doktor', 'hayvan', 'balkon', 'bilmek',
    'yapmak', 'sevmek', 'koltuk', 'karpuz', 'yaprak', 'cennet', 'peynir', 'otobüs', 'gazete', 'tavşan',
    'maymun', 'kaplan', 'gözlük', 'parmak', 'yastık', 'çarşaf', 'terlik', 'zeytin', 'geçmek', 'kaçmak',
    'durmak', 'koşmak', 'uyumak', 'bakmak', 'bulmak', 'tutmak', 'satmak', 'duymak', 'gülmek', 'kalmak'
  ],
  orta: [
    'ceylan', 'cıvata', 'cızbız', 'cilacı', 'cilalı', 'ciltli', 'çağrım', 'çapacı', 'çapari', 'çardaş',
    'çarpış', 'çatpat', 'çekyat', 'çengel', 'çeteci', 'çımacı', 'çıralı', 'çırçır', 'çırpış', 'çinici',
    'çinili', 'çitili', 'çizili', 'çöpsüz', 'dalsız', 'damacı', 'damsız', 'danslı', 'dansör', 'dansöz',
    'dapdar', 'davudi', 'dazlak', 'değini', 'cumbul', 'curacı', 'çaçaça', 'çapacı', 'depocu', 'denkçi'
  ],
  zor: [
    'tirfil', 'hıltan', 'mağmum', 'çulaki', 'acırak', 'acırga', 'adavet', 'ahacık', 'ahiren', 'akamet',
    'akaret', 'akliye', 'alaçık', 'alatav', 'alaten', 'alımcı', 'anacıl', 'ananat', 'anasıl', 'anasır',
    'apışak', 'apışık', 'armudi', 'arzani', 'asliye', 'asuman', 'aşerat', 'aşiyan', 'atalet', 'atıfet',
    'avarız', 'ayarcı', 'azatlı', 'azimet', 'badehu', 'badema', 'badiye', 'balçak', 'burhan', 'coşkun'
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
const words6: string[] = JSON.parse(
  readFileSync(resolve(ROOT, 'public/data/words-6.json'), 'utf-8')
)

interface LevelsData {
  kolay: string[]
  orta: string[]
}

const levels6: LevelsData = JSON.parse(
  readFileSync(resolve(ROOT, 'public/data/levels-6.json'), 'utf-8')
)

const tdk6harf: { count: number; words: string[] } = JSON.parse(
  readFileSync(resolve(ROOT, 'data-src/tdk-6harf.json'), 'utf-8')
)
const tdkSet = new Set(tdk6harf.words)

const kolaySet = new Set(levels6.kolay)
const ortaSet = new Set(levels6.orta)

function getLevel(w: string): 'kolay' | 'orta' | 'zor' {
  if (kolaySet.has(w)) return 'kolay'
  if (ortaSet.has(w)) return 'orta'
  return 'zor'
}

describe('words-6.json Doğrulama', () => {
  it('tüm kelimeler tam 6 karakter uzunluğunda', () => {
    const invalid = words6.filter(w => Array.from(w).length !== 6)
    expect(invalid, `Uzunluk hatası: ${invalid.join(', ')}`).toHaveLength(0)
  })

  it('tüm kelimeler yalnızca Türkçe alfabesi harflerini içeriyor (q/w/x yok)', () => {
    const invalid = words6.filter(w => !isValidTR(w))
    expect(invalid, `Harf hatası: ${invalid.join(', ')}`).toHaveLength(0)
  })

  it('yinelenen kelime yok', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const w of words6) {
      if (seen.has(w)) dupes.push(w)
      seen.add(w)
    }
    expect(dupes, `Yinelenenler: ${dupes.join(', ')}`).toHaveLength(0)
  })

  it('toplam kelime sayısı 5.500 ile 6.500 arasında (makul aralık)', () => {
    expect(words6.length).toBeGreaterThanOrEqual(5500)
    expect(words6.length).toBeLessThanOrEqual(6500)
  })

  it('tüm kelimeler TDK GTS referansında (tdk-6harf.json) mevcut', () => {
    const notInTdk = words6.filter(w => !tdkSet.has(w))
    expect(notInTdk, `TDK dışı: ${notInTdk.join(', ')}`).toHaveLength(0)
  })
})

describe('levels-6.json Doğrulama', () => {
  it('kolay ve orta listeleri words-6.json içinde mevcut', () => {
    const w6set = new Set(words6)
    const missingKolay = levels6.kolay.filter(w => !w6set.has(w))
    const missingOrta = levels6.orta.filter(w => !w6set.has(w))
    expect(missingKolay, `Kolay listesinde words-6 dışı: ${missingKolay.join(', ')}`).toHaveLength(0)
    expect(missingOrta, `Orta listesinde words-6 dışı: ${missingOrta.join(', ')}`).toHaveLength(0)
  })

  it('kolay ve orta listeleri kesişmiyor (kolay ∩ orta = ∅)', () => {
    const intersection = levels6.orta.filter(w => kolaySet.has(w))
    expect(intersection, `Kolay ∩ Orta kesişimi: ${intersection.join(', ')}`).toHaveLength(0)
  })

  it('kolay listesinde yinelenen kelime yok', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const w of levels6.kolay) {
      if (seen.has(w)) dupes.push(w)
      seen.add(w)
    }
    expect(dupes).toHaveLength(0)
  })

  it('orta listesinde yinelenen kelime yok', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const w of levels6.orta) {
      if (seen.has(w)) dupes.push(w)
      seen.add(w)
    }
    expect(dupes).toHaveLength(0)
  })

  it('tüm seviye kelimeleri TDK referansında mevcut', () => {
    const allLevel = [...levels6.kolay, ...levels6.orta]
    const notInTdk = allLevel.filter(w => !tdkSet.has(w))
    expect(notInTdk, `TDK referansında olmayan: ${notInTdk.join(', ')}`).toHaveLength(0)
  })

  it('kolay listesi en az 1.500 kelime içeriyor (hedef ~%33)', () => {
    expect(levels6.kolay.length).toBeGreaterThanOrEqual(1500)
  })

  it('orta listesi en az 1.500 kelime içeriyor (hedef ~%33)', () => {
    expect(levels6.orta.length).toBeGreaterThanOrEqual(1500)
  })

  it('zor havuzu en az 1.500 kelime içeriyor (hedef ~%34)', () => {
    const zorCount = words6.length - levels6.kolay.length - levels6.orta.length
    expect(zorCount).toBeGreaterThanOrEqual(1500)
  })
})

describe('Sağduyu (Sanity) Seti Doğrulaması (40 Kolay, 40 Orta, 40 Zor)', () => {
  const sanity6 = SANITY_WORDS_6

  it('40 Kolay kelimenin tümü kolay seviyesinde olmalı', () => {
    expect(sanity6.kolay).toHaveLength(40)
    for (const word of sanity6.kolay) {
      expect(getLevel(word), `"${word}" kolay olmalı`).toBe('kolay')
    }
  })

  it('40 Orta kelimenin tümü orta seviyesinde olmalı', () => {
    expect(sanity6.orta).toHaveLength(40)
    for (const word of sanity6.orta) {
      expect(getLevel(word), `"${word}" orta olmalı`).toBe('orta')
    }
  })

  it('40 Zor kelimenin tümü zor seviyesinde olmalı', () => {
    expect(sanity6.zor).toHaveLength(40)
    for (const word of sanity6.zor) {
      expect(getLevel(word), `"${word}" zor olmalı`).toBe('zor')
    }
  })
})

describe('Kabul Testi 6 Harfli Kelimeler Doğrulaması (level-acceptance)', () => {
  it('MUST_BE_KOLAY kelimeleri kolay olmalı (bilmek, hayvan, geçmek)', () => {
    expect(getLevel('bilmek')).toBe('kolay')
    expect(getLevel('hayvan')).toBe('kolay')
    expect(getLevel('geçmek')).toBe('kolay')
  })

  it('MUST_BE_AT_LEAST_ORTA kelimeleri kolay veya orta olmalı', () => {
    const words = ['makine', 'millet', 'mesele', 'benzin', 'efendi', 'şahane', 'erimek']
    for (const w of words) {
      expect(['kolay', 'orta']).toContain(getLevel(w))
    }
  })

  it('MUST_BE_ZOR kelimeleri zor olmalı (burhan, coşkun, balkan, arslan, çelebi)', () => {
    const words = ['burhan', 'coşkun', 'balkan', 'arslan', 'çelebi']
    for (const w of words) {
      expect(getLevel(w), `"${w}" zor olmalı`).toBe('zor')
    }
  })
})
