/**
 * LİNGO v2 — Hatalarımla Çalış: Öğrenildi (Study) Veri Saklama ve Yönetimi
 * SPEC-v2 Bölüm 6.5, 8.3 & 12/V2-M8
 */

export const STUDY_STORAGE_KEY = 'be:v2:study'

export interface StudyData {
  version: 1
  /** Kelime başına ardışık doğru sayısı (2 olunca learned'a geçer) */
  streak: Record<string, number>
  /** Öğrenilmiş kelimeler: { [kelime]: öğrenilme zamanı (timestamp) } */
  learned: Record<string, number>
}

let cachedStudyData: StudyData | null = null

export function createEmptyStudyData(): StudyData {
  return {
    version: 1,
    streak: {},
    learned: {},
  }
}

/**
 * be:v2:study verisini localStorage'dan yükler.
 * Bozuk veya eksik veri durumunda çökmeden temiz şemaya geri döner.
 */
export function loadStudyData(): StudyData {
  if (cachedStudyData) {
    return cachedStudyData
  }

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STUDY_STORAGE_KEY) : null
    if (!raw) {
      cachedStudyData = createEmptyStudyData()
      return cachedStudyData
    }

    const parsed = JSON.parse(raw)
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.streak !== 'object' ||
      typeof parsed.learned !== 'object'
    ) {
      console.warn('[Study] Bozuk veya eski şemalı çalışma verisi, temiz veriyle başlanıyor.')
      cachedStudyData = createEmptyStudyData()
      return cachedStudyData
    }

    cachedStudyData = {
      version: 1,
      streak: { ...parsed.streak },
      learned: { ...parsed.learned },
    }
    return cachedStudyData
  } catch (err) {
    console.warn('[Study] Veri okuma hatası, temiz şemaya dönülüyor:', err)
    cachedStudyData = createEmptyStudyData()
    return cachedStudyData
  }
}

/**
 * be:v2:study verisini localStorage'a yazar.
 */
export function saveStudyData(data: StudyData): void {
  cachedStudyData = data
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STUDY_STORAGE_KEY, JSON.stringify(data))
    }
  } catch (err) {
    console.warn('[Study] Veri kaydetme hatası:', err)
  }
}

/**
 * Bellek önbelleğini temizler (testler ve reset için).
 */
export function clearStudyCache(): void {
  cachedStudyData = null
}

/**
 * be:v2:study verisini tamamen sıfırlar.
 */
export function resetStudyData(): void {
  cachedStudyData = createEmptyStudyData()
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STUDY_STORAGE_KEY)
    }
  } catch (err) {
    console.warn('[Study] Veri sıfırlama hatası:', err)
  }
}

export interface RecordMistakeResult {
  streak: number
  justLearned: boolean
  isLearned: boolean
}

/**
 * Hatalar modunda bir kelimenin doğru veya yanlış cevaplanmasını işler.
 *
 * Kurallar (SPEC 6.5):
 * - Doğru bilinirse ardışık doğru sayısı +1.
 * - Sayaç 2'ye ulaşınca kelime learned olur (learned[kelime] = Date.now()) ve streak'ten silinir.
 * - Yanlış bilinir, süre aşılır, sözlük dışı girilir veya PAS edilirse sayaç 0'a sıfırlanır.
 * - Sayaç oturumlar arası kalıcıdır.
 */
export function recordMistakeAnswer(word: string, won: boolean): RecordMistakeResult {
  const data = loadStudyData()
  const lowerWord = word.toLocaleLowerCase('tr-TR')

  if (won) {
    const prevStreak = data.streak[lowerWord] || 0
    const nextStreak = prevStreak + 1

    if (nextStreak >= 2) {
      data.learned[lowerWord] = Date.now()
      delete data.streak[lowerWord]
      saveStudyData(data)
      return { streak: 2, justLearned: true, isLearned: true }
    } else {
      data.streak[lowerWord] = nextStreak
      saveStudyData(data)
      return { streak: nextStreak, justLearned: false, isLearned: false }
    }
  } else {
    // Yanlış / PAS / süre aşımı -> ardışık doğru sıfırlanır
    delete data.streak[lowerWord]
    saveStudyData(data)
    return { streak: 0, justLearned: false, isLearned: false }
  }
}

/**
 * Yarışma veya normal Çalışma modunda bir kelime tekrar kaçırılırsa (kayıp veya PAS):
 * Kelimenin öğrenildi durumu ve sayacı sıfırlanır; kelime tekrar Hatalarımla Çalış havuzuna döner.
 */
export function unlearnMistakeWord(word: string): boolean {
  const data = loadStudyData()
  const lowerWord = word.toLocaleLowerCase('tr-TR')
  let changed = false

  if (data.learned[lowerWord] !== undefined) {
    delete data.learned[lowerWord]
    changed = true
  }

  if (data.streak[lowerWord] !== undefined) {
    delete data.streak[lowerWord]
    changed = true
  }

  if (changed) {
    saveStudyData(data)
  }

  return changed
}
