import { useEffect, useCallback } from 'react'
import type { Mark } from '../game/engine'
import { normalize } from '../game/engine'

interface KeyboardProps {
  statuses: Record<string, Mark>
  onChar: (char: string) => void
  onDelete: () => void
  onSubmit: () => void
  /** Tüm kutular dolmadan GÖNDER pasif kalmalıdır */
  canSubmit: boolean
  disabled?: boolean
}

// SPEC Bölüm 6.3 klavye düzeni
const ROW_1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü']
const ROW_2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ']
const ROW_3_MID = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç']

export default function Keyboard({
  statuses,
  onChar,
  onDelete,
  onSubmit,
  canSubmit,
  disabled = false,
}: KeyboardProps) {
  // Masaüstü testi için fiziksel klavye desteği
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return

      // Form elemanında değilse dinle
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        if (canSubmit) {
          onSubmit()
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        onDelete()
      } else if (e.key.length === 1) {
        const norm = normalize(e.key)
        if (/^[a-zçğıöşü]$/.test(norm)) {
          e.preventDefault()
          onChar(norm)
        }
      }
    },
    [disabled, canSubmit, onChar, onDelete, onSubmit],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const getKeyClass = (char: string) => {
    const lower = normalize(char)
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
      className="w-full max-w-[430px] px-1 pb-4 pt-1 flex flex-col gap-1.5 select-none touch-manipulation"
      role="region"
      aria-label="Türkçe ekran klavyesi"
    >
      {/* 1. Satır: Q W E R T Y U I O P Ğ Ü */}
      <div className="flex justify-center gap-1 w-full">
        {ROW_1.map((char) => (
          <button
            key={char}
            type="button"
            disabled={disabled}
            onClick={() => onChar(char)}
            className={`
              flex-1 h-12 rounded-lg text-sm sm:text-base font-bold
              border transition-all duration-150 active:scale-90
              flex items-center justify-center
              ${getKeyClass(char)}
            `}
          >
            {char}
          </button>
        ))}
      </div>

      {/* 2. Satır: A S D F G H J K L Ş İ */}
      <div className="flex justify-center gap-1 w-full px-2">
        {ROW_2.map((char) => (
          <button
            key={char}
            type="button"
            disabled={disabled}
            onClick={() => onChar(char)}
            className={`
              flex-1 h-12 rounded-lg text-sm sm:text-base font-bold
              border transition-all duration-150 active:scale-90
              flex items-center justify-center
              ${getKeyClass(char)}
            `}
          >
            {char}
          </button>
        ))}
      </div>

      {/* 3. Satır: GÖNDER Z X C V B N M Ö Ç SİL */}
      <div className="flex justify-center gap-1 w-full">
        {/* GÖNDER Tuşu */}
        <button
          type="button"
          disabled={disabled || !canSubmit}
          onClick={onSubmit}
          className={`
            px-2.5 h-12 rounded-lg text-xs font-black tracking-wider
            border transition-all duration-150 active:scale-90
            flex items-center justify-center
            ${
              canSubmit
                ? 'bg-violet-600 hover:bg-violet-500 text-white border-violet-400 shadow-md shadow-violet-600/40'
                : 'bg-slate-800/40 text-slate-500 border-white/5 opacity-50 cursor-not-allowed'
            }
          `}
        >
          GÖNDER
        </button>

        {/* Orta Harfler */}
        {ROW_3_MID.map((char) => (
          <button
            key={char}
            type="button"
            disabled={disabled}
            onClick={() => onChar(char)}
            className={`
              flex-1 h-12 rounded-lg text-sm sm:text-base font-bold
              border transition-all duration-150 active:scale-90
              flex items-center justify-center
              ${getKeyClass(char)}
            `}
          >
            {char}
          </button>
        ))}

        {/* SİL Tuşu */}
        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          className="
            px-3 h-12 rounded-lg text-sm font-bold
            bg-slate-800/90 hover:bg-slate-700/90 border border-white/10 text-rose-300
            transition-all duration-150 active:scale-90
            flex items-center justify-center
          "
          title="Sil"
          aria-label="Son harfi sil"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
