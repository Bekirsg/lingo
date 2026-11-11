/**
 * LİNGO v2 — 4 Harfli Kelime Listesi Doğrulayıcı
 * Her words-4.json ve levels-4.json girişinin TDK referansında bulunduğunu,
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
const words4: string[] = JSON.parse(
  readFileSync(resolve(ROOT, 'public/data/words-4.json'), 'utf-8')
)

interface LevelsData { kolay: string[]; orta: string[] }
const levels4: LevelsData = JSON.parse(
  readFileSync(resolve(ROOT, 'public/data/levels-4.json'), 'utf-8')
)

// TDK referans sözlüğü
const tdk4harf: { words: string[] } = JSON.parse(
  readFileSync(resolve(ROOT, 'data-src/tdk-4harf.json'), 'utf-8')
)
const tdkSet = new Set(tdk4harf.words)

describe('words-4.json doğrulama', () => {
  it('tüm kelimeler tam 4 karakter uzunluğunda', () => {
    const invalid = words4.filter(w => w.length !== 4)
    expect(invalid, `Uzunluk hatası: ${invalid.join(', ')}`).toHaveLength(0)
  })

  it('tüm kelimeler yalnızca Türkçe alfabesi harflerini içeriyor (q/w/x yok)', () => {
    const invalid = words4.filter(w => !isValidTR(w))
    expect(invalid, `Harf hatası: ${invalid.join(', ')}`).toHaveLength(0)
  })

  it('yinelenen kelime yok', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const w of words4) {
      if (seen.has(w)) dupes.push(w)
      seen.add(w)
    }
    expect(dupes, `Yinelenenler: ${dupes.join(', ')}`).toHaveLength(0)
  })

  it('toplam kelime sayısı 2000 ile 2100 arasında (makul aralık)', () => {
    expect(words4.length).toBeGreaterThanOrEqual(2000)
    expect(words4.length).toBeLessThanOrEqual(2100)
  })
})

describe('levels-4.json doğrulama', () => {
  it('kolay ve orta listeleri words-4.json içinde mevcut', () => {
    const w4set = new Set(words4)
    const missingKolay = levels4.kolay.filter(w => !w4set.has(w))
    const missingOrta = levels4.orta.filter(w => !w4set.has(w))
    expect(missingKolay, `Kolay listesinde words-4 dışı: ${missingKolay.join(', ')}`).toHaveLength(0)
    expect(missingOrta, `Orta listesinde words-4 dışı: ${missingOrta.join(', ')}`).toHaveLength(0)
  })

  it('kolay ve orta listeleri kesişmiyor', () => {
    const kolaySet = new Set(levels4.kolay)
    const intersection = levels4.orta.filter(w => kolaySet.has(w))
    expect(intersection, `Kolay ∩ Orta: ${intersection.join(', ')}`).toHaveLength(0)
  })

  it('kolay listesinde yinelenen kelime yok', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const w of levels4.kolay) {
      if (seen.has(w)) dupes.push(w)
      seen.add(w)
    }
    expect(dupes).toHaveLength(0)
  })

  it('orta listesinde yinelenen kelime yok', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const w of levels4.orta) {
      if (seen.has(w)) dupes.push(w)
      seen.add(w)
    }
    expect(dupes).toHaveLength(0)
  })

  it('tüm seviye kelimeleri TDK referansında mevcut', () => {
    const allLevel = [...levels4.kolay, ...levels4.orta]
    const notInTdk = allLevel.filter(w => !tdkSet.has(w))
    expect(notInTdk, `TDK referansında olmayan: ${notInTdk.join(', ')}`).toHaveLength(0)
  })

  it('kolay listesi en az 400 kelime içeriyor', () => {
    expect(levels4.kolay.length).toBeGreaterThanOrEqual(400)
  })

  it('orta listesi en az 200 kelime içeriyor', () => {
    expect(levels4.orta.length).toBeGreaterThanOrEqual(200)
  })
})

describe('tdk-4harf.json referans doğrulama', () => {
  it('referanstaki tüm kelimeler tam 4 karakter', () => {
    const invalid = tdk4harf.words.filter(w => w.length !== 4)
    expect(invalid).toHaveLength(0)
  })

  it('referanstaki tüm kelimeler Türkçe alfabesine uygun', () => {
    const invalid = tdk4harf.words.filter(w => !isValidTR(w))
    expect(invalid).toHaveLength(0)
  })

  it('words-4.json kelimelerinin tamamı TDK referansında', () => {
    const notInTdk = words4.filter(w => !tdkSet.has(w))
    expect(notInTdk, `TDK dışı: ${notInTdk.join(', ')}`).toHaveLength(0)
  })
})
