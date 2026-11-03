import { useEffect, useCallback, useState, useRef } from 'react'
import type { Mark } from '../game/engine'
import { normalize } from '../game/engine'
import {
  KEYBOARD_ROW_1,
  KEYBOARD_ROW_2,
  KEYBOARD_ROW_3,
  ACTION_ROW,
  getCharForLetterKey,
  resolveKeyAtPoint,
  gestureReducer,
  createInitialGestureState,
  createDeleteRepeatSchedule,
  type KeyRect,
  type GestureState,
  type RepeatScheduleController,
} from '../game/keyboard/keyboardLogic'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

export interface KeyboardProps {
  statuses: Record<string, Mark>
  onChar: (char: string) => void
  onDelete: () => void
  onSubmit: () => void
  onPass?: () => void
  /** Tüm kutular dolmadan GÖNDER pasif kalmalıdır */
  canSubmit: boolean
  /** Bonus sorularında PAS yoktur (buton pasif/soluk kalır) */
  hasPass?: boolean
  disabled?: boolean
}

interface PreviewBalloonState {
  keyId: string
  label: string
  x: number
  y: number
  width: number
}

export default function Keyboard({
  statuses,
  onChar,
  onDelete,
  onSubmit,
  onPass,
  canSubmit,
  hasPass = true,
  disabled = false,
}: KeyboardProps) {
  // İki aşamalı PAS onay durumu (SPEC-v2 Bölüm 10.2)
  const [isPassConfirming, setIsPassConfirming] = useState(false)
  const passTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Önizleme balonu (SPEC-v2 Bölüm 9.3 madde 1)
  const [preview, setPreview] = useState<PreviewBalloonState | null>(null)
  const activeHighlightedKeyRef = useRef<string | null>(null)

  // Klavye DOM referansı ve önbelleklenen tuş dikdörtgenleri
  const containerRef = useRef<HTMLDivElement>(null)
  const keyRectsCacheRef = useRef<KeyRect[]>([])

  // Hareket durum makinesi (saf fonksiyon tabanlı)
  const gestureStateRef = useRef<GestureState>(createInitialGestureState())
  const repeatScheduleRef = useRef<RepeatScheduleController | null>(null)

  // PAS onayını sıfırla
  const resetPassConfirm = useCallback(() => {
    if (passTimerRef.current !== null) {
      clearTimeout(passTimerRef.current)
      passTimerRef.current = null
    }
    setIsPassConfirming(false)
  }, [])

  // SİL tekrarlayıcı zamanlayıcıyı oluştur ve bağla
  useEffect(() => {
    repeatScheduleRef.current = createDeleteRepeatSchedule(() => {
      if (!disabled) {
        playSound('key_press')
        triggerHaptic('tap')
        onDelete()
      }
    })

    return () => {
      repeatScheduleRef.current?.stop()
      if (passTimerRef.current !== null) {
        clearTimeout(passTimerRef.current)
      }
    }
  }, [disabled, onDelete])

  // Masaüstü fiziksel klavye desteği
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return

      // Form elemanında ise klavyeyi dinleme
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Q, W, X harfleri yok sayılır (SPEC-v2 Bölüm 9.1)
      if (e.key === 'q' || e.key === 'Q' || e.key === 'w' || e.key === 'W' || e.key === 'x' || e.key === 'X') {
        e.preventDefault()
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        resetPassConfirm()
        if (canSubmit) {
          onSubmit()
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        resetPassConfirm()
        onDelete()
      } else if (e.key.length === 1) {
        resetPassConfirm()
        const norm = normalize(e.key)
        if (/^[a-zçğıöşü]$/.test(norm)) {
          e.preventDefault()
          onChar(norm)
        }
      }
    },
    [disabled, canSubmit, onChar, onDelete, onSubmit, resetPassConfirm],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Görünürlük değiştiğinde veya pencere bulanıklaştığında zamanlayıcıları durdur
  useEffect(() => {
    const handleVisibilityOrBlur = () => {
      repeatScheduleRef.current?.stop()
      setPreview(null)
      gestureStateRef.current = createInitialGestureState()
    }

    document.addEventListener('visibilitychange', handleVisibilityOrBlur)
    window.addEventListener('blur', handleVisibilityOrBlur)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrBlur)
      window.removeEventListener('blur', handleVisibilityOrBlur)
    }
  }, [])

  // Tuş dikdörtgenlerini önbellekle
  const updateKeyRectsCache = useCallback(() => {
    if (!containerRef.current) return
    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>('button[data-key]')
    const rects: KeyRect[] = []
    buttons.forEach((btn) => {
      const keyId = btn.getAttribute('data-key')
      if (!keyId) return
      const r = btn.getBoundingClientRect()
      rects.push({
        id: keyId,
        x: r.left,
        y: r.top,
        width: r.width,
        height: r.height,
        isAction: keyId === 'PAS' || keyId === 'DELETE' || keyId === 'SUBMIT',
      })
    })
    keyRectsCacheRef.current = rects
  }, [])

  // İki aşamalı PAS tetikleme fonksiyonu
  const handlePassPress = useCallback(() => {
    if (!hasPass || !onPass || disabled) return

    if (!isPassConfirming) {
      // 1. Aşama: "PAS?" vurgusu ve 2 sn sayaç
      playSound('key_press')
      triggerHaptic('tap')
      setIsPassConfirming(true)
      if (passTimerRef.current !== null) clearTimeout(passTimerRef.current)
      passTimerRef.current = setTimeout(() => {
        setIsPassConfirming(false)
        passTimerRef.current = null
      }, 2000)
    } else {
      // 2. Aşama: 2 sn içinde ikinci dokunuş -> PAS uygulanır
      resetPassConfirm()
      onPass()
    }
  }, [hasPass, onPass, disabled, isPassConfirming, resetPassConfirm])

  // Önizleme balonunu güncelle
  const showPreviewForKey = useCallback((keyId: string) => {
    if (keyId === 'PAS' || keyId === 'DELETE' || keyId === 'SUBMIT') {
      setPreview(null)
      return
    }

    const rect = keyRectsCacheRef.current.find((r) => r.id === keyId)
    if (!rect || !containerRef.current) {
      setPreview(null)
      return
    }

    const containerRect = containerRef.current.getBoundingClientRect()
    const relativeX = rect.x - containerRect.left + rect.width / 2
    const relativeY = rect.y - containerRect.top

    setPreview({
      keyId,
      label: keyId,
      x: relativeX,
      y: relativeY,
      width: rect.width,
    })
  }, [])

  // ─── Pointer Olayları (Pointer Events) ──────────────────────────────

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return

    // Dokunma yakalamayı başlat
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Bazı tarayıcılarda desteklenmeyebilir
    }

    updateKeyRectsCache()
    const keyId = resolveKeyAtPoint(keyRectsCacheRef.current, e.clientX, e.clientY)
    if (!keyId) return

    const isAction = keyId === 'PAS' || keyId === 'DELETE' || keyId === 'SUBMIT'
    const result = gestureReducer(gestureStateRef.current, {
      type: 'POINTER_DOWN',
      pointerId: e.pointerId,
      keyId,
      isAction,
    })
    gestureStateRef.current = result.nextState

    if (result.action?.type === 'DELETE_START') {
      resetPassConfirm()
      playSound('key_press')
      triggerHaptic('tap')
      onDelete()
      repeatScheduleRef.current?.start()
    } else if (!isAction) {
      resetPassConfirm()
      playSound('key_press')
      triggerHaptic('tap')
      activeHighlightedKeyRef.current = keyId
      showPreviewForKey(keyId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    const tracked = gestureStateRef.current.pointers[e.pointerId]
    if (!tracked) return

    const keyId = resolveKeyAtPoint(keyRectsCacheRef.current, e.clientX, e.clientY)
    const result = gestureReducer(gestureStateRef.current, {
      type: 'POINTER_MOVE',
      pointerId: e.pointerId,
      keyId,
    })
    gestureStateRef.current = result.nextState

    if (!tracked.isAction) {
      if (keyId && keyId !== activeHighlightedKeyRef.current) {
        activeHighlightedKeyRef.current = keyId
        showPreviewForKey(keyId)
      } else if (!keyId) {
        activeHighlightedKeyRef.current = null
        setPreview(null)
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      // Sessizce geç
    }

    const tracked = gestureStateRef.current.pointers[e.pointerId]
    const result = gestureReducer(gestureStateRef.current, {
      type: 'POINTER_UP',
      pointerId: e.pointerId,
    })
    gestureStateRef.current = result.nextState

    setPreview(null)
    activeHighlightedKeyRef.current = null

    if (tracked?.startKeyId === 'DELETE') {
      repeatScheduleRef.current?.stop()
    }

    if (!result.action || disabled) return

    switch (result.action.type) {
      case 'CHAR':
        resetPassConfirm()
        onChar(result.action.char)
        break
      case 'SUBMIT':
        resetPassConfirm()
        if (canSubmit) {
          playSound('key_press')
          triggerHaptic('tap')
          onSubmit()
        }
        break
      case 'PASS':
        handlePassPress()
        break
      case 'DELETE_STOP':
        repeatScheduleRef.current?.stop()
        break
    }
  }

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      // Sessizce geç
    }

    gestureReducer(gestureStateRef.current, {
      type: 'POINTER_CANCEL',
      pointerId: e.pointerId,
    })
    repeatScheduleRef.current?.stop()
    setPreview(null)
    activeHighlightedKeyRef.current = null
  }

  // Tuş stilini belirle
  const getKeyClass = (char: string) => {
    const lower = getCharForLetterKey(char)
    const status = statuses[lower]

    if (status === 'green') {
      return 'bg-emerald-600 border-emerald-400 text-white font-black shadow-sm shadow-emerald-600/40'
    }
    if (status === 'yellow') {
      return 'bg-amber-500 border-amber-300 text-slate-950 font-black shadow-sm shadow-amber-500/40'
    }
    if (status === 'red') {
      return 'bg-slate-900/90 border-transparent text-slate-500 opacity-60'
    }
    return 'bg-slate-800/90 hover:bg-slate-700/90 border-white/10 text-white shadow-sm'
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(e) => e.preventDefault()}
      className="
        w-full max-w-[430px] px-1 pb-2 sm:pb-3 pt-1 flex flex-col gap-1 sm:gap-1.5
        select-none shrink-0 relative
        touch-none
        [-webkit-user-select:none]
        [-webkit-touch-callout:none]
      "
      style={{
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      role="region"
      aria-label="29 Harfli Türkçe Ekran Klavyesi"
    >
      {/* ─── Önizleme Balonu (SPEC-v2 Bölüm 9.3 madde 1) ─── */}
      {preview && (
        <div
          className="
            absolute pointer-events-none z-30 flex items-center justify-center
            font-black text-2xl text-white rounded-2xl
            bg-violet-600 border-2 border-violet-300 shadow-2xl
            -translate-x-1/2 -translate-y-[115%] animate-fade-in
          "
          style={{
            left: preview.x,
            top: preview.y,
            width: Math.max(preview.width * 1.3, 46),
            height: 54,
          }}
        >
          {preview.label}
        </div>
      )}

      {/* ─── 1. Satır (10 Harf): E R T Y U I O P Ğ Ü ─── */}
      <div className="flex justify-center gap-0.5 sm:gap-1 w-full">
        {KEYBOARD_ROW_1.map((char) => (
          <button
            key={char}
            data-key={char}
            type="button"
            disabled={disabled}
            className={`
              flex-1 h-11 sm:h-12 rounded-lg text-xs sm:text-base font-bold
              border transition-all duration-150 active:scale-95
              flex items-center justify-center p-0 min-w-0
              ${getKeyClass(char)}
            `}
          >
            {char}
          </button>
        ))}
      </div>

      {/* ─── 2. Satır (10 Harf): A S D F G H J K L Ş ─── */}
      <div className="flex justify-center gap-0.5 sm:gap-1 w-full">
        {KEYBOARD_ROW_2.map((char) => (
          <button
            key={char}
            data-key={char}
            type="button"
            disabled={disabled}
            className={`
              flex-1 h-11 sm:h-12 rounded-lg text-xs sm:text-base font-bold
              border transition-all duration-150 active:scale-95
              flex items-center justify-center p-0 min-w-0
              ${getKeyClass(char)}
            `}
          >
            {char}
          </button>
        ))}
      </div>

      {/* ─── 3. Satır (9 Harf): İ Z C V B N M Ö Ç ─── */}
      <div className="flex justify-center gap-0.5 sm:gap-1 w-full px-2 sm:px-3">
        {KEYBOARD_ROW_3.map((char) => (
          <button
            key={char}
            data-key={char}
            type="button"
            disabled={disabled}
            className={`
              flex-1 h-11 sm:h-12 rounded-lg text-xs sm:text-base font-bold
              border transition-all duration-150 active:scale-95
              flex items-center justify-center p-0 min-w-0
              ${getKeyClass(char)}
            `}
          >
            {char}
          </button>
        ))}
      </div>

      {/* ─── 4. Satır (Aksiyon): [PAS][SİL][GÖNDER] (ACTION_ROW Tek Sabit) ─── */}
      <div className="flex justify-center gap-1 sm:gap-1.5 w-full mt-0.5">
        {ACTION_ROW.map((act) => {
          if (act.id === 'PAS') {
            const isPassDisabled = disabled || !hasPass || !onPass
            return (
              <button
                key={act.id}
                data-key="PAS"
                type="button"
                disabled={isPassDisabled}
                className={`
                  flex-[1] h-11 sm:h-12 rounded-lg text-xs sm:text-sm font-black tracking-wider
                  border transition-all duration-150 active:scale-95
                  flex items-center justify-center min-w-0
                  ${
                    isPassDisabled
                      ? 'bg-slate-800/30 text-slate-500 border-white/5 opacity-40 cursor-not-allowed pointer-events-none'
                      : isPassConfirming
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/50 animate-pulse'
                        : 'bg-slate-800/90 hover:bg-slate-700/90 border-white/10 text-rose-300'
                  }
                `}
                title={hasPass ? 'Kelimeyi PAS geç' : 'Bonusta PAS kullanılamaz'}
                aria-label={isPassConfirming ? 'PAS onay bekliyor' : 'Kelimeyi PAS geç'}
              >
                {isPassConfirming ? 'PAS?' : act.label}
              </button>
            )
          }

          if (act.id === 'DELETE') {
            return (
              <button
                key={act.id}
                data-key="DELETE"
                type="button"
                disabled={disabled}
                className="
                  flex-[1.3] h-11 sm:h-12 rounded-lg text-xs sm:text-sm font-bold
                  bg-slate-800/90 hover:bg-slate-700/90 border border-white/10 text-rose-300
                  transition-all duration-150 active:scale-95
                  flex items-center justify-center min-w-0 gap-1
                "
                title="Son harfi sil (basılı tutunca tekrarlar)"
                aria-label="Son harfi sil"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z" />
                </svg>
                <span>{act.label}</span>
              </button>
            )
          }

          if (act.id === 'SUBMIT') {
            const isSubmitDisabled = disabled || !canSubmit
            return (
              <button
                key={act.id}
                data-key="SUBMIT"
                type="button"
                disabled={isSubmitDisabled}
                className={`
                  flex-[1.7] h-11 sm:h-12 rounded-lg text-xs sm:text-sm font-black tracking-wider
                  border transition-all duration-150 active:scale-95
                  flex items-center justify-center min-w-0
                  ${
                    !isSubmitDisabled
                      ? 'bg-violet-600 hover:bg-violet-500 text-white border-violet-400 shadow-md shadow-violet-600/40'
                      : 'bg-slate-800/40 text-slate-500 border-white/5 opacity-50 cursor-not-allowed'
                  }
                `}
                aria-label="Tahmini gönder"
              >
                {act.label}
              </button>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}
