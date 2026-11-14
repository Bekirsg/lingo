/**
 * LİNGO v2 — Sistem Klavyesi ve Girdi Katmanı Birim Testleri
 * SPEC-v2 Bölüm 9, 10 & M4 Klavye Seçeneği
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getSettings, setSettings, SETTINGS_KEY } from '../../data/storage'
import { isTurkishLetter, sanitizeInput } from '../../utils/inputSanitize'
import { calculateTileSize } from './keyboardLogic'

// Node test ortamı için localStorage taklidi
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
}

describe('Sistem Klavyesi ve Klavye Ayarları (V2-M4)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
  })

  describe('1. Klavye Modu Ayarı (be:settings)', () => {
    it('varsayılan klavye modu "game" (Oyun Klavyesi) olmalı', () => {
      const s = getSettings()
      expect(s.keyboard).toBe('game')
    })

    it('klavye modunu "system" olarak güncelleyebilmeli ve kaydedebilmeli', () => {
      const updated = setSettings({ keyboard: 'system' })
      expect(updated.keyboard).toBe('system')
      expect(getSettings().keyboard).toBe('system')
    })

    it('tekrar "game" moduna dönebilmeli', () => {
      setSettings({ keyboard: 'system' })
      expect(getSettings().keyboard).toBe('system')

      setSettings({ keyboard: 'game' })
      expect(getSettings().keyboard).toBe('game')
    })

    it('geçersiz bir mod değeri geldiğinde güvenle "game" moduna dönmeli', () => {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ sound: true, haptics: true, keyboard: 'hatali' }))
      expect(getSettings().keyboard).toBe('game')
    })
  })

  describe('2. Girdi Filtreleme ve Türkçe Karakter Desteği (inputSanitize)', () => {
    it('Türkçe büyük harfleri doğru küçük harfe çevirmeli (I→ı, İ→i)', () => {
      expect(sanitizeInput('I')).toEqual(['ı'])
      expect(sanitizeInput('İ')).toEqual(['i'])
      expect(sanitizeInput('IŞIK')).toEqual(['ı', 'ş', 'ı', 'k'])
      expect(sanitizeInput('İNCİR')).toEqual(['i', 'n', 'c', 'i', 'r'])
      expect(sanitizeInput('AĞAÇ')).toEqual(['a', 'ğ', 'a', 'ç'])
      expect(sanitizeInput('ÖYKÜ')).toEqual(['ö', 'y', 'k', 'ü'])
    })

    it('q, w, x harflerini hem küçük hem büyük biçimde yok saymalı', () => {
      expect(sanitizeInput('q')).toEqual([])
      expect(sanitizeInput('Q')).toEqual([])
      expect(sanitizeInput('w')).toEqual([])
      expect(sanitizeInput('W')).toEqual([])
      expect(sanitizeInput('x')).toEqual([])
      expect(sanitizeInput('X')).toEqual([])
      expect(sanitizeInput('takviye')).toEqual(['t', 'a', 'k', 'v', 'i', 'y', 'e'])
      expect(sanitizeInput('taxi')).toEqual(['t', 'a', 'i'])
      expect(sanitizeInput('web')).toEqual(['e', 'b'])
    })

    it('şapkalı harfleri normalize etmeli (â→a, î→i, û→u)', () => {
      expect(sanitizeInput('hâkim')).toEqual(['h', 'a', 'k', 'i', 'm'])
      expect(sanitizeInput('millî')).toEqual(['m', 'i', 'l', 'l', 'i'])
      expect(sanitizeInput('sükût')).toEqual(['s', 'ü', 'k', 'u', 't'])
    })

    it('rakam, noktalama, boşluk ve sembolleri ayıklamalı', () => {
      expect(sanitizeInput('k.a-l e_m!123')).toEqual(['k', 'a', 'l', 'e', 'm'])
      expect(sanitizeInput('  b i l g i  ')).toEqual(['b', 'i', 'l', 'g', 'i'])
    })

    it('maxLen ile istenen uzunlukta kırpmalı', () => {
      expect(sanitizeInput('bilgisayar', 5)).toEqual(['b', 'i', 'l', 'g', 'i'])
      expect(sanitizeInput('kalemlik', 4)).toEqual(['k', 'a', 'l', 'e'])
    })

    it('isTurkishLetter tekil harf kontrolü doğru çalışmalı', () => {
      expect(isTurkishLetter('a')).toBe(true)
      expect(isTurkishLetter('ğ')).toBe(true)
      expect(isTurkishLetter('ş')).toBe(true)
      expect(isTurkishLetter('ı')).toBe(true)
      expect(isTurkishLetter('i')).toBe(true)
      expect(isTurkishLetter('q')).toBe(false)
      expect(isTurkishLetter('w')).toBe(false)
      expect(isTurkishLetter('x')).toBe(false)
      expect(isTurkishLetter('1')).toBe(false)
      expect(isTurkishLetter('')).toBe(false)
    })
  })

  describe('3. visualViewport ve Tahta Boyutlandırma Uyumu', () => {
    it('klavye kapalıyken (büyük dikey alan) kutu boyutu en büyük boyuta ulaşabilmeli', () => {
      // 393x852 ekran, klavye kapalı: availableHeight = 400px
      const sizeNormal = calculateTileSize({
        availableWidth: 380,
        availableHeight: 400,
        letterCount: 5,
        rowCount: 5,
        maxTileSize: 64,
        minTileSize: 28,
      })

      expect(sizeNormal.tileSize).toBeGreaterThanOrEqual(56)
      expect(sizeNormal.tileSize).toBeLessThanOrEqual(64)
    })

    it('sistem klavyesi açıldığında (dikey alan daraldığında) kutu boyutu ekrandan taşmayacak şekilde küçülmeli', () => {
      // Sistem klavyesi açıldı: visualViewport height 852 -> 460px
      // Tahta için kalan availableHeight = 220px
      const sizeWithKeyboard = calculateTileSize({
        availableWidth: 380,
        availableHeight: 220,
        letterCount: 5,
        rowCount: 5,
        maxTileSize: 64,
        minTileSize: 28,
      })

      // 5 satır + boşluklar 220px içine sığmalı
      expect(sizeWithKeyboard.boardHeight).toBeLessThanOrEqual(220)
      expect(sizeWithKeyboard.tileSize).toBeLessThan(56)
      expect(sizeWithKeyboard.tileSize).toBeGreaterThanOrEqual(28)
    })

    it('küçük ekranda (320x568) klavye açıkken asgari kutu boyutunu (28px) korumalı', () => {
      const sizeSmall = calculateTileSize({
        availableWidth: 300,
        availableHeight: 160,
        letterCount: 5,
        rowCount: 5,
        maxTileSize: 64,
        minTileSize: 28,
      })

      expect(sizeSmall.tileSize).toBe(28)
    })
  })

  describe('4. Giriş Akışı ve Mantıksal Eşleme', () => {
    it('Türkçe harf yazma ve silme zincirini simüle etmeli', () => {
      const typed: string[] = []
      const onChar = (c: string) => typed.push(c)
      const onDelete = () => typed.pop()

      // "kitap" yazma simülasyonu
      const inputs = sanitizeInput('kitap')
      inputs.forEach(onChar)
      expect(typed).toEqual(['k', 'i', 't', 'a', 'p'])

      // Backspace 2 kez
      onDelete()
      onDelete()
      expect(typed).toEqual(['k', 'i', 't'])

      // "re" yazma
      const extra = sanitizeInput('re')
      extra.forEach(onChar)
      expect(typed).toEqual(['k', 'i', 't', 'r', 'e'])
    })

    it('q, w, x girdiğinde karakter havuzuna eklenmemeli', () => {
      const typed: string[] = []
      const onChar = (c: string) => typed.push(c)

      const chars = sanitizeInput('qwx')
      chars.forEach(onChar)
      expect(typed).toEqual([])
    })
  })
})
