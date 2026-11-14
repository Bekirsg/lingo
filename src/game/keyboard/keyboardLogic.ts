/**
 * LİNGO v2 Klavye ve Tahta Boyutlandırma Mantığı (Saf Fonksiyonlar)
 *
 * SPEC-v2 Bölüm 9, 10 (Rev. 3):
 * - 29 harfli Türkçe Q düzen (Q, W, X yok).
 * - Satır 1 (10): E R T Y U I O P Ğ Ü
 * - Satır 2 (11): A S D F G H J K L Ş İ
 * - Satır 3 (10): [GÖNDER] Z C V B N M Ö Ç [SİL]
 * - PAS klavye satırında DEĞİL; klavyenin üstünde sağa yaslı bağımsız düğmedir.
 * - COMMIT_ON = 'down' (harf basılınca anında yazılır).
 * - SHOW_PREVIEW_BUBBLE = false (balon kapalı, anında basılı efekti).
 * - calculateTileSize: ekrana göre dinamik kutu boyutu hesabı.
 */

import type { Mark } from '../engine'
import type { GuessAttempt } from '../state/types'

/**
 * Klavye Düzeni Sabiti (Tek yerden değiştirilebilir)
 */
export const KEY_LAYOUT = {
  row1: ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'] as const,
  row2: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'] as const,
  row3Letters: ['Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç'] as const,
}

export type CommitMode = 'down' | 'up'

/** Harfin basınca mı kalkınca mı yazılacağını belirler (Varsayılan: 'down') */
export const COMMIT_ON: CommitMode = 'down'

/** Önizleme balonunun gösterilip gösterilmeyeceğini belirler (Varsayılan: false) */
export const SHOW_PREVIEW_BUBBLE: boolean = false

export interface KeyItem {
  id: string
  label: string
  isAction: boolean
  weight: number
}

/**
 * 3. Satır Öğeleri: [GÖNDER] Z C V B N M Ö Ç [SİL]
 * GÖNDER ~2 birim, SİL ~1.5 birim genişlikte
 */
export const ROW_3_ITEMS: KeyItem[] = [
  { id: 'SUBMIT', label: 'GÖNDER', isAction: true, weight: 2.0 },
  ...KEY_LAYOUT.row3Letters.map((char) => ({
    id: char,
    label: char,
    isAction: false,
    weight: 1.0,
  })),
  { id: 'DELETE', label: 'SİL', isAction: true, weight: 1.5 },
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
 * - Kenar tuşları ekran sınırına kadar genişletilmiş hit toleransına sahiptir.
 * - Tuşlar arası boşluklarda en yakın tuş seçilir.
 */
export function resolveKeyAtPoint(
  rects: KeyRect[],
  x: number,
  y: number,
  maxDistance: number = 36,
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
  hasCommitted: boolean
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

export interface GestureResult {
  nextState: GestureState
  action?: KeyboardAction
}

export function createInitialGestureState(): GestureState {
  return { pointers: {} }
}

/**
 * Çoklu dokunma (multi-pointer) hareket azaltıcı fonksiyonu.
 * COMMIT_ON = 'down' modunda basınca anında harfi commit eder.
 */
export function gestureReducer(
  state: GestureState,
  event: GestureEvent,
  mode: CommitMode = COMMIT_ON,
): GestureResult {
  const nextPointers = { ...state.pointers }

  switch (event.type) {
    case 'POINTER_DOWN': {
      const isAction = Boolean(event.isAction)
      let committed = false
      let action: KeyboardAction | undefined

      if (event.keyId === 'DELETE') {
        action = { type: 'DELETE_START' }
      } else if (!isAction && mode === 'down') {
        // COMMIT_ON === 'down' -> anında harf yazılır
        committed = true
        action = {
          type: 'CHAR',
          char: getCharForLetterKey(event.keyId),
          keyId: event.keyId,
        }
      }

      nextPointers[event.pointerId] = {
        pointerId: event.pointerId,
        startKeyId: event.keyId,
        currentKeyId: event.keyId,
        isAction,
        hasCommitted: committed,
      }

      return {
        nextState: { pointers: nextPointers },
        action,
      }
    }

    case 'POINTER_MOVE': {
      const existing = nextPointers[event.pointerId]
      if (!existing) return { nextState: state }

      nextPointers[event.pointerId] = {
        ...existing,
        currentKeyId: event.keyId,
      }

      // mode === 'down' iken kaydırınca ek harf yazılmaz (hasCommitted: true)
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

      // mode === 'up' iken parmak kalktığında bulunduğu tuştan girilir
      if (mode === 'up' && !existing.hasCommitted && existing.currentKeyId && !existing.isAction) {
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
 * SİL: basılı tutulunca 400 ms sonra tekrarlı siler (80 ms aralık, 1 sn sonra 50 ms).
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

/**
 * Tahta Kutu Boyutu Hesabı (Saf Fonksiyon)
 *
 * SPEC-v2 Bölüm 9 (Rev. 3):
 * Kutu boyutu = min(kullanılabilir genişlik / sütun sayısı, kullanılabilir yükseklik / 5)
 * Kareler kare, üst sınır ~64 px.
 */
export interface BoardSizeInput {
  availableWidth: number
  availableHeight: number
  letterCount: number
  rowCount?: number
  maxTileSize?: number
  minTileSize?: number
  gapX?: number
  gapY?: number
  paddingX?: number
  paddingY?: number
}

export interface BoardSizeOutput {
  tileSize: number
  boardWidth: number
  boardHeight: number
}

export function calculateTileSize(input: BoardSizeInput): BoardSizeOutput {
  const rowCount = input.rowCount ?? 5
  const maxTileSize = input.maxTileSize ?? 64
  const minTileSize = input.minTileSize ?? 28
  const gapX = input.gapX ?? 6
  const gapY = input.gapY ?? 6
  const paddingX = input.paddingX ?? 16
  const paddingY = input.paddingY ?? 8

  const usableWidth = Math.max(0, input.availableWidth - paddingX - (input.letterCount - 1) * gapX)
  const usableHeight = Math.max(0, input.availableHeight - paddingY - (rowCount - 1) * gapY)

  const maxFromWidth = Math.floor(usableWidth / input.letterCount)
  const maxFromHeight = Math.floor(usableHeight / rowCount)

  const tileSize = Math.max(minTileSize, Math.min(maxTileSize, maxFromWidth, maxFromHeight))
  const boardWidth = input.letterCount * tileSize + (input.letterCount - 1) * gapX
  const boardHeight = rowCount * tileSize + (rowCount - 1) * gapY

  return { tileSize, boardWidth, boardHeight }
}
