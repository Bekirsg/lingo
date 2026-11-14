import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import {
  loadStudyData,
  createEmptyStudyData,
  clearStudyCache,
  hideMistakeWord,
  unhideMistakeWord,
  hideInvalidWord,
  unhideInvalidWord,
  setWordLearned,
  unlearnMistakeWord,
  STUDY_STORAGE_KEY,
} from './mistakes/studyStorage'
import {
  getStudyableCandidates,
  getStudyList,
} from './mistakes/mistakeSelector'
import {
  loadAnalytics,
  saveAnalytics,
  resetAnalytics,
  clearAnalyticsCache,
} from '../analytics/storage'
import { createWordRepository } from '../data/words'
import MistakesManagerModal, {
  isSwipeThresholdReached,
  SWIPE_THRESHOLD,
} from '../screens/MistakesManagerModal'

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

describe('Aşama 4: Hata ve Sözlük Dışı Kelimeleri Düzenleme Altyapısı', () => {
  let mockStorage: ReturnType<typeof createLocalStorageMock>

  beforeEach(() => {
    mockStorage = createLocalStorageMock()
    vi.stubGlobal('localStorage', mockStorage)
    clearStudyCache()
    clearAnalyticsCache()
  })

  describe('1. Veri Modeli ve Şema Migrasyonu (be:v2:study version 2)', () => {
    it('createEmptyStudyData() version 2 şemasına sahip olmalıdır', () => {
      const data = createEmptyStudyData()
      expect(data.version).toBe(2)
      expect(data.streak).toEqual({})
      expect(data.learned).toEqual({})
      expect(data.hidden).toEqual({})
      expect(data.invalidHidden).toEqual({})
    })

    it('v1 verisi okunduğunda eksik hidden ve invalidHidden alanları otomatik eklenip v2 şemasına taşınmalıdır', () => {
      const v1Data = {
        version: 1,
        streak: { kalem: 1 },
        learned: { kitap: 1600000000 },
      }
      mockStorage.setItem(STUDY_STORAGE_KEY, JSON.stringify(v1Data))

      const loaded = loadStudyData()
      expect(loaded.version).toBe(2)
      expect(loaded.streak['kalem']).toBe(1)
      expect(loaded.learned['kitap']).toBe(1600000000)
      expect(loaded.hidden).toEqual({})
      expect(loaded.invalidHidden).toEqual({})
    })

    it('bozuk veya eksik veri okunduğunda çökmeden temiz v2 şemasına dönmelidir', () => {
      mockStorage.setItem(STUDY_STORAGE_KEY, '{ invalid json syntax !!!')
      const loaded = loadStudyData()
      expect(loaded.version).toBe(2)
      expect(loaded.streak).toEqual({})
      expect(loaded.learned).toEqual({})
      expect(loaded.hidden).toEqual({})
      expect(loaded.invalidHidden).toEqual({})
    })
  })

  describe('2. Gizleme ve Geri Alma (Silme = Gizleme Kuralı)', () => {
    it('hideMistakeWord ve unhideMistakeWord kelimeyi gizlemeli ve geri almalıdır', () => {
      hideMistakeWord('kalem')
      let data = loadStudyData()
      expect(data.hidden['kalem']).toBeDefined()
      expect(typeof data.hidden['kalem']).toBe('number')

      unhideMistakeWord('kalem')
      data = loadStudyData()
      expect(data.hidden['kalem']).toBeUndefined()
    })

    it('hideInvalidWord ve unhideInvalidWord sözlük dışı diziyi gizlemeli ve geri almalıdır', () => {
      hideInvalidWord('xyzkl')
      let data = loadStudyData()
      expect(data.invalidHidden['xyzkl']).toBeDefined()

      unhideInvalidWord('xyzkl')
      data = loadStudyData()
      expect(data.invalidHidden['xyzkl']).toBeUndefined()
    })

    it('setWordLearned kelimenin öğrenildi durumunu manuel açıp kapatabilmelidir', () => {
      setWordLearned('masa', true)
      expect(loadStudyData().learned['masa']).toBeDefined()

      setWordLearned('masa', false)
      expect(loadStudyData().learned['masa']).toBeUndefined()
    })

    it('Yeniden Kaçırma Kuralı: Gizlenen bir kelime tekrar kaçırılırsa gizlilik otomatik kalkmalıdır', () => {
      hideMistakeWord('defter')
      expect(loadStudyData().hidden['defter']).toBeDefined()

      // unlearnMistakeWord çağrıldığında (Yarışma/Çalışma'da tekrar kaçırılınca)
      const changed = unlearnMistakeWord('defter')
      expect(changed).toBe(true)
      expect(loadStudyData().hidden['defter']).toBeUndefined()
    })

    it('Silme = Gizleme: Kelime gizlense bile analitik sayaçları (missedWords) DEĞİŞMEMELİDİR', () => {
      const analytics = loadAnalytics()
      analytics.missedWords['armut'] = { y: 3, c: 2, last: 1000 }
      saveAnalytics(analytics)

      hideMistakeWord('armut')

      const reloaded = loadAnalytics()
      expect(reloaded.missedWords['armut']).toBeDefined()
      expect(reloaded.missedWords['armut'].y).toBe(3)
      expect(reloaded.missedWords['armut'].c).toBe(2)
    })
  })

  describe('3. Hatalarımla Çalış Havuzuna Entegrasyon (getStudyableCandidates)', () => {
    it('hidden listesindeki kelimeler çalışma havuzundan ve sayaçtan çıkarılmalıdır', () => {
      const repo = createWordRepository({
        words4: ['ayak'],
        words5: ['kalem', 'kitap'],
        words6: ['doktor'],
        words7: ['arkadaş'],
      })

      const missed = {
        kalem: { y: 2, c: 1, last: 1000 },
        kitap: { y: 1, c: 0, last: 2000 },
      }

      const poolActive = getStudyableCandidates(missed, {}, repo, undefined, {})
      expect(poolActive.totalCount).toBe(2)

      // 'kalem' gizlenince
      const poolWithHidden = getStudyableCandidates(missed, {}, repo, undefined, { kalem: 1000 })
      expect(poolWithHidden.totalCount).toBe(1)
      expect(poolWithHidden.all[0].word).toBe('kitap')
    })
  })

  describe('4. Tek Saf Kaynak Fonksiyonu: getStudyList', () => {
    const missedMap = {
      kalem: { y: 3, c: 2, last: 5000 }, // total = 5
      kitap: { y: 1, c: 0, last: 4000 }, // total = 1
      silgi: { y: 2, c: 0, last: 3000 }, // total = 2
    }

    it('minThreshold = 1 ile tüm kaçırılan kelimeleri sıralı getirmelidir', () => {
      const list = getStudyList({
        missedWordsMap: missedMap,
        minThreshold: 1,
      })

      expect(list).toHaveLength(3)
      expect(list[0].word).toBe('kalem') // 5
      expect(list[1].word).toBe('silgi') // 2
      expect(list[2].word).toBe('kitap') // 1
    })

    it('minThreshold = 2 ile Analizler özet kutusu eşiğini karşılamalıdır', () => {
      const list = getStudyList({
        missedWordsMap: missedMap,
        minThreshold: 2,
      })

      expect(list).toHaveLength(2)
      expect(list.map((x) => x.word)).toEqual(['kalem', 'silgi'])
    })

    it('includeHidden = false iken gizlenen kelimeler hariç tutulmalıdır', () => {
      const studyData = {
        learned: {},
        hidden: { kalem: 1000 },
      }

      const activeList = getStudyList({
        missedWordsMap: missedMap,
        studyData,
        minThreshold: 1,
        includeHidden: false,
      })
      expect(activeList.map((x) => x.word)).toEqual(['silgi', 'kitap'])

      const allList = getStudyList({
        missedWordsMap: missedMap,
        studyData,
        minThreshold: 1,
        includeHidden: true,
      })
      expect(allList).toHaveLength(3)
      expect(allList.find((x) => x.word === 'kalem')?.isHidden).toBe(true)
    })
  })

  describe('5. Kaydırma Eşiği Saf Fonksiyonu (isSwipeThresholdReached)', () => {
    it('kaydırma eşiği 72 px olmalıdır', () => {
      expect(SWIPE_THRESHOLD).toBe(72)
    })

    it('deltaX <= -72 ise eşik aşılmış sayılmalıdır', () => {
      expect(isSwipeThresholdReached(-72)).toBe(true)
      expect(isSwipeThresholdReached(-80)).toBe(true)
      expect(isSwipeThresholdReached(-71)).toBe(false)
      expect(isSwipeThresholdReached(0)).toBe(false)
      expect(isSwipeThresholdReached(50)).toBe(false)
    })
  })

  describe('6. Analiz Verisi Sıfırlama (resetAnalytics)', () => {
    it('resetAnalytics çağrıldığında hidden ve invalidHidden kayıtları da temizlenmelidir', () => {
      hideMistakeWord('kalem')
      hideInvalidWord('abczz')
      expect(loadStudyData().hidden['kalem']).toBeDefined()
      expect(loadStudyData().invalidHidden['abczz']).toBeDefined()

      resetAnalytics()

      const cleaned = loadStudyData()
      expect(cleaned.hidden).toEqual({})
      expect(cleaned.invalidHidden).toEqual({})
    })
  })
})

describe('Aşama 4: MistakesManagerModal Arayüz Render Testleri', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
    clearStudyCache()
    clearAnalyticsCache()

    const analytics = loadAnalytics()
    analytics.missedWords = {
      kalem: { y: 2, c: 1, last: 1000 },
      kitap: { y: 1, c: 0, last: 2000 },
    }
    analytics.invalidWords = {
      xyzab: { y: 3, c: 0, h: 0, last: 1500 },
    }
    saveAnalytics(analytics)
  })

  it('modal açıldığında başlık, sekmeler ve kaçırılan kelimeleri render etmelidir', () => {
    const html = renderToString(<MistakesManagerModal onClose={() => {}} />)

    expect(html).toContain('Hatalarım ve Kelimeler')
    expect(html).toContain('Kaçırılan Kelimeler')
    expect(html).toContain('Sözlük Dışı')
    expect(html).toContain('KALEM')
    expect(html).toContain('KİTAP')
    expect(html).toMatch(/×\s*(<!-- -->)?\s*3/) // kalem total = 3
    expect(html).toMatch(/×\s*(<!-- -->)?\s*1/) // kitap total = 1
    expect(html).toContain('Aktifler')
    expect(html).toContain('Gizlenenler')
    expect(html).toContain('Seç')
  })

  it('initialTab="invalid" iken sözlük dışı denemeleri render etmelidir', () => {
    const html = renderToString(<MistakesManagerModal onClose={() => {}} initialTab="invalid" />)

    expect(html).toContain('Hatalarım ve Kelimeler')
    expect(html).toContain('Sözlük Dışı')
    expect(html).toContain('xyzab')
    expect(html).toMatch(/×\s*(<!-- -->)?\s*3/)
  })

  it('boş liste durumunda bilgilendirici mesaj render etmelidir', () => {
    clearAnalyticsCache()
    const emptyAnalytics = loadAnalytics()
    emptyAnalytics.missedWords = {}
    saveAnalytics(emptyAnalytics)

    const html = renderToString(<MistakesManagerModal onClose={() => {}} />)
    expect(html).toContain('Aktif kaçırılan kelime bulunmuyor')
  })
})
