import { useEffect, useState } from 'react'
import type { RoundState } from '../game/state'
import type { Mark } from '../game/engine'
import { turkishUpper } from '../utils/turkish'
import { playSound } from '../audio/sound'

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
      onAnimationComplete?.()
      return
    }
    if (isEvaluating && guesses.length > 0) {
      const rowIndex = guesses.length - 1
      setAnimatingRow(rowIndex)

      // Kademeli kutu çevirme ses efektleri (her harf çevrilişinde kısa flip sesi)
      const flipTimers: ReturnType<typeof setTimeout>[] = []
      for (let i = 0; i < letterCount; i++) {
        const timer = setTimeout(() => {
          playSound('tile_flip')
        }, i * 85)
        flipTimers.push(timer)
      }

      // Kademeli kutu çevirme: (letterCount - 1) * 90ms + 300ms çevirme animasyonu <= 700ms
      const totalAnimationDuration = Math.min((letterCount - 1) * 90 + 350, 700)
      const endTimer = setTimeout(() => {
        setAnimatingRow(null)
        onAnimationComplete?.()
      }, totalAnimationDuration)
      flipTimers.push(endTimer)

      return () => {
        flipTimers.forEach(t => clearTimeout(t))
      }
    }
  }, [isEvaluating, guesses.length, letterCount, onAnimationComplete])

  const rows = [0, 1, 2, 3, 4]
  const cols = Array.from({ length: letterCount }, (_, i) => i)

  const activeRowIndex = wordWon || wordLost ? -1 : guesses.length
  const lockedFirstChar = turkishUpper(Array.from(currentWord)[0] ?? '')
  const currentChars = Array.from(currentInput).map(c => turkishUpper(c))

  // Harf sayısına göre dinamik boşluk ve maksimum genişlik (özellikle 7 harfli mobil uyumu)
  const isWideStage = letterCount >= 7
  const boardMaxW = isWideStage ? 'max-w-[370px]' : 'max-w-[340px]'
  const rowGap = isWideStage ? 'gap-1 sm:gap-2' : 'gap-1.5 sm:gap-2'
  const colGap = isWideStage ? 'gap-1 sm:gap-1.5' : 'gap-1.5 sm:gap-2'
  const fontClass = isWideStage ? 'text-lg sm:text-2xl' : 'text-xl sm:text-2xl'
  const roundedClass = isWideStage ? 'rounded-lg sm:rounded-xl' : 'rounded-xl'

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-2 sm:px-4 py-1 sm:py-2 select-none overflow-hidden">
      <div
        className={`w-full ${boardMaxW} flex flex-col ${rowGap}`}
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
              className={`grid ${colGap} w-full transition-transform duration-200 ${
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
                      flex items-center justify-center font-black
                      border-2 transition-all duration-300 transform min-w-0
                      ${roundedClass} ${fontClass} ${bgClass} ${glowClass}
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
