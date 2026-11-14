/**
 * LİNGO v2 — Analiz Depolama Katmanı (Storage)
 * SPEC-v2 Bölüm 8.3 & 12/V2-M6
 */

import type { AnalyticsData } from './types'
import {
  createEmptyAnalyticsData,
  pruneAnalyticsData,
  recordQuestionToAnalytics,
  recordGameToAnalytics,
  recordSessionToAnalytics,
} from './reducer'
import type { QuestionResolvedEvent, GameCompletedEvent, SessionCompletedEvent } from '../game/state/types'
import { unlearnMistakeWord, resetStudyData } from '../game/mistakes/studyStorage'

export const ANALYTICS_STORAGE_KEY = 'be:v2:analytics'
export const STUDY_STORAGE_KEY = 'be:v2:study'

let cachedAnalytics: AnalyticsData | null = null
let pendingDataToSave: AnalyticsData | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Analiz verisini localStorage'dan yükler. Bozuk veya eski veri varsa temiz şemaya geri döner.
 */
export function loadAnalytics(): AnalyticsData {
  if (cachedAnalytics) {
    return cachedAnalytics
  }

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(ANALYTICS_STORAGE_KEY) : null
    if (!raw) {
      cachedAnalytics = createEmptyAnalyticsData()
      return cachedAnalytics
    }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1 || !parsed.buckets) {
      console.warn('[Analytics] Geçersiz veya eski şemalı veri tespit edildi, temiz şema oluşturuluyor.')
      cachedAnalytics = createEmptyAnalyticsData()
      return cachedAnalytics
    }

    // Eksik alanları varsayılanlarla güvenceye al
    const empty = createEmptyAnalyticsData()
    cachedAnalytics = {
      version: 1,
      buckets: { ...empty.buckets, ...parsed.buckets },
      missedWords: parsed.missedWords && typeof parsed.missedWords === 'object' ? parsed.missedWords : {},
      invalidWords: parsed.invalidWords && typeof parsed.invalidWords === 'object' ? parsed.invalidWords : {},
      games: Array.isArray(parsed.games) ? parsed.games : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    }

    return cachedAnalytics
  } catch (err) {
    console.warn('[Analytics] Veri okuma hatası, temiz veriyle başlanıyor:', err)
    cachedAnalytics = createEmptyAnalyticsData()
    return cachedAnalytics
  }
}

/**
 * Analiz verisini anında ve güvenle localStorage'a yazar.
 */
export function saveAnalytics(data: AnalyticsData): void {
  try {
    cachedAnalytics = data
    // Boyut koruması (~1.5 MB)
    const pruned = pruneAnalyticsData(data, 1.5 * 1024 * 1024)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(pruned))
    }
  } catch (err) {
    // Kota aşımı veya erişim engeli durumunda sessizce yakala, oyunu çökertme
    console.warn('[Analytics] localStorage kayıt hatası (kota aşımı veya gizli sekme):', err)
  }
}

/**
 * Asenkron / debounced kayıt planlar (UI donmasını önler).
 */
export function scheduleAnalyticsSave(data: AnalyticsData): void {
  cachedAnalytics = data
  pendingDataToSave = data

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    flushPendingAnalyticsSave()
  }, 100)
}

/**
 * Bekleyen kayıt varsa hemen yazar (sayfa kapanması / görünürlük değişimi).
 */
export function flushPendingAnalyticsSave(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  if (pendingDataToSave) {
    const toSave = pendingDataToSave
    pendingDataToSave = null
    saveAnalytics(toSave)
  }
}

/**
 * Analiz verisini sıfırlar (`be:v2:analytics` ve `be:v2:study`). Rekorlar ve ayarlar KORUNUR.
 */
export function resetAnalytics(): void {
  flushPendingAnalyticsSave()
  cachedAnalytics = createEmptyAnalyticsData()
  resetStudyData()
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ANALYTICS_STORAGE_KEY)
      localStorage.removeItem(STUDY_STORAGE_KEY)
    }
  } catch (err) {
    console.warn('[Analytics] Veri sıfırlama hatası:', err)
  }
}

/**
 * Test veya harici kullanım için önbelleği sıfırlar.
 */
export function clearAnalyticsCache(): void {
  cachedAnalytics = null
  pendingDataToSave = null
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

// ─── Olay Dinleyicileri (Event Handlers) ──────────────────────────────

export function recordQuestionResolved(event: QuestionResolvedEvent): void {
  const current = loadAnalytics()
  recordQuestionToAnalytics(current, event)
  scheduleAnalyticsSave(current)

  // SPEC-v2 Bölüm 6.5 / M8: Öğrenildi sayılan bir kelime Yarışma veya Çalışma'da tekrar kaçırılırsa
  // learned durumu ve sayaç sıfırlanır (kelime havuza geri döner)
  if (
    (event.mode === 'yarisma' || event.mode === 'calisma') &&
    (event.result === 'lost' || event.result === 'pass')
  ) {
    unlearnMistakeWord(event.word)
  }
}

export function recordGameCompleted(event: GameCompletedEvent): void {
  const current = loadAnalytics()
  recordGameToAnalytics(current, event)
  // Oyun bitiminde derhal flush et
  saveAnalytics(current)
}

export function recordSessionCompleted(event: SessionCompletedEvent): void {
  const current = loadAnalytics()
  recordSessionToAnalytics(current, event)
  // Oturum bitiminde derhal flush et
  saveAnalytics(current)
}

// Tarayıcı ortamında sayfa kapanışında bekleyen kaydı tamamlama
if (typeof window !== 'undefined') {
  try {
    window.addEventListener('visibilitychange', () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        flushPendingAnalyticsSave()
      }
    })
    window.addEventListener('pagehide', () => {
      flushPendingAnalyticsSave()
    })
  } catch {
    // Tarayıcı dışı ortamlarda yoksay
  }
}
