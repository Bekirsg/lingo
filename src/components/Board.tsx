import { useEffect, useState, useRef } from 'react'
import type { RoundState } from '../game/state'
import type { Mark } from '../game/engine'
import { turkishUpper } from '../utils/turkish'
import { playSound } from '../audio/sound'
import { calculateTileSize } from '../game/keyboard/keyboardLogic'

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

  const containerRef = useRef<HTMLDivElement>(null)
  const [boardLayout, setBoardLayout] = useState<{ tileSize: number; boardWidth: number } | null>(null)

  // Ekran ve dikey alan boyutuna göre dinamik kutu boyutu hesabı (SPEC-v2 Rev. 3)
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current

    const updateSize = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        const gap = letterCount >= 7 ? 4 : 6
        const res = calculateTileSize({
          availableWidth: rect.width,
          availableHeight: rect.height,
          letterCount,
          rowCount: 5,
          maxTileSize: 64,
          minTileSize: 28,
          gapX: gap,
          gapY: gap,
          paddingX: 8,
          paddingY: 6,
        })
        setBoardLayout({ tileSize: res.tileSize, boardWidth: res.boardWidth })
      }
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(el)
    window.addEventListener('resize', updateSize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [letterCount])

  // Animasyon süresi yönetimi (≤ 700 ms)
  const [animatingRow, setAnimatingRow] = useState<number | null>(null)

  useEffect(() => {
    if (isEvaluating && guesses.length === 0) {
      onAnimationComplete?.()
      return
    }
    if (isEvaluating && guesses.length > 0) {
      const rowIndex = guesses.length - 1
      setAnimatingRow(rowIndex)

      const flipTimers: ReturnType<typeof setTimeout>[] = []
      for (let i = 0; i < letterCount; i++) {
        const timer = setTimeout(() => {
          playSound('tile_flip')
        }, i * 85)
        flipTimers.push(timer)
      }

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

  const gap = letterCount >= 7 ? 'gap-1' : 'gap-1.5'
  const tileSize = boardLayout?.tileSize ?? (letterCount >= 7 ? 40 : 54)
  const fontClass =
    tileSize >= 56 ? 'text-2xl sm:text-3xl' : tileSize >= 44 ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
  const roundedClass = tileSize >= 52 ? 'rounded-xl' : 'rounded-lg'

  return (
    <div
      ref={containerRef}
      className="w-full flex-1 flex flex-col items-center justify-center px-1 sm:px-2 py-0.5 select-none overflow-hidden"
    >
      <div
        className={`flex flex-col ${gap}`}
        style={boardLayout ? { width: `${boardLayout.boardWidth}px` } : undefined}
        role="grid"
        aria-label="Kelime tahmin tahtası"
      >
        {rows.map((rIndex) => {
          const isPast = rIndex < guesses.length
          const isActive = rIndex === activeRowIndex
          const isRowAnimating = animatingRow === rIndex

          const pastGuess = isPast ? guesses[rIndex] : null
          const pastChars = pastGuess ? Array.from(pastGuess.guess).map(c => turkishUpper(c)) : []
          const pastMarks: Mark[] = pastGuess ? pastGuess.marks : []

          return (
            <div
              key={rIndex}
              className={`flex justify-center ${gap} w-full transition-transform duration-200 ${
                isActive && isShaking ? 'animate-shake' : ''
              }`}
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
                    char = lockedFirstChar
                    mark = 'locked'
                  } else {
                    char = currentChars[cIndex] || ''
                    mark = 'empty'
                    if (cIndex === currentChars.length) {
                      isCurrentBox = true
                    }
                  }
                }

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

                const staggerDelay = isRowAnimating ? `${cIndex * 85}ms` : '0ms'

                return (
                  <div
                    key={cIndex}
                    style={{
                      width: `${tileSize}px`,
                      height: `${tileSize}px`,
                      transitionDelay: staggerDelay,
                      aspectRatio: '1 / 1',
                    }}
                    className={`
                      flex items-center justify-center font-black
                      border-2 transition-all duration-300 transform shrink-0
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
