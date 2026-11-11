/**
 * LİNGO v2 — Analizler Ekranı ve Bölümler Render Test Paketi
 * Sadeleştirilmiş ve yeniden tasarlanan ekranın bileşenlerini test eder.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import AnalyticsScreen from './AnalyticsScreen'
import { SummarySection } from './analytics/SummarySection'
import { RankingSection } from './analytics/RankingSection'
import { LengthPerformanceSection } from './analytics/LengthPerformanceSection'
import { MissedWordsSection } from './analytics/MissedWordsSection'
import { FirstLetterSection } from './analytics/FirstLetterSection'
import { InvalidWordsSection } from './analytics/InvalidWordsSection'
import { InsightsSection } from './analytics/InsightsSection'
import { EmptyState } from './analytics/EmptyState'
import { createEmptyAnalyticsData } from '../analytics/reducer'
import { mergeBuckets } from '../analytics/merge'
import { clearAnalyticsCache } from '../analytics/storage'
import {
  computeSimplifiedSummary,
  computeRankingByLength,
} from '../analytics/selectors'
import type { AnalyticsData, AnalyticsFilter } from '../analytics/types'

// Mock localStorage for node environment
const mockStorage: Record<string, string> = {}
const originalLocalStorage = globalThis.localStorage

beforeEach(() => {
  clearAnalyticsCache()
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

describe('Analizler Ekranı (AnalyticsScreen) ve Yeni Bölümler Render Testleri', () => {
  it('EmptyState: Mesaj ve alt metni doğru render etmelidir', () => {
    const html = renderToString(
      <EmptyState message="Veri yok" subtext="Burada istatistikler görünecek" />
    )
    expect(html).toContain('Veri yok')
    expect(html).toContain('Burada istatistikler görünecek')
  })

  it('AnalyticsScreen: Boş veriyle hatasız render edilmeli ve 3 filtre görünümünü içermelidir', () => {
    const html = renderToString(<AnalyticsScreen onBack={() => {}} />)

    // Başlık ve sürüm
    expect(html).toContain('Analizler')
    expect(html).toContain('LİNGO v2')

    // 3 Görünüm Filtresi
    expect(html).toContain('Tümü')
    expect(html).toContain('Harf Sayısı')
    expect(html).toContain('Baş Harf')

    // Boş veri uyarısı
    expect(html).toContain('Henüz veri yok')
  })

  it('AnalyticsScreen: Veri varken 7 ana bölümü dikey akışta render etmelidir', () => {
    const rawData: AnalyticsData = createEmptyAnalyticsData()
    rawData.buckets['yarisma:kolay'].byLength[4].seen = 10
    rawData.buckets['yarisma:kolay'].byLength[4].solved = 8
    rawData.buckets['yarisma:kolay'].byLength[5].seen = 12
    rawData.buckets['yarisma:kolay'].byLength[5].solved = 9

    rawData.missedWords = {
      kalem: { y: 2, c: 1, last: 1000 },
      kapak: { y: 3, c: 0, last: 2000 },
    }
    rawData.invalidWords = {
      asdf: { y: 2, c: 1, h: 0, last: 1500 },
    }

    mockStorage['be:v2:analytics'] = JSON.stringify(rawData)

    const html = renderToString(<AnalyticsScreen onBack={() => {}} />)

    // 7 Bölüm Başlıkları
    expect(html).toContain('Performans Özeti')
    expect(html).toContain('Başarı Sıralaması')
    expect(html).toContain('Harf Sayısına Göre Performans')
    expect(html).toContain('En Çok Bilinemeyen Kelimeler')
    expect(html).toContain('En Başarısız Olunan Baş Harfler')
    expect(html).toContain('TDK Dışı Kelime Denemeleri')
    expect(html).toContain('Gelişim Önerileri')
  })

  it('SummarySection: 4 ana metriği ve açıklayıcı metni render etmelidir', () => {
    const rawData = createEmptyAnalyticsData()
    rawData.buckets['yarisma:kolay'].byLength[4].seen = 20
    rawData.buckets['yarisma:kolay'].byLength[4].solved = 15
    rawData.buckets['yarisma:kolay'].byLength[4].lossReasons.pass = 2
    rawData.buckets['yarisma:kolay'].byLength[4].lossReasons.invalid_word = 3

    const filter: AnalyticsFilter = { type: 'all' }
    const merged = mergeBuckets(rawData, filter)
    const summary = computeSimplifiedSummary(merged, rawData, filter)

    const html = renderToString(<SummarySection summary={summary} />)

    expect(html).toContain('Performans Özeti')
    expect(html).toContain('Toplam Soru')
    expect(html).toContain('20')
    expect(html).toContain('Başarı Oranı')
    expect(html).toContain('%75')
    expect(html).toContain('PAS Sayısı')
    expect(html).toContain('2')
    expect(html).toContain('TDK Dışı')
    expect(html).toContain('3')
  })

  it('RankingSection: Harf uzunluklarını sıralı madalyalarla render etmelidir', () => {
    const rawData = createEmptyAnalyticsData()
    const b = rawData.buckets['yarisma:kolay']
    b.byLength[4].seen = 10
    b.byLength[4].solved = 8 // %80
    b.byLength[5].seen = 10
    b.byLength[5].solved = 9 // %90 (1.)

    const filter: AnalyticsFilter = { type: 'all' }
    const merged = mergeBuckets(rawData, filter)
    const ranking = computeRankingByLength(merged)

    const html = renderToString(<RankingSection ranking={ranking} />)

    expect(html).toContain('Başarı Sıralaması')
    expect(html).toContain('5 Harfli')
    expect(html).toContain('%90')
    expect(html).toContain('4 Harfli')
    expect(html).toContain('%80')
    expect(html).toContain('🥇')
    expect(html).toContain('🥈')
  })

  it('LengthPerformanceSection: Her harf uzunluğunun detay metriklerini render etmelidir', () => {
    const rawData = createEmptyAnalyticsData()
    const b = rawData.buckets['yarisma:kolay']
    b.byLength[4].seen = 10
    b.byLength[4].solved = 8
    b.byLength[4].guessSum = 24 // 24 / 8 = 3.0
    b.byLength[4].lossReasons.pass = 1
    b.byLength[4].lossReasons.invalid_word = 1

    const filter: AnalyticsFilter = { type: 'all' }
    const merged = mergeBuckets(rawData, filter)
    const ranking = computeRankingByLength(merged)

    const html = renderToString(<LengthPerformanceSection items={ranking} />)

    expect(html).toContain('Harf Sayısına Göre Performans')
    expect(html).toContain('4 Harfli')
    expect(html).toContain('%80 Başarı')
    expect(html).toContain('3.0.')
  })

  it('MissedWordsSection: Tekrarlanan kelimeleri ×N katsayısıyla ve çalışma butonuyla render etmelidir', () => {
    const words = [
      {
        word: 'kalem',
        total: 4,
        y: 2,
        c: 2,
        last: 1000,
        length: 5,
        firstLetter: 'k',
      },
      {
        word: 'elma',
        total: 2,
        y: 2,
        c: 0,
        last: 2000,
        length: 4,
        firstLetter: 'e',
      },
    ]

    const html = renderToString(
      <MissedWordsSection words={words} onStartMistakes={() => {}} />
    )

    expect(html).toContain('En Çok Bilinemeyen Kelimeler')
    expect(html).toContain('kalem')
    expect(html).toContain('×4')
    expect(html).toContain('elma')
    expect(html).toContain('×2')
    expect(html).toContain('Bu Kelimelerle Çalış')
  })

  it('FirstLetterSection: En çok hata yapılan baş harfleri ve örnek kelimeleri render etmelidir', () => {
    const stats = [
      {
        char: 'K',
        missedCount: 7,
        distinctWordsCount: 2,
        topWords: [
          { word: 'kalem', total: 4 },
          { word: 'kapak', total: 3 },
        ],
      },
    ]

    const html = renderToString(<FirstLetterSection stats={stats} />)

    expect(html).toContain('En Başarısız Olunan Baş Harfler')
    expect(html).toContain('K ile Başlayan')
    expect(html).toContain('7 Hata')
    expect(html).toContain('kalem (×4)')
    expect(html).toContain('kapak (×3)')
  })

  it('InvalidWordsSection: Geçersiz kelime denemeleri sayısını ve tekrarları render etmelidir', () => {
    const data = {
      totalAttempts: 9,
      uniqueCount: 3,
      items: [
        {
          word: 'asdf',
          total: 5,
          y: 3,
          c: 2,
          h: 0,
          last: 1000,
          length: 4,
          firstLetter: 'a',
        },
      ],
    }

    const html = renderToString(<InvalidWordsSection data={data} />)

    expect(html).toContain('TDK Dışı Kelime Denemeleri')
    expect(html).toContain('9 Toplam')
    expect(html).toContain('3 Farklı Dizi')
    expect(html).toContain('asdf')
    expect(html).toContain('×5')
  })

  it('InsightsSection: Eyleme dönük gelişim önerilerini render etmelidir', () => {
    const insights = [
      {
        id: 'tip1',
        title: 'K Harfine Odaklan',
        message: 'K ile başlayan kelimelerde sık hata yaptın.',
        type: 'tip' as const,
      },
    ]

    const html = renderToString(<InsightsSection insights={insights} />)

    expect(html).toContain('Gelişim Önerileri')
    expect(html).toContain('K Harfine Odaklan')
    expect(html).toContain('K ile başlayan kelimelerde sık hata yaptın.')
  })
})
