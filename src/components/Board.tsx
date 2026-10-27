import { useEffect, useState } from 'react'
import type { RoundState } from '../game/state'
import type { Mark } from '../game/engine'
import { turkishUpper } from '../utils/turkish'

interface BoardData {
  letterCount: number
  currentWord: string
  guesses: { guess: string; marks: Mark[] }[]
  currentInput: string
  wordWon?: boolean
  wordLost?: boolean
}

interface BoardProps {
  roundState?: RoundState
  boardData?: BoardData
  /** Tahmin gönderildiğinde animasyonu başlatmak için bayrak */
  isEvaluating?: boolean
  /** Animasyon bittiğinde çağrılır (maks ≤ 700 ms) */
  onAnimationComplete?: () => void
  /** Geçersiz kelimede titreme tetiklemek için */
  isShaking?: boolean
}

export default function Board({
  roundState,
  boardData,
  isEvaluating = false,
  onAnimationComplete,
  isShaking = false,
}: BoardProps) {
  const data = boardData ?? roundState
  if (!data) return null
  const { letterCount, currentWord, guesses, currentInput, wordWon = false, wordLost = false } = data

  // Animasyon süresi yönetimi (≤ 700 ms)
  const [animatingRow, setAnimatingRow] = useState<number | null>(null)

  useEffect(() => {
    if (isEvaluating && guesses.length === 0) {
      // Failsafe: 4. turda kelime kaybından hemen yeni kelime geldi (guesses sıfırlandı).
      // Animasyon oynayacak satır yok; hemen tamamlandı sinyali gönder.
      onAnimationComplete?.()
      return
    }
    if (isEvaluating && guesses.length > 0) {
      const rowIndex = guesses.length - 1
      setAnimatingRow(rowIndex)

      // Kademeli kutu çevirme: (letterCount - 1) * 90ms + 300ms çevirme animasyonu <= 700ms
      const totalAnimationDuration = Math.min((letterCount - 1) * 90 + 350, 700)
      const timer = setTimeout(() => {
        setAnimatingRow(null)
        onAnimationComplete?.()
      }, totalAnimationDuration)

      return () => clearTimeout(timer)
    }
  }, [isEvaluating, guesses.length, letterCount, onAnimationComplete])

  const rows = [0, 1, 2, 3, 4]
  const cols = Array.from({ length: letterCount }, (_, i) => i)

  const activeRowIndex = wordWon || wordLost ? -1 : guesses.length
  const lockedFirstChar = turkishUpper(Array.from(currentWord)[0] ?? '')
  const currentChars = Array.from(currentInput).map(c => turkishUpper(c))

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-2 select-none">
      <div
        className="w-full max-w-[360px] flex flex-col gap-2"
        role="grid"
        aria-label="Kelime tahmin tahtası"
      >
        {rows.map((rIndex) => {
          const isPast = rIndex < guesses.length
          const isActive = rIndex === activeRowIndex
          const isRowAnimating = animatingRow === rIndex

          // Geçmiş tahmin verisi
          const pastGuess = isPast ? guesses[rIndex] : null
          const pastChars = pastGuess ? Array.from(pastGuess.guess).map(c => turkishUpper(c)) : []
          const pastMarks: Mark[] = pastGuess ? pastGuess.marks : []

          return (
            <div
              key={rIndex}
              className={`grid gap-2 w-full transition-transform duration-200 ${
                isActive && isShaking ? 'animate-shake' : ''
              }`}
              style={{
                gridTemplateColumns: `repeat(${letterCount}, minmax(0, 1fr))`,
              }}
              role="row"
            >
              {cols.map((cIndex) => {
                let char = ''
                let mark: Mark | 'locked' | 'empty' = 'empty'
                let isCurrentBox = false

                if (isPast) {
                  char = pastChars[cIndex] || ''
                  mark = pastMarks[cIndex] || 'empty'
                } else if (isActive) {
                  if (cIndex === 0) {
                    // SPEC 4.2-1: İlk kutuda ilk harf otomatik yazılıdır, yeşildir ve KİLİTLİDİR.
                    char = lockedFirstChar
                    mark = 'locked'
                  } else {
                    char = currentChars[cIndex] || ''
                    mark = 'empty'
                    // Şu anki aktif boş kutu
                    if (cIndex === currentChars.length) {
                      isCurrentBox = true
                    }
                  }
                }

                // Renk ve stil sınıfları
                let bgClass = 'bg-white/5 border-white/10 text-white'
                let glowClass = ''

                if (mark === 'locked') {
                  bgClass = 'bg-emerald-600 border-emerald-400 text-white font-black shadow-sm shadow-emerald-500/40'
                } else if (mark === 'green') {
                  bgClass = 'bg-emerald-600 border-emerald-400 text-white font-black shadow-md shadow-emerald-500/50'
                  glowClass = wordWon ? 'animate-bounce' : ''
                } else if (mark === 'yellow') {
                  bgClass = 'bg-amber-500 border-amber-300 text-slate-950 font-black shadow-md shadow-amber-400/40'
                } else if (mark === 'red') {
                  bgClass = 'bg-rose-700/80 border-rose-500 text-white font-bold opacity-80'
                } else if (isCurrentBox) {
                  bgClass = 'bg-white/10 border-violet-400 text-white ring-2 ring-violet-400/50 animate-pulse'
                } else if (char) {
                  bgClass = 'bg-white/10 border-white/30 text-white font-bold'
                }

                // Kutu çevirme stili
                const staggerDelay = isRowAnimating ? `${cIndex * 85}ms` : '0ms'

                return (
                  <div
                    key={cIndex}
                    style={{
                      transitionDelay: staggerDelay,
                      aspectRatio: '1 / 1',
                    }}
                    className={`
                      flex items-center justify-center rounded-xl text-xl sm:text-2xl font-black
                      border-2 transition-all duration-300 transform
                      ${bgClass} ${glowClass}
                      ${isRowAnimating ? 'animate-flip' : ''}
                    `}
                    role="gridcell"
                  >
                    <span>{char}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
