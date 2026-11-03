/**
 * LİNGO v2 Klavye Mantığı (Saf Fonksiyonlar)
 *
 * SPEC-v2 Bölüm 9, 10, 11.1 (madde 11-12):
 * - 29 harfli Türkçe düzen (Q, W, X yok).
 * - Satır 1 (10): E R T Y U I O P Ğ Ü
 * - Satır 2 (10): A S D F G H J K L Ş
 * - Satır 3 (9): İ Z C V B N M Ö Ç
 * - Alt eylem satırı: [PAS][SİL][GÖNDER] (ACTION_ROW tek sabit).
 * - resolveKeyAtPoint: tuş içi ve en yakın tuş çözümleme.
 * - gestureReducer: pointerdown, pointermove, pointerup, pointercancel yönetimi.
 * - deleteRepeatSchedule: basılı tutunca kademeli silme zamanlayıcısı.
 * - keyStates: yeşil > sarı > kırmızı öncelikli klavye renk durumu.
 */

import type { Mark } from '../engine'
import type { GuessAttempt } from '../state/types'

export const KEYBOARD_ROW_1 = ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'] as const
export const KEYBOARD_ROW_2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş'] as const
export const KEYBOARD_ROW_3 = ['İ', 'Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç'] as const

export interface ActionKeyConfig {
  id: 'PAS' | 'DELETE' | 'SUBMIT'
  label: string
  weight: number
}

/**
 * SPEC-v2 Bölüm 9.1:
 * Alt eylem satırı tek bir sabitte tutulur.
 * Sıralama ve ağırlıklar: [PAS][SİL][GÖNDER] ≈ 1 : 1.3 : 1.7
 */
export const ACTION_ROW: ActionKeyConfig[] = [
  { id: 'PAS', label: 'PAS', weight: 1.0 },
  { id: 'DELETE', label: 'SİL', weight: 1.3 },
  { id: 'SUBMIT', label: 'GÖNDER', weight: 1.7 },
]

export interface KeyRect {
  id: string
  x: number
  y: number
  width: number
  height: number
  isAction?: boolean
}

/**
 * Türkçe harf tuşunun üreteceği küçük harfi verir.
 * 'I' tuşu 'ı', 'İ' tuşu 'i' üretir.
 */
export function getCharForLetterKey(keyId: string): string {
  if (keyId === 'I') return 'ı'
  if (keyId === 'İ') return 'i'
  return keyId.toLocaleLowerCase('tr-TR')
}

/**
 * Verilen (x, y) noktasındaki tuşu çözer.
 * 1. Eğer nokta bir tuşun içindeyse doğrudan o tuş döner.
 * 2. Tuşlar arası boşluktaysa, maxDistance sınırında en yakın tuş döner.
 * 3. Klavye sınırlarının çok dışındaysa null döner (iptal).
 */
export function resolveKeyAtPoint(
  rects: KeyRect[],
  x: number,
  y: number,
  maxDistance: number = 40,
): string | null {
  if (rects.length === 0) return null

  let closestKey: string | null = null
  let minDistanceSq = Infinity

  for (const rect of rects) {
    const isInsideX = x >= rect.x && x <= rect.x + rect.width
    const isInsideY = y >= rect.y && y <= rect.y + rect.height

    if (isInsideX && isInsideY) {
      return rect.id
    }

    // Dikdörtgenin kenarlarına olan en kısa mesafeyi hesapla
    const dx = isInsideX ? 0 : x < rect.x ? rect.x - x : x - (rect.x + rect.width)
    const dy = isInsideY ? 0 : y < rect.y ? rect.y - y : y - (rect.y + rect.height)
    const distSq = dx * dx + dy * dy

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq
      closestKey = rect.id
    }
  }

  if (minDistanceSq <= maxDistance * maxDistance) {
    return closestKey
  }

  return null
}

export interface PointerTrack {
  pointerId: number
  startKeyId: string
  currentKeyId: string | null
  isAction: boolean
}

export interface GestureState {
  pointers: Record<number, PointerTrack>
}

export type GestureEvent =
  | { type: 'POINTER_DOWN'; pointerId: number; keyId: string; isAction?: boolean }
  | { type: 'POINTER_MOVE'; pointerId: number; keyId: string | null }
  | { type: 'POINTER_UP'; pointerId: number }
  | { type: 'POINTER_CANCEL'; pointerId: number }

export type KeyboardAction =
  | { type: 'CHAR'; char: string; keyId: string }
  | { type: 'DELETE_START' }
  | { type: 'DELETE_STOP' }
  | { type: 'SUBMIT' }
  | { type: 'PASS' }

export interface GestureResult {
  nextState: GestureState
  action?: KeyboardAction
}

export function createInitialGestureState(): GestureState {
  return { pointers: {} }
}

/**
 * Çoklu dokunma (multi-pointer) hareket azaltıcı fonksiyonu.
 */
export function gestureReducer(state: GestureState, event: GestureEvent): GestureResult {
  const nextPointers = { ...state.pointers }

  switch (event.type) {
    case 'POINTER_DOWN': {
      nextPointers[event.pointerId] = {
        pointerId: event.pointerId,
        startKeyId: event.keyId,
        currentKeyId: event.keyId,
        isAction: Boolean(event.isAction),
      }

      if (event.keyId === 'DELETE') {
        return {
          nextState: { pointers: nextPointers },
          action: { type: 'DELETE_START' },
        }
      }

      return { nextState: { pointers: nextPointers } }
    }

    case 'POINTER_MOVE': {
      const existing = nextPointers[event.pointerId]
      if (!existing) return { nextState: state }

      nextPointers[event.pointerId] = {
        ...existing,
        currentKeyId: event.keyId,
      }

      return { nextState: { pointers: nextPointers } }
    }

    case 'POINTER_UP': {
      const existing = nextPointers[event.pointerId]
      if (!existing) return { nextState: state }

      delete nextPointers[event.pointerId]
      const nextState = { pointers: nextPointers }

      // SİL tuşu bırakıldıysa durdur
      if (existing.startKeyId === 'DELETE') {
        return {
          nextState,
          action: { type: 'DELETE_STOP' },
        }
      }

      // GÖNDER: parmak hâlâ aynı tuşun üzerindeyse çalışır
      if (existing.startKeyId === 'SUBMIT') {
        if (existing.currentKeyId === 'SUBMIT') {
          return { nextState, action: { type: 'SUBMIT' } }
        }
        return { nextState }
      }

      // PAS: parmak hâlâ aynı tuşun üzerindeyse çalışır
      if (existing.startKeyId === 'PAS') {
        if (existing.currentKeyId === 'PAS') {
          return { nextState, action: { type: 'PASS' } }
        }
        return { nextState }
      }

      // Harf tuşu: parmak kalktığında bulunduğu tuştan girilir
      if (existing.currentKeyId && !existing.isAction) {
        const char = getCharForLetterKey(existing.currentKeyId)
        return {
          nextState,
          action: { type: 'CHAR', char, keyId: existing.currentKeyId },
        }
      }

      return { nextState }
    }

    case 'POINTER_CANCEL': {
      const existing = nextPointers[event.pointerId]
      delete nextPointers[event.pointerId]
      const nextState = { pointers: nextPointers }

      if (existing?.startKeyId === 'DELETE') {
        return {
          nextState,
          action: { type: 'DELETE_STOP' },
        }
      }

      return { nextState }
    }
  }
}

/**
 * SPEC-v2 Bölüm 9.3 madde 5:
 * SİL: basılı tutulunca ~400 ms sonra tekrarlı siler (~80 ms aralık, ~1 sn sonra ~50 ms).
 * Parmak kalkınca, pointercancel'da, duraklamada ve visibilitychange'de durur.
 */
export interface RepeatScheduleController {
  start: () => void
  stop: () => void
  isRunning: () => boolean
}

export function createDeleteRepeatSchedule(
  onTick: () => void,
  options?: {
    initialDelayMs?: number
    normalIntervalMs?: number
    fastIntervalMs?: number
    fastThresholdMs?: number
  },
): RepeatScheduleController {
  const initialDelay = options?.initialDelayMs ?? 400
  const normalInterval = options?.normalIntervalMs ?? 80
  const fastInterval = options?.fastIntervalMs ?? 50
  const fastThreshold = options?.fastThresholdMs ?? 1000

  let initialTimer: ReturnType<typeof setTimeout> | null = null
  let intervalTimer: ReturnType<typeof setInterval> | null = null
  let startTime = 0
  let isFast = false
  let running = false

  const cleanup = () => {
    if (initialTimer !== null) {
      clearTimeout(initialTimer)
      initialTimer = null
    }
    if (intervalTimer !== null) {
      clearInterval(intervalTimer)
      intervalTimer = null
    }
    running = false
  }

  const start = () => {
    cleanup()
    running = true
    startTime = Date.now()
    isFast = false

    initialTimer = setTimeout(() => {
      if (!running) return
      onTick()

      intervalTimer = setInterval(() => {
        if (!running) return
        const elapsed = Date.now() - startTime
        if (!isFast && elapsed >= fastThreshold) {
          isFast = true
          if (intervalTimer !== null) clearInterval(intervalTimer)
          intervalTimer = setInterval(() => {
            if (!running) return
            onTick()
          }, fastInterval)
        }
        onTick()
      }, normalInterval)
    }, initialDelay)
  }

  return {
    start,
    stop: cleanup,
    isRunning: () => running,
  }
}

/**
 * SPEC-v2 Bölüm 9.1:
 * Tuş renkleri bilinen harf durumunu yansıtır (yeşil > sarı > kırmızı önceliği).
 */
export function computeKeyStates(guesses: GuessAttempt[]): Record<string, Mark> {
  const statuses: Record<string, Mark> = {}

  for (const { guess, marks } of guesses) {
    const chars = Array.from(guess)
    chars.forEach((char, index) => {
      const lower = char.toLocaleLowerCase('tr-TR')
      const mark = marks[index]
      const current = statuses[lower]

      if (mark === 'green') {
        statuses[lower] = 'green'
      } else if (mark === 'yellow' && current !== 'green') {
        statuses[lower] = 'yellow'
      } else if (mark === 'red' && !current) {
        statuses[lower] = 'red'
      }
    })
  }

  return statuses
}
