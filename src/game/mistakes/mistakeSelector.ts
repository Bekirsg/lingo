/**
 * LİNGO v2 — Hatalarımla Çalış: Kelime Havuzu ve Seçim Mantığı
 * SPEC-v2 Bölüm 6.5, 7.2 & 12/V2-M8
 */

import type { WordRepository } from '../../data/words'
import type { MissedWordRecord } from '../../analytics/types'
import { letterCount } from '../engine'

export const MISTAKE_POOL_SOURCES = ['yarisma', 'calisma'] as const

export interface StudyCandidate {
  word: string
  weight: number // y + c
  letterCount: number
  isBonus: boolean
  definition?: string
}

export interface StudyablePool {
  byLength: Record<number, StudyCandidate[]>
  bonus: StudyCandidate[]
  all: StudyCandidate[]
  totalCount: number
}

export interface StudyListItem {
  word: string
  total: number
  y: number
  c: number
  last: number
  length: number
  firstLetter: string
  isLearned: boolean
  isHidden: boolean
}

export interface GetStudyListOptions {
  missedWordsMap: Record<string, MissedWordRecord>
  studyData?: {
    learned?: Record<string, number>
    hidden?: Record<string, number>
  }
  filter?: {
    type?: 'all' | 'length' | 'initial'
    length?: number
    initial?: string
  }
  minThreshold?: number
  includeHidden?: boolean
  includeLearned?: boolean
}

/**
 * Plan 6.1: Tek Saf Kaynak Fonksiyonu (getStudyList)
 * Hem Analizler ekranını ("En Çok Bilinemeyen Kelimeler") hem "Hatalarım" düzenleme ekranını
 * aynı kaynaktan besler.
 * - Düzenleme ekranı tüm kaçırılan kelimeleri (minThreshold = 1) listeler.
 * - Analizler özet kutusu en az 2 kez kaçırılanları (minThreshold = 2) filtreler.
 */
export function getStudyList(options: GetStudyListOptions): StudyListItem[] {
  const {
    missedWordsMap,
    studyData,
    filter,
    minThreshold = 1,
    includeHidden = false,
    includeLearned = true,
  } = options

  const list: StudyListItem[] = []
  const initialLower = filter?.initial?.toLocaleLowerCase('tr-TR')

  for (const [rawWord, record] of Object.entries(missedWordsMap || {})) {
    const total = (record?.y || 0) + (record?.c || 0)
    if (total < minThreshold) continue

    const word = rawWord.toLocaleLowerCase('tr-TR')
    const isLearned = Boolean(studyData?.learned && studyData.learned[word] !== undefined)
    const isHidden = Boolean(studyData?.hidden && studyData.hidden[word] !== undefined)

    if (!includeHidden && isHidden) continue
    if (!includeLearned && isLearned) continue

    const len = letterCount(word)
    if (filter?.type === 'length' && filter.length && len !== filter.length) {
      continue
    }

    const firstLetter = word.charAt(0).toLocaleLowerCase('tr-TR')
    if (filter?.type === 'initial' && initialLower && firstLetter !== initialLower) {
      continue
    }

    list.push({
      word,
      total,
      y: record?.y || 0,
      c: record?.c || 0,
      last: record?.last || 0,
      length: len,
      firstLetter,
      isLearned,
      isHidden,
    })
  }

  // Sıralama: Toplam kaçırma azalan, son tarih azalan, alfabetik artan
  list.sort((a, b) => b.total - a.total || b.last - a.last || a.word.localeCompare(b.word, 'tr-TR'))

  return list
}

/**
 * missedWords ve be:v2:study (learned ve hidden) verilerinden çalışılabilir kelime havuzunu çıkarır.
 *
 * GELECEĞE DÖNÜK GÜVENLİK (SPEC M8 & Aşama 4):
 * - learned ve hidden kelimeler havuzdan dışlanır (çalışma havuzuna ve kart sayısına dahil edilmez).
 * - missedWords içindeki bir kelime güncel kelime havuzunda (words-4..7 veya bonus verisinde tanımıyla)
 * bulunmayabilir. Bulunmayan kelimeler SESSİZCE ATLANIR (çökme yok, kart sayısına ve seçime
 * dahil edilmez, depolamadan silinmez).
 */
export function getStudyableCandidates(
  missedWordsMap: Record<string, MissedWordRecord>,
  learnedWordsMap: Record<string, number>,
  repo: WordRepository,
  usedInSession?: Set<string>,
  hiddenWordsMap?: Record<string, number>
): StudyablePool {
  const byLength: Record<number, StudyCandidate[]> = {
    4: [],
    5: [],
    6: [],
    7: [],
  }
  const bonus: StudyCandidate[] = []
  const all: StudyCandidate[] = []

  const bonusItems = repo.getBonusWords ? repo.getBonusWords() : []
  const bonusMap = new Map<string, string>()
  for (const b of bonusItems) {
    if (b.w && b.d) {
      bonusMap.set(b.w.toLocaleLowerCase('tr-TR'), b.d)
    }
  }

  for (const [rawWord, record] of Object.entries(missedWordsMap || {})) {
    const word = rawWord.toLocaleLowerCase('tr-TR')

    // 1) Ağırlık hesabı (y + c)
    let weight = 0
    if (record) {
      for (const src of MISTAKE_POOL_SOURCES) {
        if (src === 'yarisma') weight += record.y || 0
        if (src === 'calisma') weight += record.c || 0
      }
    }
    if (weight <= 0) continue

    // 2) Öğrenilmiş ve gizlenmiş kelimeler hariç tutulur (Plan 6.2)
    if (learnedWordsMap && learnedWordsMap[word] !== undefined) {
      continue
    }
    if (hiddenWordsMap && hiddenWordsMap[word] !== undefined) {
      continue
    }

    // 3) Oturum içi tekrar kontrolü (istenmişse)
    if (usedInSession && usedInSession.has(word)) {
      continue
    }

    const len = letterCount(word)

    // 4) Geleceğe dönük güvenlik kontrolü:
    // Bonus kelimesi mi? (Tanımı mevcut olmalı)
    if (bonusMap.has(word)) {
      const def = bonusMap.get(word)!
      const candidate: StudyCandidate = {
        word,
        weight,
        letterCount: len,
        isBonus: true,
        definition: def,
      }
      bonus.push(candidate)
      all.push(candidate)
      continue
    }

    // Normal kelime mi? (words-4..7 havuzunda var mı?)
    if (len >= 4 && len <= 7) {
      const isValid = repo.isValidWord
        ? repo.isValidWord(word, len)
        : repo.getWords(len).includes(word)

      if (isValid) {
        const candidate: StudyCandidate = {
          word,
          weight,
          letterCount: len,
          isBonus: false,
        }
        if (!byLength[len]) byLength[len] = []
        byLength[len].push(candidate)
        all.push(candidate)
      }
    }
    // Sözlükte bulunmayan kelimeler sessizce atlanır
  }

  return {
    byLength,
    bonus,
    all,
    totalCount: all.length,
  }
}

/**
 * Ağırlıklı rastgele seçim (Weighted Random Selection).
 * Olasılık weight = (y + c) ile doğru orantılıdır.
 *
 * @param candidates Aday listesi
 * @param rng Testler için tohumlu / özel rastgele sayı üreteci (varsayılan: Math.random)
 */
export function pickWeightedCandidate(
  candidates: StudyCandidate[],
  rng: () => number = Math.random
): StudyCandidate | null {
  if (!candidates || candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]

  let totalWeight = 0
  for (const c of candidates) {
    totalWeight += c.weight
  }
  if (totalWeight <= 0) {
    const idx = Math.floor(rng() * candidates.length)
    return candidates[idx]
  }

  const threshold = rng() * totalWeight
  let cumulative = 0

  for (const c of candidates) {
    cumulative += c.weight
    if (cumulative >= threshold) {
      return c
    }
  }

  return candidates[candidates.length - 1]
}

export type MistakeStep = 4 | 5 | 6 | 7 | 'bonus'

const STEP_SEQUENCE: MistakeStep[] = [4, 5, 6, 7, 'bonus']

/**
 * Döngü sırasına göre (4 -> 5 -> 6 -> 7 -> bonus -> 4...) sıradaki uygun adımı ve kelimeyi seçer.
 * Uygun kelimesi olmayan adımlar atlanır.
 * Hiçbir adımda kullanılabilir kelime kalmamışsa null döner (oturum sonu).
 *
 * @param currentStep Mevcut adım (veya ilk başlangıç için undefined)
 * @param pool Çalışılabilir kelime havuzu (oturumda henüz kullanılmamışlar)
 * @param rng Ağırlıklı seçim için rastgele üreteç
 */
export function getNextMistakeStep(
  currentStep: MistakeStep | undefined,
  pool: StudyablePool,
  rng: () => number = Math.random
): { nextStep: MistakeStep; candidate: StudyCandidate } | null {
  if (pool.totalCount === 0) return null

  const startIndex = currentStep === undefined
    ? 0
    : (STEP_SEQUENCE.indexOf(currentStep) + 1) % STEP_SEQUENCE.length

  // Döngüdeki 5 adımı sırayla tara
  for (let i = 0; i < STEP_SEQUENCE.length; i++) {
    const stepIdx = (startIndex + i) % STEP_SEQUENCE.length
    const step = STEP_SEQUENCE[stepIdx]

    let candidates: StudyCandidate[] = []
    if (step === 'bonus') {
      candidates = pool.bonus
    } else {
      candidates = pool.byLength[step] || []
    }

    if (candidates.length > 0) {
      const picked = pickWeightedCandidate(candidates, rng)
      if (picked) {
        return {
          nextStep: step,
          candidate: picked,
        }
      }
    }
  }

  return null
}
