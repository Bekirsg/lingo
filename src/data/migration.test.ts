/**
 * LİNGO v2 — Migration ve Seviye Depolama Testleri
 * SPEC-v2 Bölüm 5.1 & V2-M4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  HIGH_SCORE_KEY,
  STATS_KEY,
  getLevelRecords,
  getLevelStats,
  recordLevelGameResult,
  resetLevelRecords,
  migrateV1ToV2,
  devSimulateV1Record,
} from './storage'

function createLocalStorageMock() {
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

describe('v1 -> v2 Veri Taşıma (Migration)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
  })

  it('eski veri yoksa migration false döner ve hata vermez', () => {
    const migrated = migrateV1ToV2()
    expect(migrated).toBe(false)
    const records = getLevelRecords()
    expect(records.kolay).toBe(0)
    expect(records.orta).toBe(0)
    expect(records.zor).toBe(0)
  })

  it('eski be:highscore ve be:stats değerlerini Zor seviyesine taşır', () => {
    localStorage.setItem(HIGH_SCORE_KEY, '12345')
    localStorage.setItem(
      STATS_KEY,
      JSON.stringify({
        gamesPlayed: 10,
        bestStage: '6 Harfli Etap',
        bestStageNum: 6,
      })
    )

    const migrated = migrateV1ToV2()
    expect(migrated).toBe(true)

    // v2 kayıtları kontrol et
    const records = getLevelRecords()
    expect(records.zor).toBe(12345)
    expect(records.kolay).toBe(0)
    expect(records.orta).toBe(0)

    const stats = getLevelStats()
    expect(stats.zor.gamesPlayed).toBe(10)
    expect(stats.zor.bestStage).toBe('6 Harfli Etap')
    expect(stats.zor.bestStageNum).toBe(6)

    // Eski anahtarlar korunmalı (silinmemeli)
    expect(localStorage.getItem(HIGH_SCORE_KEY)).toBe('12345')
    expect(localStorage.getItem(STATS_KEY)).not.toBeNull()
  })

  it('idempotenttir: tekrar çağrıldığında mevcut daha yüksek veriyi ezmez', () => {
    localStorage.setItem(HIGH_SCORE_KEY, '10000')
    migrateV1ToV2()

    // v2 Zor rekoru daha yüksek yapıldı
    recordLevelGameResult('zor', 25000, 7)
    expect(getLevelRecords().zor).toBe(25000)

    // Tekrar migration çalıştırıldı
    migrateV1ToV2()
    expect(getLevelRecords().zor).toBe(25000) // 10000'e düşürülmemeli
  })

  it('devSimulateV1Record v1 simülasyonunu doğru ayarlar', () => {
    devSimulateV1Record(12345)
    expect(localStorage.getItem(HIGH_SCORE_KEY)).toBe('12345')
    expect(JSON.parse(localStorage.getItem(STATS_KEY)!).gamesPlayed).toBe(42)
  })
})

describe('Seviye Rekorları ve İstatistikleri Bağımsızlığı', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
  })

  it('kolay seviyesindeki rekor orta ve zor seviyesini etkilemez', () => {
    recordLevelGameResult('kolay', 15000, 4)
    const records = getLevelRecords()
    expect(records.kolay).toBe(15000)
    expect(records.orta).toBe(0)
    expect(records.zor).toBe(0)

    const stats = getLevelStats()
    expect(stats.kolay.gamesPlayed).toBe(1)
    expect(stats.orta.gamesPlayed).toBe(0)
    expect(stats.zor.gamesPlayed).toBe(0)
  })

  it('orta seviyesindeki rekor diğer seviyeleri etkilemez', () => {
    recordLevelGameResult('orta', 18000, 5)
    const records = getLevelRecords()
    expect(records.kolay).toBe(0)
    expect(records.orta).toBe(18000)
    expect(records.zor).toBe(0)
  })

  it('resetLevelRecords tüm seviyeleri ve eski anahtarları sıfırlar', () => {
    recordLevelGameResult('kolay', 10000, 4)
    recordLevelGameResult('orta', 15000, 5)
    recordLevelGameResult('zor', 20000, 6)

    resetLevelRecords()

    const records = getLevelRecords()
    expect(records.kolay).toBe(0)
    expect(records.orta).toBe(0)
    expect(records.zor).toBe(0)

    const stats = getLevelStats()
    expect(stats.kolay.gamesPlayed).toBe(0)
    expect(stats.orta.gamesPlayed).toBe(0)
    expect(stats.zor.gamesPlayed).toBe(0)

    expect(localStorage.getItem(HIGH_SCORE_KEY)).toBeNull()
    expect(localStorage.getItem(STATS_KEY)).toBeNull()
  })
})
