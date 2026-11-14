/**
 * LİNGO v2 — Hatalarımla Çalış: Öğrenildi (Study) Veri Saklama ve Yönetimi
 * SPEC-v2 Bölüm 6.5, 8.3 & 12/V2-M8
 */

export const STUDY_STORAGE_KEY = 'be:v2:study'

export interface StudyData {
  version: 2
  /** Kelime başına ardışık doğru sayısı (2 olunca learned'a geçer) */
  streak: Record<string, number>
  /** Öğrenilmiş kelimeler: { [kelime]: öğrenilme zamanı (timestamp) } */
  learned: Record<string, number>
  /** Listeden çıkarılan / gizlenen kaçırılmış kelimeler: { [kelime]: gizlenme zamanı (timestamp) } */
  hidden: Record<string, number>
  /** Listeden çıkarılan / gizlenen sözlük dışı denemeler: { [dizi]: gizlenme zamanı (timestamp) } */
  invalidHidden: Record<string, number>
}

let cachedStudyData: StudyData | null = null

export function createEmptyStudyData(): StudyData {
  return {
    version: 2,
    streak: {},
    learned: {},
    hidden: {},
    invalidHidden: {},
  }
}

/**
 * be:v2:study verisini localStorage'dan yükler.
 * Bozuk veya eksik veri durumunda çökmeden temiz şemaya geri döner.
 * v1 -> v2 migrasyonunu şeffafça yapar (hidden ve invalidHidden alanları eklenir).
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
      version: 2,
      streak: { ...parsed.streak },
      learned: { ...parsed.learned },
      hidden: parsed.hidden && typeof parsed.hidden === 'object' ? { ...parsed.hidden } : {},
      invalidHidden:
        parsed.invalidHidden && typeof parsed.invalidHidden === 'object'
          ? { ...parsed.invalidHidden }
          : {},
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
 * Kaçırılmış bir kelimeyi listeden çıkarır (gizler).
 * Analiz sayaçları bozulmaz; kelime çalışma havuzundan ve varsayılan listeden çıkarılır.
 */
export function hideMistakeWord(word: string): void {
  const data = loadStudyData()
  const lowerWord = word.toLocaleLowerCase('tr-TR')
  data.hidden[lowerWord] = Date.now()
  delete data.streak[lowerWord]
  saveStudyData(data)
}

/**
 * Gizlenmiş bir kelimeyi listeye geri alır.
 */
export function unhideMistakeWord(word: string): void {
  const data = loadStudyData()
  const lowerWord = word.toLocaleLowerCase('tr-TR')
  if (data.hidden[lowerWord] !== undefined) {
    delete data.hidden[lowerWord]
    saveStudyData(data)
  }
}

/**
 * Sözlük dışı bir deneme dizisini listeden çıkarır (gizler).
 */
export function hideInvalidWord(word: string): void {
  const data = loadStudyData()
  const lowerWord = word.toLocaleLowerCase('tr-TR')
  data.invalidHidden[lowerWord] = Date.now()
  saveStudyData(data)
}

/**
 * Gizlenmiş bir sözlük dışı deneme dizisini listeye geri alır.
 */
export function unhideInvalidWord(word: string): void {
  const data = loadStudyData()
  const lowerWord = word.toLocaleLowerCase('tr-TR')
  if (data.invalidHidden[lowerWord] !== undefined) {
    delete data.invalidHidden[lowerWord]
    saveStudyData(data)
  }
}

/**
 * Bir kelimenin öğrenildi durumunu elle belirler ("Öğrenildi say" / "Öğrenildi durumunu kaldır").
 */
export function setWordLearned(word: string, isLearned: boolean): void {
  const data = loadStudyData()
  const lowerWord = word.toLocaleLowerCase('tr-TR')
  if (isLearned) {
    data.learned[lowerWord] = Date.now()
    delete data.streak[lowerWord]
  } else {
    delete data.learned[lowerWord]
    delete data.streak[lowerWord]
  }
  saveStudyData(data)
}

/**
 * Yarışma veya normal Çalışma modunda bir kelime tekrar kaçırılırsa (kayıp veya PAS):
 * Kelimenin öğrenildi durumu ve sayacı sıfırlanır; ayrıca gizlenmişse gizlilik kalkar.
 * Kelime tekrar Hatalarımla Çalış havuzuna ve listesine döner (SPEC Bölüm 6.2).
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

  if (data.hidden[lowerWord] !== undefined) {
    delete data.hidden[lowerWord]
    changed = true
  }

  if (changed) {
    saveStudyData(data)
  }

  return changed
}
