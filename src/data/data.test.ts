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
    const bonusP = resolve(dataDir, 'bonus.json')
    expect(existsSync(bonusP), 'bonus.json bulunamadı').toBe(true)
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

      it(`SPEC-v2 Bölüm 9.1: words-${len}.json içinde kesinlikle q, w, x harfi bulunmamalı`, () => {
        const qwxWords = words.filter(w => /[qwx]/.test(w))
        expect(qwxWords).toHaveLength(0)
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

  describe('bonus.json doğrulama', () => {
    const filePath = resolve(dataDir, 'bonus.json')
    const bonusList: { w: string; d: string }[] = JSON.parse(readFileSync(filePath, 'utf8'))

    it('bonus kelime sayısı yeterli olmalı (> 5000)', () => {
      expect(bonusList.length).toBeGreaterThan(5000)
    })

    it('tüm bonus kelimeler 8, 9, 10 veya 11 harfli olmalı', () => {
      for (const item of bonusList) {
        expect([8, 9, 10, 11]).toContain(letterCount(item.w))
      }
    })

    it('tüm bonus kelimeler sadece geçerli Türkçe harflerden oluşmalı', () => {
      for (const item of bonusList) {
        expect(VALID_CHARS.test(item.w), `Geçersiz harf: "${item.w}"`).toBe(true)
      }
    })

    it('SPEC-v2 Bölüm 9.1: bonus.json içinde kesinlikle q, w, x harfi bulunmamalı', () => {
      const qwxBonus = bonusList.filter(item => /[qwx]/.test(item.w))
      expect(qwxBonus).toHaveLength(0)
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

    it('tanımlar boş olmamalı ve 20-90 karakter aralığında olmalı', () => {
      for (const item of bonusList) {
        expect(item.d).toBeTruthy()
        const trimmed = item.d.trim()
        expect(trimmed.length).toBeGreaterThanOrEqual(20)
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
