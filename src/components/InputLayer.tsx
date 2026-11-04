/**
 * LİNGO v2 — Girdi Katmanı (InputLayer)
 *
 * SPEC-v2 Bölüm 9 & Kullanıcı Gereksinimleri:
 * - İki giriş modu:
 *   1) 'game': 29 harfli ekran klavyesi (Keyboard.tsx)
 *   2) 'system': Mobil cihazın kendi klavyesi + kompakt eylem çubuğu [PAS] ... [GÖNDER]
 * - Sistem modunda gizli <input> öğesi (fontSize: 16px, iOS zoom engeli, autoCorrect off vb.)
 * - BİL'e basıldığında veya tahtaya dokunulduğunda odağı koruma/yeniden odaklama
 * - Türkçe karakter (I/İ/ı/i) ve q/w/x filtreleme (inputSanitize)
 * - visualViewport ile uyumlu yükseklik
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Mark } from '../game/engine'
import Keyboard from './Keyboard'
import { useInputMode } from '../hooks/useInputMode'
import { sanitizeInput } from '../utils/inputSanitize'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

export interface InputLayerProps {
  statuses: Record<string, Mark>
  onChar: (char: string) => void
  onDelete: () => void
  onSubmit: () => void
  onPass?: () => void
  canSubmit: boolean
  hasPass?: boolean
  disabled?: boolean
  /** Dışarıdan (örn. tahta veya BİL butonundan) odağı tetiklemek için callback kaydı */
  onRegisterFocus?: (focusFn: () => void) => void
}

export default function InputLayer({
  statuses,
  onChar,
  onDelete,
  onSubmit,
  onPass,
  canSubmit,
  hasPass = true,
  disabled = false,
  onRegisterFocus,
}: InputLayerProps) {
  const { isSystemMode } = useInputMode()

  // ─── Sistem Modu Durumları ve Referansları ───────────────────
  const inputRef = useRef<HTMLInputElement>(null)
  const lastDeleteTimeRef = useRef(0)
  const lastSubmitTimeRef = useRef(0)

  // İki aşamalı PAS onay durumu (Sistem modu eylem çubuğu için)
  const [isPassConfirming, setIsPassConfirming] = useState(false)
  const passTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // PAS onayını sıfırla
  const resetPassConfirm = useCallback(() => {
    if (passTimerRef.current !== null) {
      clearTimeout(passTimerRef.current)
      passTimerRef.current = null
    }
    setIsPassConfirming(false)
  }, [])

  // Sentinel tampon değeri (Android Backspace koruması)
  const SENTINEL = '   '

  // Gizli input'a odaklan
  const focusInput = useCallback(() => {
    if (!inputRef.current) return
    try {
      inputRef.current.focus({ preventScroll: true })
      inputRef.current.value = SENTINEL
      inputRef.current.setSelectionRange(SENTINEL.length, SENTINEL.length)
    } catch {
      // Sessizce geç
    }
  }, [])

  // Dışarıya focus fonksiyonunu bildir
  useEffect(() => {
    if (onRegisterFocus) {
      onRegisterFocus(focusInput)
    }
  }, [onRegisterFocus, focusInput])

  // Sistem modunda oyun açıldığında veya kelime değiştiğinde otomatik odaklan
  useEffect(() => {
    if (isSystemMode && !disabled) {
      focusInput()
    }
  }, [isSystemMode, disabled, focusInput])

  // ─── Girdi Tetikleyicileri (Deduplication ile) ───────────────

  const triggerDelete = useCallback(() => {
    const now = Date.now()
    if (now - lastDeleteTimeRef.current < 70) return
    lastDeleteTimeRef.current = now

    resetPassConfirm()
    if (!disabled) {
      playSound('key_press')
      triggerHaptic('tap')
      onDelete()
    }
  }, [disabled, onDelete, resetPassConfirm])

  const triggerSubmit = useCallback(() => {
    const now = Date.now()
    if (now - lastSubmitTimeRef.current < 70) return
    lastSubmitTimeRef.current = now

    resetPassConfirm()
    if (!disabled && canSubmit) {
      playSound('key_press')
      triggerHaptic('tap')
      onSubmit()
    }
  }, [disabled, canSubmit, onSubmit, resetPassConfirm])

  const triggerChars = useCallback(
    (chars: string[]) => {
      if (disabled) return
      resetPassConfirm()
      for (const c of chars) {
        playSound('key_press')
        triggerHaptic('tap')
        onChar(c)
      }
    },
    [disabled, onChar, resetPassConfirm],
  )

  // ─── PAS Butonu Tıklaması ─────────────────────────────────────
  const handlePassPress = useCallback(() => {
    if (disabled || !hasPass) return

    if (!isPassConfirming) {
      setIsPassConfirming(true)
      playSound('key_press')
      triggerHaptic('tap')

      if (passTimerRef.current !== null) {
        clearTimeout(passTimerRef.current)
      }
      passTimerRef.current = setTimeout(() => {
        setIsPassConfirming(false)
        passTimerRef.current = null
      }, 2000)
    } else {
      resetPassConfirm()
      playSound('key_press')
      triggerHaptic('tap')
      onPass?.()
    }
  }, [disabled, hasPass, isPassConfirming, onPass, resetPassConfirm])

  // ─── Gizli Input Olay Dinleyicileri ──────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault()
        triggerDelete()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        triggerSubmit()
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const sanitized = sanitizeInput(e.key)
        if (sanitized.length > 0) {
          e.preventDefault()
          triggerChars(sanitized)
        }
      }
    },
    [triggerDelete, triggerSubmit, triggerChars],
  )

  const handleBeforeInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const native = e.nativeEvent as InputEvent
      if (!native) return

      if (
        native.inputType === 'deleteContentBackward' ||
        native.inputType === 'deleteContentForward' ||
        native.inputType === 'deleteByCut'
      ) {
        e.preventDefault()
        triggerDelete()
      } else if (native.inputType === 'insertLineBreak') {
        e.preventDefault()
        triggerSubmit()
      } else if (native.data) {
        const sanitized = sanitizeInput(native.data)
        if (sanitized.length > 0) {
          e.preventDefault()
          triggerChars(sanitized)
        }
      }
    },
    [triggerDelete, triggerSubmit, triggerChars],
  )

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const val = e.currentTarget.value
      if (val.length < SENTINEL.length) {
        triggerDelete()
      } else if (val.length > SENTINEL.length) {
        const added = val.slice(SENTINEL.length)
        const sanitized = sanitizeInput(added)
        if (sanitized.length > 0) {
          triggerChars(sanitized)
        }
      }

      // Sentinel tamponunu her zaman sıfırla
      e.currentTarget.value = SENTINEL
      e.currentTarget.setSelectionRange(SENTINEL.length, SENTINEL.length)
    },
    [triggerDelete, triggerChars],
  )

  // ─── 1) Oyun Klavyesi Modu ────────────────────────────────────
  if (!isSystemMode) {
    return (
      <Keyboard
        statuses={statuses}
        onChar={onChar}
        onDelete={onDelete}
        onSubmit={onSubmit}
        onPass={onPass}
        canSubmit={canSubmit}
        hasPass={hasPass}
        disabled={disabled}
      />
    )
  }

  // ─── 2) Sistem Klavyesi Modu (Kompakt Eylem Çubuğu) ───────────
  const isPassDisabled = disabled || !hasPass

  return (
    <div className="w-full max-w-[430px] px-2 pb-2 sm:pb-3 flex flex-col shrink-0 select-none relative">
      {/* Gizli Odaklanabilir Input */}
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="send"
        tabIndex={-1}
        aria-hidden="true"
        onKeyDown={handleKeyDown}
        onBeforeInput={handleBeforeInput}
        onInput={handleInput}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '1px',
          height: '1px',
          opacity: 0,
          fontSize: '16px', // iOS otomatik zoom engeli
          pointerEvents: 'none',
          zIndex: -1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'transparent',
        }}
      />

      {/* Kompakt Eylem Çubuğu */}
      <div className="w-full flex items-center justify-between gap-3 px-2 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
        {/* PAS Butonu */}
        {hasPass ? (
          <button
            type="button"
            disabled={isPassDisabled}
            onClick={handlePassPress}
            className={`
              min-h-[46px] min-w-[76px] px-4 py-2 rounded-xl text-xs font-black tracking-wider
              border transition-all duration-150 active:scale-95 flex items-center justify-center
              ${
                isPassDisabled
                  ? 'bg-slate-800/30 text-slate-500 border-white/5 opacity-40 cursor-not-allowed pointer-events-none'
                  : isPassConfirming
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/50 animate-pulse'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 border-white/10 text-rose-300'
              }
            `}
            title="Kelimeyi PAS geç"
            aria-label={isPassConfirming ? 'PAS onay bekliyor' : 'Kelimeyi PAS geç'}
          >
            {isPassConfirming ? 'PAS?' : 'PAS'}
          </button>
        ) : (
          <div className="w-[76px]" />
        )}

        {/* Klavye Odak Durumu / İpucu */}
        <button
          type="button"
          onClick={focusInput}
          className="text-[11px] font-medium text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 active:scale-95 transition-transform"
          title="Klavyeyi açmak için dokunun"
          aria-label="Klavyeyi aç"
        >
          <span>⌨️</span>
          <span className="hidden sm:inline">Klavye</span>
        </button>

        {/* GÖNDER Butonu */}
        <button
          type="button"
          disabled={!canSubmit || disabled}
          onClick={triggerSubmit}
          className={`
            min-h-[46px] min-w-[100px] px-5 py-2 rounded-xl text-sm font-black tracking-wider
            border transition-all duration-150 active:scale-95 flex items-center justify-center shadow-lg
            ${
              canSubmit && !disabled
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-violet-400 shadow-violet-600/30 ring-1 ring-violet-400'
                : 'bg-slate-800/40 text-slate-500 border-white/5 opacity-40 cursor-not-allowed'
            }
          `}
          title={canSubmit ? 'Tahmini Gönder' : 'Tüm kutuları doldurunuz'}
          aria-label="Tahmini Gönder"
        >
          GÖNDER
        </button>
      </div>
    </div>
  )
}
