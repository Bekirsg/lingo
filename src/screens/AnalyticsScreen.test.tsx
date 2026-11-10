/**
 * LİNGO v2 — Analizler Ekranı ve Sekmeler Render Test Paketi
 * SPEC-v2 Bölüm 7, 7.1–7.7
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import AnalyticsScreen from './AnalyticsScreen'
import { OverviewTab } from './analytics/OverviewTab'
import { WordsTab } from './analytics/WordsTab'
import { InvalidWordsTab } from './analytics/InvalidWordsTab'
import { PerformanceTab } from './analytics/PerformanceTab'
import { LettersTab } from './analytics/LettersTab'
import { ProgressTab } from './analytics/ProgressTab'
import { EmptyState } from './analytics/EmptyState'
import { createEmptyAnalyticsData } from '../analytics/reducer'
import { mergeBuckets } from '../analytics/merge'
import { computeOverview } from '../analytics/selectors'
import type { AnalyticsData, AnalyticsFilter } from '../analytics/types'

// Mock localStorage for node environment
const mockStorage: Record<string, string> = {}
const originalLocalStorage = globalThis.localStorage

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) {
    delete mockStorage[k]
  }
  // @ts-expect-error mock
  globalThis.localStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, val: string) => {
      mockStorage[key] = val
    },
    removeItem: (key: string) => {
      delete mockStorage[key]
    },
    clear: () => {
      for (const k of Object.keys(mockStorage)) delete mockStorage[k]
    },
  }
})

afterEach(() => {
  globalThis.localStorage = originalLocalStorage
})

describe('V2-M7 Analizler Ekranı (AnalyticsScreen) Render Testleri', () => {
  it('EmptyState: mesaj ve alt metni doğru render etmelidir', () => {
    const html = renderToString(
      <EmptyState message="Veri yok" subtext="Burada istatistikler görünecek" />
    )
    expect(html).toContain('Veri yok')
    expect(html).toContain('Burada istatistikler görünecek')
  })

  it('AnalyticsScreen: Boş veriyle hatasız render edilmeli ve 6 sekmeyi içermelidir', () => {
    const html = renderToString(<AnalyticsScreen onBack={() => {}} />)

    // Başlık ve sürüm
    expect(html).toContain('Analizler')
    expect(html).toContain('LİNGO v2')

    // 6 sekme
    expect(html).toContain('Özet')
    expect(html).toContain('Kelimeler')
    expect(html).toContain('Sözlük Dışı')
    expect(html).toContain('Performans')
    expect(html).toContain('Harfler')
    expect(html).toContain('İlerleme')

    // Filtre çipleri
    expect(html).toContain('Mod:')
    expect(html).toContain('Yarışma')
    expect(html).toContain('Çalışma')
    expect(html).toContain('Hatalarımla')

    expect(html).toContain('Seviye:')
    expect(html).toContain('Kolay')
    expect(html).toContain('Orta')
    expect(html).toContain('Zor')

    // Boş veri uyarısı (Özet sekmesinde)
    expect(html).toContain('Henüz veri yok')
  })

  it('OverviewTab: Zengin veriyi hatasız ve doğru metriklerle render etmelidir', () => {
    const rawData: AnalyticsData = createEmptyAnalyticsData()
    // Kova verisi ekle (hasData için)
    rawData.buckets['yarisma:kolay'].byLength[4].seen = 5
    rawData.buckets['yarisma:kolay'].byLength[4].solved = 4

    rawData.games.push({
      timestamp: 1000,
      level: 'kolay',
      finalScore: 12500,
      treasury: 6000,
      lastCompletedStage: 5,
      solvedWordsCount: 7,
      lostWordsCount: 2,
      round4TimeLeft: 25,
    })
    rawData.sessions.push({
      timestamp: 2000,
      mode: 'calisma',
      level: 'kolay',
      totalQuestions: 10,
      wonCount: 8,
      lostCount: 1,
      passCount: 1,
      byLetter: {
        4: { asked: 2, won: 2 },
        5: { asked: 2, won: 2 },
        6: { asked: 2, won: 2 },
        7: { asked: 2, won: 1 },
        8: { asked: 2, won: 1 },
      },
      bonusWonCount: 1,
      bonusLostCount: 1,
    })

    const filter: AnalyticsFilter = { mode: 'all', level: 'all' }
    const merged = mergeBuckets(rawData, filter)
    const overview = computeOverview(merged, rawData, filter)

    const html = renderToString(<OverviewTab overview={overview} filter={filter} />)

    expect(html).toContain('Yarışma Performansı')
    expect(html).toContain('Çalışma Performansı')
    expect(html).toContain('12.500')
    expect(html).toContain('Akıllı Öneriler')
  })

  it('WordsTab: Kaçırılan kelimeleri alfabetik ve sayaçlarla render etmelidir', () => {
    const rawData = createEmptyAnalyticsData()
    rawData.missedWords = {
      kalem: { y: 2, c: 1, last: 1000 },
      kitap: { y: 1, c: 0, last: 2000 },
    }

    const filter: AnalyticsFilter = { mode: 'all', level: 'all' }
    const html = renderToString(<WordsTab rawData={rawData} filter={filter} />)

    expect(html).toContain('kalem')
    expect(html).toContain('kitap')
    expect(html).toContain('Kaçırılan Kelime')
    expect(html).toContain('Bu kelimelerle çalış')
    expect(html).toContain('YAKINDA')
  })

  it('InvalidWordsTab: Sözlük dışı dizileri ve uyarı kutusunu render etmelidir', () => {
    const rawData = createEmptyAnalyticsData()
    rawData.invalidWords = {
      asdf: { y: 2, c: 1, h: 0, last: 1000 },
    }

    const filter: AnalyticsFilter = { mode: 'all', level: 'all' }
    const html = renderToString(<InvalidWordsTab rawData={rawData} filter={filter} />)

    expect(html).toContain('asdf')
    expect(html).toContain('Bunlar kelime sandığın ama TDK&#x27;da bulunmayan diziler.')
    expect(html).toContain('Sözlük Dışı Dizi')
  })

  it('PerformanceTab: Harf uzunlukları ve bonus metriklerini render etmelidir', () => {
    const rawData = createEmptyAnalyticsData()
    const bucket = rawData.buckets['yarisma:kolay']
    bucket.byLength[4].seen = 10
    bucket.byLength[4].solved = 8
    bucket.byLength[4].lost = 2
    bucket.byLength[4].guessSum = 24
    bucket.bonus.seen = 5
    bucket.bonus.solved = 4

    const filter: AnalyticsFilter = { mode: 'yarisma', level: 'kolay' }
    const merged = mergeBuckets(rawData, filter)

    const html = renderToString(<PerformanceTab merged={merged} />)

    expect(html).toContain('Harf Sayısına Göre Başarı')
    expect(html).toContain('Harfli')
    expect(html).toContain('%80')
    expect(html).toContain('Bonus Soru (8 Harfli)')
    expect(html).toContain('Tahmin Süresi')
    expect(html).toContain('PAS Kullanımı')
  })

  it('LettersTab: Zorlanılan harfleri, çiftleri ve ısı haritasını render etmelidir', () => {
    const rawData = createEmptyAnalyticsData()
    const bucket = rawData.buckets['yarisma:kolay']
    bucket.byLength[4].seen = 10
    bucket.letters['ç'] = { g: 0, y: 0, r: 14 }
    bucket.pairs['iı'] = 6

    const filter: AnalyticsFilter = { mode: 'yarisma', level: 'kolay' }
    const merged = mergeBuckets(rawData, filter)

    const html = renderToString(<LettersTab merged={merged} />)

    expect(html).toContain('En Çok Zorlanılan Harfler')
    expect(html).toContain('Benzer Harf Karışıklığı')
    expect(html).toContain('i ↔ ı')
    expect(html).toContain('6')
    expect(html).toContain('Konum Başarı Oranları (Isı Haritası)')
  })

  it('ProgressTab: Son oyunları, oturumları ve rekorları render etmelidir', () => {
    const rawData = createEmptyAnalyticsData()
    rawData.games.push({
      timestamp: Date.now(),
      level: 'orta',
      finalScore: 18000,
      treasury: 7500,
      lastCompletedStage: 6,
      solvedWordsCount: 11,
      lostWordsCount: 1,
      round4TimeLeft: 30,
    })

    const filter: AnalyticsFilter = { mode: 'all', level: 'all' }
    const html = renderToString(<ProgressTab rawData={rawData} filter={filter} />)

    expect(html).toContain('Seviye Rekorları &amp; Genel Durum')
    expect(html).toContain('Son Yarışma Oyunları')
    expect(html).toContain('18.000')
    expect(html).toContain('ORTA')
  })
})
