/**
 * LİNGO v2 — CSV Dışa/İçe Aktarma ve Seviye Derleme Testleri
 * SPEC-v2 Bölüm 4.4, 4.5, 11.1 (Madde 2)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { generateCsvContent } from '../../scripts/export-level-sheet.mjs'
import {
  normalizeLevelValue,
  parseCsvRows,
  buildLevelsData,
} from '../../scripts/build-levels.mjs'

describe('CSV Dışa/İçe Aktarma ve Seviye Derleyici', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lingo-levels-test-'))
  })

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  describe('generateCsvContent (Dışa Aktarma)', () => {
    it('UTF-8 BOM, noktalı virgül ve doğru başlıkla başlamalı', () => {
      const csv = generateCsvContent({
        4: ['elma', 'ayak'],
        5: ['kitap'],
      })

      expect(csv.charCodeAt(0)).toBe(0xFEFF) // UTF-8 BOM
      expect(csv).toContain('kelime;harf;seviye\r\n')
    })

    it('Türkçe alfabetik sıralamaya (tr-TR) göre sıralamalı', () => {
      const csv = generateCsvContent({
        4: ['çaba', 'baba', 'ılık', 'iğne', 'şaka', 'saba'],
      })

      // BOM'u temizle ve satırları al
      const lines = csv.slice(1).trim().split('\r\n').slice(1)
      const words = lines.map((l: string) => l.split(';')[0])

      // Türkçe sırada b -> ç, s -> ş, ı -> i
      expect(words).toEqual(['baba', 'çaba', 'ılık', 'iğne', 'saba', 'şaka'])
    })

    it('harf sayılarına göre sırayla listelemeli ve seviye boş gelmeli', () => {
      const csv = generateCsvContent({
        4: ['kedi'],
        5: ['araba'],
        8: ['apartman'],
      })

      const lines = csv.slice(1).trim().split('\r\n').slice(1)
      expect(lines).toEqual([
        'kedi;4;',
        'araba;5;',
        'apartman;8;',
      ])
    })
  })

  describe('normalizeLevelValue', () => {
    it('k, kolay ve büyük harfleri kolay olarak normalleştirmeli', () => {
      expect(normalizeLevelValue('kolay')).toBe('kolay')
      expect(normalizeLevelValue('k')).toBe('kolay')
      expect(normalizeLevelValue('KOLAY')).toBe('kolay')
      expect(normalizeLevelValue('K')).toBe('kolay')
    })

    it('o, orta ve büyük harfleri orta olarak normalleştirmeli', () => {
      expect(normalizeLevelValue('orta')).toBe('orta')
      expect(normalizeLevelValue('o')).toBe('orta')
      expect(normalizeLevelValue('ORTA')).toBe('orta')
      expect(normalizeLevelValue('O')).toBe('orta')
    })

    it('z, zor, boş veya tanımsız değerleri zor olarak normalleştirmeli', () => {
      expect(normalizeLevelValue('zor')).toBe('zor')
      expect(normalizeLevelValue('z')).toBe('zor')
      expect(normalizeLevelValue('ZOR')).toBe('zor')
      expect(normalizeLevelValue('')).toBe('zor')
      expect(normalizeLevelValue(null)).toBe('zor')
      expect(normalizeLevelValue(undefined)).toBe('zor')
    })
  })

  describe('parseCsvRows', () => {
    it('BOM içeren ve içermeyen satırları doğru ayrıştırmalı', () => {
      const withBom = '\uFEFFkelime;harf;seviye\r\nelma;4;kolay\r\nkitap;5;orta'
      const rows = parseCsvRows(withBom)
      expect(rows).toEqual([
        ['kelime', 'harf', 'seviye'],
        ['elma', '4', 'kolay'],
        ['kitap', '5', 'orta'],
      ])
    })

    it('Unix (\\n) satır sonlarını da doğru ayrıştırmalı', () => {
      const unix = 'kelime;harf;seviye\nelma;4;k\n'
      const rows = parseCsvRows(unix)
      expect(rows).toEqual([
        ['kelime', 'harf', 'seviye'],
        ['elma', '4', 'k'],
      ])
    })
  })

  describe('buildLevelsData (İçe Aktarma ve Doğrulama)', () => {
    // Mock public dizini kur
    function setupMockDirs() {
      const publicDir = path.join(tmpDir, 'public')
      const dataSrcDir = path.join(tmpDir, 'data-src')
      const outDir = path.join(tmpDir, 'out')
      fs.mkdirSync(publicDir, { recursive: true })
      fs.mkdirSync(dataSrcDir, { recursive: true })
      fs.mkdirSync(outDir, { recursive: true })

      // Resmi sözlük dosyalarını yaz
      fs.writeFileSync(path.join(publicDir, 'words-4.json'), JSON.stringify(['ayak', 'elma', 'kedi', 'masa', 'okul']))
      fs.writeFileSync(path.join(publicDir, 'words-5.json'), JSON.stringify(['araba', 'kitap', 'kalem']))
      fs.writeFileSync(path.join(publicDir, 'words-6.json'), JSON.stringify(['doktor', 'meyve']))
      fs.writeFileSync(path.join(publicDir, 'words-7.json'), JSON.stringify(['arkadaş', 'hastane']))
      fs.writeFileSync(path.join(publicDir, 'bonus-8.json'), JSON.stringify([{ w: 'apartman', d: 'Bina' }, { w: 'bisiklet', d: 'Araç' }]))

      return { publicDir, dataSrcDir, outDir }
    }

    it('geçerli CSV verisinden seviyeleri üretmeli ve zor kelimeleri JSON dışı bırakmalı', () => {
      const { publicDir, dataSrcDir, outDir } = setupMockDirs()

      const csvContent =
        'kelime;harf;seviye\r\n' +
        'ayak;4;kolay\r\n' +
        'elma;4;k\r\n' +
        'kedi;4;orta\r\n' +
        'masa;4;o\r\n' +
        'okul;4;zor\r\n' +
        'araba;5;k\r\n' +
        'kitap;5;o\r\n' +
        'kalem;5;\r\n' + // boş = zor
        'apartman;8;kolay\r\n' +
        'bisiklet;8;orta\r\n'

      fs.writeFileSync(path.join(dataSrcDir, 'kelime-listesi.csv'), '\uFEFF' + csvContent, 'utf-8')

      const res = buildLevelsData({ dataSrcDir, publicDir, outDir })

      expect(res.unknownWords.length).toBe(0)
      expect(res.stats[4].kolay).toBe(2) // ayak, elma
      expect(res.stats[4].orta).toBe(2)  // kedi, masa
      expect(res.stats[4].zor).toBe(1)   // okul
      expect(res.stats[4].total).toBe(5)

      // Çıktı JSON dosyasını kontrol et: SPEC 4.5'e göre yalnızca kolay ve orta bulunmalı
      const levels4 = JSON.parse(fs.readFileSync(path.join(outDir, 'levels-4.json'), 'utf-8'))
      expect(levels4).toEqual({
        kolay: ['ayak', 'elma'],
        orta: ['kedi', 'masa'],
      })
      expect(levels4.zor).toBeUndefined()
    })

    it('aynı kelime için farklı seviye (çakışma) olduğunda hata fırlatmalı', () => {
      const { publicDir, dataSrcDir, outDir } = setupMockDirs()

      const conflictingCsv =
        'kelime;harf;seviye\r\n' +
        'elma;4;kolay\r\n' +
        'elma;4;orta\r\n' // çakışan seviye!

      fs.writeFileSync(path.join(dataSrcDir, 'kelime-listesi.csv'), conflictingCsv, 'utf-8')

      expect(() => {
        buildLevelsData({ dataSrcDir, publicDir, outDir })
      }).toThrow(/Çakışan seviye hatası/)
    })

    it('aynı kelime aynı seviyeyle tekrarlanmışsa tekilleştirmeli (hata vermemeli)', () => {
      const { publicDir, dataSrcDir, outDir } = setupMockDirs()

      const duplicateSameCsv =
        'kelime;harf;seviye\r\n' +
        'elma;4;kolay\r\n' +
        'elma;4;kolay\r\n'

      fs.writeFileSync(path.join(dataSrcDir, 'kelime-listesi.csv'), duplicateSameCsv, 'utf-8')

      const res = buildLevelsData({ dataSrcDir, publicDir, outDir })
      expect(res.stats[4].kolay).toBe(1)
    })

    it('seviye-duzeltmeleri.csv en yüksek öncelikle seviyeyi ezmeli (override)', () => {
      const { publicDir, dataSrcDir, outDir } = setupMockDirs()

      const mainCsv =
        'kelime;harf;seviye\r\n' +
        'elma;4;zor\r\n' +
        'kedi;4;kolay\r\n'

      const overrideCsv =
        'kelime;seviye\r\n' +
        'elma;kolay\r\n' + // zor'dan kolay'a çekildi
        'kedi;orta\r\n'    // kolay'dan orta'ya çekildi

      fs.writeFileSync(path.join(dataSrcDir, 'kelime-listesi.csv'), mainCsv, 'utf-8')
      fs.writeFileSync(path.join(dataSrcDir, 'seviye-duzeltmeleri.csv'), overrideCsv, 'utf-8')

      const res = buildLevelsData({ dataSrcDir, publicDir, outDir })
      expect(res.overrideCount).toBe(2)

      const levels4 = JSON.parse(fs.readFileSync(path.join(outDir, 'levels-4.json'), 'utf-8'))
      expect(levels4.kolay).toContain('elma')
      expect(levels4.orta).toContain('kedi')
    })

    it('resmi sözlükte bulunmayan kelimeler için uyarı üretmeli', () => {
      const { publicDir, dataSrcDir, outDir } = setupMockDirs()

      const csvWithUnknown =
        'kelime;harf;seviye\r\n' +
        'elma;4;kolay\r\n' +
        'bilinmeyensöz;13;kolay\r\n' // resmi sözlükte yok!

      fs.writeFileSync(path.join(dataSrcDir, 'kelime-listesi.csv'), csvWithUnknown, 'utf-8')

      const res = buildLevelsData({ dataSrcDir, publicDir, outDir })
      expect(res.unknownWords.length).toBeGreaterThan(0)
      expect(res.warnings.some((w: string) => w.includes('Sözlükte bulunamayan'))).toBe(true)
    })

    it('minimum havuz sınırının altındaki seviyeler için uyarı üretmeli', () => {
      const { publicDir, dataSrcDir, outDir } = setupMockDirs()

      // Yalnızca 2 kolay kelime var (minimum 30'un altında)
      const smallCsv =
        'kelime;harf;seviye\r\n' +
        'ayak;4;kolay\r\n' +
        'elma;4;kolay\r\n'

      fs.writeFileSync(path.join(dataSrcDir, 'kelime-listesi.csv'), smallCsv, 'utf-8')

      const res = buildLevelsData({ dataSrcDir, publicDir, outDir })
      expect(
        res.warnings.some((w: string) => w.includes('4 harfli Kolay havuzu önerilen minimumun'))
      ).toBe(true)
    })
  })
})
