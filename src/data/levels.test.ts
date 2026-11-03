/**
 * LİNGO v2 — Seviye Sistemi Birim Testleri
 * SPEC-v2 Bölüm 4, Bölüm 11.1 (Madde 1)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  parseGameLevel,
  getWordPool,
  pickWordWithFallback,
  pickBonusWordWithFallback,
  _resetLevelWarning,
  type LevelData,
} from './levels'
import { createWordRepository } from './words'
import {
  SAMPLE_LEVELS_4,
  SAMPLE_LEVELS_8,
  SAMPLE_BONUS_WORDS,
} from '../../tests/fixtures/sampleLevels'

describe('Seviye Sistemi (Level System)', () => {
  const allWords4 = [
    // Kolay
    'ayak', 'elma', 'kedi', 'masa', 'okul', 'para',
    // Orta
    'adak', 'boru', 'caba', 'dere', 'gece', 'hata',
    // Zor (diğer)
    'abat', 'abes', 'abuk', 'acul', 'ağaç', 'ağıt',
  ]

  beforeEach(() => {
    _resetLevelWarning()
  })

  describe('parseGameLevel', () => {
    it('kolay ve kısaltmalarını doğru ayrıştırmalı', () => {
      expect(parseGameLevel('kolay')).toBe('kolay')
      expect(parseGameLevel('k')).toBe('kolay')
      expect(parseGameLevel('KOLAY')).toBe('kolay')
      expect(parseGameLevel('K')).toBe('kolay')
    })

    it('orta ve kısaltmalarını doğru ayrıştırmalı', () => {
      expect(parseGameLevel('orta')).toBe('orta')
      expect(parseGameLevel('o')).toBe('orta')
      expect(parseGameLevel('ORTA')).toBe('orta')
      expect(parseGameLevel('O')).toBe('orta')
    })

    it('zor ve kısaltmalarını doğru ayrıştırmalı', () => {
      expect(parseGameLevel('zor')).toBe('zor')
      expect(parseGameLevel('z')).toBe('zor')
      expect(parseGameLevel('ZOR')).toBe('zor')
      expect(parseGameLevel('Z')).toBe('zor')
    })

    it('geçersiz seviyelerde null dönmeli', () => {
      expect(parseGameLevel('')).toBeNull()
      expect(parseGameLevel('uzman')).toBeNull()
      expect(parseGameLevel('123')).toBeNull()
    })
  })

  describe('getWordPool (SPEC 4.1)', () => {
    it('kolay seviyesinde yalnızca kolay kelimeler dönmeli', () => {
      const pool = getWordPool(allWords4, SAMPLE_LEVELS_4, 'kolay')
      expect(pool).toEqual(SAMPLE_LEVELS_4.kolay)
      expect(pool.length).toBe(6)
      expect(pool).toContain('kedi')
      expect(pool).not.toContain('gece') // orta kelime
    })

    it('orta seviyesinde kolay ∪ orta kelimeler birleşik dönmeli', () => {
      const pool = getWordPool(allWords4, SAMPLE_LEVELS_4, 'orta')
      expect(pool.length).toBe(12)
      expect(pool).toContain('kedi') // kolay
      expect(pool).toContain('gece') // orta
      expect(pool).not.toContain('abat') // zor
    })

    it('zor seviyesinde tüm kelimeler dönmeli', () => {
      const pool = getWordPool(allWords4, SAMPLE_LEVELS_4, 'zor')
      expect(pool).toEqual(allWords4)
    })

    it('levels verisi yokken (null/undefined) zor havuzuna dönmeli ve uyarmalı (SPEC 4.5)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const pool = getWordPool(allWords4, null, 'kolay')
      expect(pool).toEqual(allWords4)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Seviye verisi (levels) bulunamadı')
      )
      warnSpy.mockRestore()
    })
  })

  describe('pickWordWithFallback (Yedek Kural — SPEC 4.3)', () => {
    it('kolay seviyesinde kullanılmamış kolay kelime seçmeli', () => {
      const used = new Set<string>(['ayak', 'elma'])
      const res = pickWordWithFallback(allWords4, SAMPLE_LEVELS_4, 'kolay', used)
      expect(res).not.toBeNull()
      expect(res!.fromLevel).toBe('kolay')
      expect(SAMPLE_LEVELS_4.kolay).toContain(res!.word)
      expect(used.has(res!.word)).toBe(false)
    })

    it('kolay kelimeler bittiğinde orta kelimelere yedek geçiş yapmalı (Kolay -> Orta)', () => {
      // Tüm kolay kelimeleri kullanılmış yap
      const used = new Set<string>(SAMPLE_LEVELS_4.kolay)
      const res = pickWordWithFallback(allWords4, SAMPLE_LEVELS_4, 'kolay', used)
      expect(res).not.toBeNull()
      expect(res!.fromLevel).toBe('orta')
      expect(SAMPLE_LEVELS_4.orta).toContain(res!.word)
      expect(used.has(res!.word)).toBe(false)
    })

    it('kolay ve orta bittiğinde zor kelimelere yedek geçiş yapmalı (Kolay -> Orta -> Zor)', () => {
      // Kolay ve orta kelimelerin tümünü kullanılmış yap
      const used = new Set<string>([...SAMPLE_LEVELS_4.kolay, ...SAMPLE_LEVELS_4.orta])
      const res = pickWordWithFallback(allWords4, SAMPLE_LEVELS_4, 'kolay', used)
      expect(res).not.toBeNull()
      expect(res!.fromLevel).toBe('zor')
      expect(allWords4).toContain(res!.word)
      expect(used.has(res!.word)).toBe(false)
    })

    it('tüm kelimeler bittiğinde null dönmeli', () => {
      const used = new Set<string>(allWords4)
      const res = pickWordWithFallback(allWords4, SAMPLE_LEVELS_4, 'kolay', used)
      expect(res).toBeNull()
    })

    it('orta seviyesinde kolay ∪ orta kelimeler bittiğinde zor havuza geçmeli', () => {
      const used = new Set<string>([...SAMPLE_LEVELS_4.kolay, ...SAMPLE_LEVELS_4.orta])
      const res = pickWordWithFallback(allWords4, SAMPLE_LEVELS_4, 'orta', used)
      expect(res).not.toBeNull()
      expect(res!.fromLevel).toBe('zor')
      expect(used.has(res!.word)).toBe(false)
    })

    it('zor seviyesinde doğrudan tüm kelimelerden seçmeli', () => {
      const used = new Set<string>()
      const res = pickWordWithFallback(allWords4, SAMPLE_LEVELS_4, 'zor', used)
      expect(res).not.toBeNull()
      expect(res!.fromLevel).toBe('zor')
      expect(allWords4).toContain(res!.word)
    })

    it('levelData yokken uyarı verip zor havuzundan seçmeli', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const used = new Set<string>()
      const res = pickWordWithFallback(allWords4, null, 'kolay', used)
      expect(res).not.toBeNull()
      expect(res!.fromLevel).toBe('zor')
      expect(allWords4).toContain(res!.word)
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })

  describe('pickBonusWordWithFallback (Bonus Seviye ve Yedek Kural)', () => {
    it('kolay seviyesinde kolay bonus kelimesi seçmeli', () => {
      const used = new Set<string>()
      const res = pickBonusWordWithFallback(SAMPLE_BONUS_WORDS, SAMPLE_LEVELS_8, 'kolay', used)
      expect(res).not.toBeNull()
      expect(res!.fromLevel).toBe('kolay')
      expect(SAMPLE_LEVELS_8.kolay).toContain(res!.word)
      expect(res!.definition).toBeTruthy()
    })

    it('kolay bonus kelimeleri tükendiğinde orta bonus kelimesine geçmeli', () => {
      const used = new Set<string>(SAMPLE_LEVELS_8.kolay)
      const res = pickBonusWordWithFallback(SAMPLE_BONUS_WORDS, SAMPLE_LEVELS_8, 'kolay', used)
      expect(res).not.toBeNull()
      expect(res!.fromLevel).toBe('orta')
      expect(SAMPLE_LEVELS_8.orta).toContain(res!.word)
    })

    it('kolay ve orta bittiğinde zor bonus kelimesine geçmeli', () => {
      const used = new Set<string>([...SAMPLE_LEVELS_8.kolay, ...SAMPLE_LEVELS_8.orta])
      const res = pickBonusWordWithFallback(SAMPLE_BONUS_WORDS, SAMPLE_LEVELS_8, 'kolay', used)
      expect(res).not.toBeNull()
      expect(res!.fromLevel).toBe('zor')
      expect(['antifriz', 'antrasit']).toContain(res!.word)
    })

    it('tüm bonus kelimeleri tükendiğinde null dönmeli', () => {
      const used = new Set<string>(SAMPLE_BONUS_WORDS.map(b => b.w))
      const res = pickBonusWordWithFallback(SAMPLE_BONUS_WORDS, SAMPLE_LEVELS_8, 'kolay', used)
      expect(res).toBeNull()
    })

    it('bonus levelData yokken tüm bonus havuzundan seçmeli ve uyarmalı', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const used = new Set<string>()
      const res = pickBonusWordWithFallback(SAMPLE_BONUS_WORDS, null, 'kolay', used)
      expect(res).not.toBeNull()
      expect(res!.fromLevel).toBe('zor')
      expect(SAMPLE_BONUS_WORDS.map(b => b.w)).toContain(res!.word)
      warnSpy.mockRestore()
    })
  })

  describe('WordRepository Seviye Entegrasyonu', () => {
    it('createWordRepository seviye verisiyle doğru çalışmalı', () => {
      const repo = createWordRepository({
        words4: allWords4,
        words5: ['araba', 'kitap'],
        words6: ['doktor'],
        words7: ['arkadaş'],
        bonus8: SAMPLE_BONUS_WORDS,
        levels: {
          4: SAMPLE_LEVELS_4,
          8: SAMPLE_LEVELS_8,
        },
      })

      expect(repo.getLevelData?.(4)).toEqual(SAMPLE_LEVELS_4)
      expect(repo.getLevelData?.(5)).toBeNull()

      // pickWordByLevel
      const used = new Set<string>()
      const wordRes = repo.pickWordByLevel?.(4, 'kolay', used)
      expect(wordRes).not.toBeNull()
      expect(wordRes!.fromLevel).toBe('kolay')
      expect(SAMPLE_LEVELS_4.kolay).toContain(wordRes!.word)

      // pickBonusWordByLevel
      const bonusRes = repo.pickBonusWordByLevel?.('kolay', used)
      expect(bonusRes).not.toBeNull()
      expect(SAMPLE_LEVELS_8.kolay).toContain(bonusRes!.word)
    })

    it('loadLevelData ile lazy yükleme yapılabilmeli', () => {
      const repo = createWordRepository({
        words4: allWords4,
        words5: ['araba'],
        words6: ['doktor'],
        words7: ['arkadaş'],
      })

      expect(repo.getLevelData?.(4)).toBeNull()

      const newLevel: LevelData = { kolay: ['ayak'], orta: ['dere'] }
      repo.loadLevelData?.(4, newLevel)

      expect(repo.getLevelData?.(4)).toEqual(newLevel)
      const res = repo.pickWordByLevel?.(4, 'kolay', new Set())
      expect(res!.word).toBe('ayak')
      expect(res!.fromLevel).toBe('kolay')
    })
  })
})
