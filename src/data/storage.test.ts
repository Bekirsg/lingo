import { describe, it, expect, beforeEach } from 'vitest'
import {
  getHighScore,
  setHighScore,
  getSettings,
  setSettings,
  getStats,
  recordGameResult,
  resetHighScore,
  HIGH_SCORE_KEY,
  SETTINGS_KEY,
} from './storage'

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

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = createLocalStorageMock() as unknown as Storage
}

describe('Yerel Veri (localStorage) Servisi - SPEC Bölüm 8', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('En Yüksek Skor (be:highscore)', () => {
    it('varsayılanda 0 döner', () => {
      expect(getHighScore()).toBe(0)
    })

    it('skoru kaydeder ve okur', () => {
      setHighScore(25000)
      expect(getHighScore()).toBe(25000)
    })

    it('bozuk veya geçersiz veride 0 döner', () => {
      localStorage.setItem(HIGH_SCORE_KEY, 'gecersiz_sayi')
      expect(getHighScore()).toBe(0)
    })
  })

  describe('Ayarlar (be:settings)', () => {
    it('varsayılanda ses ve titreşim açık döner', () => {
      expect(getSettings()).toEqual({ sound: true, haptics: true })
    })

    it('ses ve titreşimi günceller ve kaydeder', () => {
      setSettings({ sound: false })
      expect(getSettings()).toEqual({ sound: false, haptics: true })

      setSettings({ haptics: false })
      expect(getSettings()).toEqual({ sound: false, haptics: false })

      setSettings({ sound: true })
      expect(getSettings()).toEqual({ sound: true, haptics: false })
    })

    it('bozuk JSON verisinde varsayılan ayarları döner', () => {
      localStorage.setItem(SETTINGS_KEY, '{bozuk: json')
      expect(getSettings()).toEqual({ sound: true, haptics: true })
    })
  })

  describe('İstatistikler (be:stats) ve Oyun Kaydı', () => {
    it('varsayılanda oyun sayısı 0 ve en iyi etap Hiçbiri döner', () => {
      expect(getStats()).toEqual({
        gamesPlayed: 0,
        bestStage: 'Hiçbiri',
        bestStageNum: 0,
      })
    })

    it('recordGameResult oynanan oyun sayısını artırır ve etap ilerlemesini günceller', () => {
      // 1. oyun: 4 harfli etap bilindi
      const s1 = recordGameResult(10000, 4)
      expect(s1.gamesPlayed).toBe(1)
      expect(s1.bestStageNum).toBe(4)
      expect(s1.bestStage).toBe('4 Harfli Etap')
      expect(getHighScore()).toBe(10000)

      // 2. oyun: 6 harfli etap bilindi, skor 40.000
      const s2 = recordGameResult(40000, 6)
      expect(s2.gamesPlayed).toBe(2)
      expect(s2.bestStageNum).toBe(6)
      expect(s2.bestStage).toBe('6 Harfli Etap')
      expect(getHighScore()).toBe(40000)

      // 3. oyun: hiç etap bilinmedi (0 puan) -> en iyi etap düşmez, yüksek skor düşmez
      const s3 = recordGameResult(0, null)
      expect(s3.gamesPlayed).toBe(3)
      expect(s3.bestStageNum).toBe(6)
      expect(s3.bestStage).toBe('6 Harfli Etap')
      expect(getHighScore()).toBe(40000)
    })

    it('resetHighScore hem yüksek skoru hem istatistikleri sıfırlar', () => {
      recordGameResult(50000, 7)
      expect(getHighScore()).toBe(50000)
      expect(getStats().gamesPlayed).toBe(1)

      resetHighScore()
      expect(getHighScore()).toBe(0)
      expect(getStats().gamesPlayed).toBe(0)
      expect(getStats().bestStage).toBe('Hiçbiri')
    })
  })
})
