/**
 * LİNGO v2 — Seviyelendirme Verisi Doğrulama Testleri
 * SPEC-v2 Bölüm 4.7, 4.8, 11.1 (Madde 13)
 *
 * `levels-*.json` içindeki her kelime ilgili words/bonus dosyasında var;
 * kolay ∩ orta = ∅; şema geçerli; asgari havuz boyutları karşılanıyor.
 */

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('V2-M2 Üretilen Seviye Verisi Doğrulaması', () => {
  const publicDir = path.resolve(__dirname, '../../public/data')
  const dataSrcDir = path.resolve(__dirname, '../../data-src')

  const officialWords: Record<string, Set<string>> = {
    '4': new Set(JSON.parse(fs.readFileSync(path.join(publicDir, 'words-4.json'), 'utf-8'))),
    '5': new Set(JSON.parse(fs.readFileSync(path.join(publicDir, 'words-5.json'), 'utf-8'))),
    '6': new Set(JSON.parse(fs.readFileSync(path.join(publicDir, 'words-6.json'), 'utf-8'))),
    '7': new Set(JSON.parse(fs.readFileSync(path.join(publicDir, 'words-7.json'), 'utf-8'))),
    'bonus': new Set(
      JSON.parse(fs.readFileSync(path.join(publicDir, 'bonus.json'), 'utf-8')).map(
        (b: { w: string }) => b.w
      )
    ),
  }

  for (const tag of ['4', '5', '6', '7', 'bonus']) {
    const filename = tag === 'bonus' ? 'levels-bonus.json' : `levels-${tag}.json`
    const title = tag === 'bonus' ? 'Bonus seviye dosyası (levels-bonus.json)' : `${tag} harfli seviye dosyası (levels-${tag}.json)`

    describe(title, () => {
      const levelFile = path.join(publicDir, filename)

      it('dosya mevcut olmalı', () => {
        expect(fs.existsSync(levelFile)).toBe(true)
      })

      it('geçerli şemaya sahip olmalı ({ kolay: string[], orta: string[] })', () => {
        const content = JSON.parse(fs.readFileSync(levelFile, 'utf-8'))
        expect(content).toHaveProperty('kolay')
        expect(content).toHaveProperty('orta')
        expect(Array.isArray(content.kolay)).toBe(true)
        expect(Array.isArray(content.orta)).toBe(true)
      })

      it('kolay ve orta kümeleri tamamen ayrık olmalı (kolay ∩ orta = ∅)', () => {
        const content = JSON.parse(fs.readFileSync(levelFile, 'utf-8'))
        const kolaySet = new Set(content.kolay)
        const overlaps = content.orta.filter((w: string) => kolaySet.has(w))
        expect(overlaps).toEqual([])
      })

      it('tüm kelimeler ilgili resmi kelime havuzunda bulunmalı', () => {
        const content = JSON.parse(fs.readFileSync(levelFile, 'utf-8'))
        const official = officialWords[tag]

        for (const w of content.kolay) {
          expect(official.has(w)).toBe(true)
        }
        for (const w of content.orta) {
          expect(official.has(w)).toBe(true)
        }
      })

      it('önerilen asgari havuz boyutunu aşmalı (4-7 için ≥ 30, bonus için ≥ 10)', () => {
        const content = JSON.parse(fs.readFileSync(levelFile, 'utf-8'))
        const minThreshold = tag === 'bonus' ? 10 : 30
        expect(content.kolay.length).toBeGreaterThanOrEqual(minThreshold)
        expect(content.orta.length).toBeGreaterThanOrEqual(minThreshold)
      })

      it('kelimeler Türkçe alfabetik (tr-TR) sırada olmalı', () => {
        const content = JSON.parse(fs.readFileSync(levelFile, 'utf-8'))
        const sortedKolay = [...content.kolay].sort((a, b) => a.localeCompare(b, 'tr-TR'))
        const sortedOrta = [...content.orta].sort((a, b) => a.localeCompare(b, 'tr-TR'))
        expect(content.kolay).toEqual(sortedKolay)
        expect(content.orta).toEqual(sortedOrta)
      })
    })
  }

  describe('Karar ve Denetim Dosyaları', () => {
    it('level-decisions.csv tam 23.717 kelime içermeli', () => {
      const decPath = path.join(dataSrcDir, 'level-decisions.csv')
      expect(fs.existsSync(decPath)).toBe(true)
      const content = fs.readFileSync(decPath, 'utf-8').replace(/^\uFEFF/, '')
      const lines = content.split(/\r?\n/).filter(Boolean)
      expect(lines.length - 1).toBe(23717)
    })

    it('kelime-listesi.csv tam 23.717 kelime içermeli ve seviyeler dolu olmalı', () => {
      const listPath = path.join(dataSrcDir, 'kelime-listesi.csv')
      expect(fs.existsSync(listPath)).toBe(true)
      const content = fs.readFileSync(listPath, 'utf-8').replace(/^\uFEFF/, '')
      const lines = content.split(/\r?\n/).filter(Boolean)
      expect(lines.length - 1).toBe(23717)

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(';')
        expect(['kolay', 'orta', 'zor']).toContain(parts[2])
      }
    })

    it('denetim-ornegi.csv 150 kelimelik tabakalı örnek içermeli (50 kolay, 50 orta, 50 zor)', () => {
      const auditPath = path.join(dataSrcDir, 'denetim-ornegi.csv')
      expect(fs.existsSync(auditPath)).toBe(true)
      const content = fs.readFileSync(auditPath, 'utf-8').replace(/^\uFEFF/, '')
      const lines = content.split(/\r?\n/).filter(Boolean)
      expect(lines.length - 1).toBe(150)

      const rows = lines.slice(1).map(l => l.split(';'))
      const kolayCount = rows.filter(r => r[2] === 'kolay').length
      const ortaCount = rows.filter(r => r[2] === 'orta').length
      const zorCount = rows.filter(r => r[2] === 'zor').length

      expect(kolayCount).toBe(50)
      expect(ortaCount).toBe(50)
      expect(zorCount).toBe(50)
    })
  })
})
