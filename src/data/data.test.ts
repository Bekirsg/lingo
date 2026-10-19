import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const VALID_CHARS = /^[a-zçğıöşü]+$/

function letterCount(s: string): number {
  return Array.from(s).length
}

describe('M2 Veri Doğrulama Testi (public/data/ dosyaları)', () => {
  const dataDir = resolve(process.cwd(), 'public/data')

  it('tüm veri dosyaları mevcut olmalı', () => {
    for (const len of [4, 5, 6, 7]) {
      const p = resolve(dataDir, `words-${len}.json`)
      expect(existsSync(p), `words-${len}.json bulunamadı`).toBe(true)
    }
    const bonusP = resolve(dataDir, 'bonus-8.json')
    expect(existsSync(bonusP), 'bonus-8.json bulunamadı').toBe(true)
  })

  for (const len of [4, 5, 6, 7]) {
    describe(`words-${len}.json doğrulama`, () => {
      const filePath = resolve(dataDir, `words-${len}.json`)
      const words: string[] = JSON.parse(readFileSync(filePath, 'utf8'))

      it(`kelime sayısı yeterli ve makul olmalı (> 1000)`, () => {
        expect(words.length).toBeGreaterThan(1000)
      })

      it(`tüm kelimeler tam ${len} harfli olmalı`, () => {
        for (const w of words) {
          expect(letterCount(w)).toBe(len)
        }
      })

      it(`tüm kelimeler sadece geçerli Türkçe küçük harflerden [a-zçğıöşü] oluşmalı`, () => {
        for (const w of words) {
          expect(VALID_CHARS.test(w), `Geçersiz karakter: "${w}"`).toBe(true)
        }
      })

      it(`tekrar eden kelime olmamalı (duplicate yok)`, () => {
        const uniqueSet = new Set(words)
        expect(uniqueSet.size).toBe(words.length)
      })

      it(`Türkçe alfabe sırasına göre sıralı olmalı`, () => {
        for (let i = 0; i < words.length - 1; i++) {
          const cmp = words[i].localeCompare(words[i + 1], 'tr-TR')
          expect(cmp).toBeLessThanOrEqual(0)
        }
      })
    })
  }

  describe('bonus-8.json doğrulama', () => {
    const filePath = resolve(dataDir, 'bonus-8.json')
    const bonusList: { w: string; d: string }[] = JSON.parse(readFileSync(filePath, 'utf8'))

    it('bonus kelime sayısı yeterli olmalı (> 2000)', () => {
      expect(bonusList.length).toBeGreaterThan(2000)
    })

    it('tüm bonus kelimeler tam 8 harfli olmalı', () => {
      for (const item of bonusList) {
        expect(letterCount(item.w), `Kelime boyutu hatalı: "${item.w}"`).toBe(8)
      }
    })

    it('tüm bonus kelimeler sadece geçerli Türkçe harflerden oluşmalı', () => {
      for (const item of bonusList) {
        expect(VALID_CHARS.test(item.w), `Geçersiz harf: "${item.w}"`).toBe(true)
      }
    })

    it('bonus kelimelerde tekrar olmamalı', () => {
      const set = new Set(bonusList.map(b => b.w))
      expect(set.size).toBe(bonusList.length)
    })

    it('bonus kelimeler Türkçe alfabetik sıralı olmalı', () => {
      for (let i = 0; i < bonusList.length - 1; i++) {
        const cmp = bonusList[i].w.localeCompare(bonusList[i + 1].w, 'tr-TR')
        expect(cmp).toBeLessThanOrEqual(0)
      }
    })

    it('tanımlar boş olmamalı ve SPEC 5.3 gereği 90 karakteri geçmemeli', () => {
      for (const item of bonusList) {
        expect(item.d).toBeTruthy()
        const trimmed = item.d.trim()
        expect(trimmed.length).toBeGreaterThanOrEqual(10)
        expect(trimmed.length).toBeLessThanOrEqual(90)
      }
    })

    it('tanımlar "Bkz." veya "►" yönlendirmesi içermemeli', () => {
      for (const item of bonusList) {
        expect(/^bkz\b/i.test(item.d)).toBe(false)
        expect(item.d.startsWith('►')).toBe(false)
      }
    })
  })
})
