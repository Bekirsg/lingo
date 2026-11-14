/**
 * LİNGO v2 — 5 Harfli Kelime Listesi Doğrulayıcı
 * Her words-5.json ve levels-5.json girişinin TDK referansında bulunduğunu,
 * harf kurallarına uyduğunu ve tutarlı olduğunu doğrular.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '../..')

// TR alfabesi: a b c ç d e f g ğ h ı i j k l m n o ö p r s ş t u ü v y z
const TR_ALPHABET = new Set(['a','b','c','ç','d','e','f','g','ğ','h','ı','i','j','k','l','m','n','o','ö','p','r','s','ş','t','u','ü','v','y','z'])

function isValidTR(word: string): boolean {
  return word.split('').every(c => TR_ALPHABET.has(c))
}

// JSON dosyalarını oku
const words5: string[] = JSON.parse(
  readFileSync(resolve(ROOT, 'public/data/words-5.json'), 'utf-8')
)

interface LevelsData { kolay: string[]; orta: string[] }
const levels5: LevelsData = JSON.parse(
  readFileSync(resolve(ROOT, 'public/data/levels-5.json'), 'utf-8')
)

// TDK referans sözlüğü
const tdk5harf: { words: string[] } = JSON.parse(
  readFileSync(resolve(ROOT, 'data-src/tdk-5harf.json'), 'utf-8')
)
const tdkSet = new Set(tdk5harf.words)

describe('words-5.json doğrulama', () => {
  it('tüm kelimeler tam 5 karakter uzunluğunda', () => {
    const invalid = words5.filter(w => w.length !== 5)
    expect(invalid, `Uzunluk hatası: ${invalid.join(', ')}`).toHaveLength(0)
  })

  it('tüm kelimeler yalnızca Türkçe alfabesi harflerini içeriyor (q/w/x yok)', () => {
    const invalid = words5.filter(w => !isValidTR(w))
    expect(invalid, `Harf hatası: ${invalid.join(', ')}`).toHaveLength(0)
  })

  it('yinelenen kelime yok', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const w of words5) {
      if (seen.has(w)) dupes.push(w)
      seen.add(w)
    }
    expect(dupes, `Yinelenenler: ${dupes.join(', ')}`).toHaveLength(0)
  })

  it('toplam kelime sayısı 5000 ile 6000 arasında (makul aralık)', () => {
    expect(words5.length).toBeGreaterThanOrEqual(5000)
    expect(words5.length).toBeLessThanOrEqual(6000)
  })

  it('tüm kelimeler TDK referansında mevcut', () => {
    const notInTdk = words5.filter(w => !tdkSet.has(w))
    expect(notInTdk, `TDK dışı: ${notInTdk.join(', ')}`).toHaveLength(0)
  })
})

describe('levels-5.json doğrulama', () => {
  it('kolay ve orta listeleri words-5.json içinde mevcut', () => {
    const w5set = new Set(words5)
    const missingKolay = levels5.kolay.filter(w => !w5set.has(w))
    const missingOrta = levels5.orta.filter(w => !w5set.has(w))
    expect(missingKolay, `Kolay listesinde words-5 dışı: ${missingKolay.join(', ')}`).toHaveLength(0)
    expect(missingOrta, `Orta listesinde words-5 dışı: ${missingOrta.join(', ')}`).toHaveLength(0)
  })

  it('kolay ve orta listeleri kesişmiyor', () => {
    const kolaySet = new Set(levels5.kolay)
    const intersection = levels5.orta.filter(w => kolaySet.has(w))
    expect(intersection, `Kolay ∩ Orta: ${intersection.join(', ')}`).toHaveLength(0)
  })

  it('kolay listesinde yinelenen kelime yok', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const w of levels5.kolay) {
      if (seen.has(w)) dupes.push(w)
      seen.add(w)
    }
    expect(dupes).toHaveLength(0)
  })

  it('orta listesinde yinelenen kelime yok', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const w of levels5.orta) {
      if (seen.has(w)) dupes.push(w)
      seen.add(w)
    }
    expect(dupes).toHaveLength(0)
  })

  it('tüm seviye kelimeleri TDK referansında mevcut', () => {
    const allLevel = [...levels5.kolay, ...levels5.orta]
    const notInTdk = allLevel.filter(w => !tdkSet.has(w))
    expect(notInTdk, `TDK referansında olmayan: ${notInTdk.join(', ')}`).toHaveLength(0)
  })

  it('kolay listesi en az 600 kelime içeriyor', () => {
    expect(levels5.kolay.length).toBeGreaterThanOrEqual(600)
  })

  it('orta listesi en az 400 kelime içeriyor', () => {
    expect(levels5.orta.length).toBeGreaterThanOrEqual(400)
  })
})

describe('tdk-5harf.json referans doğrulama', () => {
  it('referanstaki tüm kelimeler tam 5 karakter', () => {
    const invalid = tdk5harf.words.filter(w => w.length !== 5)
    expect(invalid).toHaveLength(0)
  })

  it('referanstaki tüm kelimeler Türkçe alfabesine uygun', () => {
    const invalid = tdk5harf.words.filter(w => !isValidTR(w))
    expect(invalid).toHaveLength(0)
  })

  it('words-5.json kelimelerinin tamamı TDK referansında', () => {
    const notInTdk = words5.filter(w => !tdkSet.has(w))
    expect(notInTdk, `TDK dışı: ${notInTdk.join(', ')}`).toHaveLength(0)
  })
})
