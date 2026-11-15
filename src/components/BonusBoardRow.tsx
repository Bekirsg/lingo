/**
 * BonusBoardRow — 8 kutu tek satır (bonus soru tahtası)
 *
 * SPEC 4.6 & M8:
 * - 8 kutulu tek satır.
 * - Mobil uyumlu: 320px'ten 430px+'a kadar kaydırmasız, kare kutular.
 * - İlk kutu (index 0) kilitli ve yeşil.
 * - Açılan harfler yeşil ve kilitli.
 * - Boş kutulara kullanıcı yazar, aktif imleç vurgulu.
 */

import type { BonusState } from '../game/state'
import { turkishUpper } from '../utils/turkish'

interface BonusBoardRowProps {
  bonusState: BonusState
  /** Yazma modunda mı? (BİL basıldıktan sonra) */
  isWriting: boolean
}

export default function BonusBoardRow({ bonusState, isWriting }: BonusBoardRowProps) {
  const wordChars = Array.from(bonusState.word)

  // Kilitli pozisyonlar: 0 (ilk harf) + açılan harfler
  const lockedPositions = new Set<number>([0])
  for (let i = 0; i < bonusState.revealedCount; i++) {
    lockedPositions.add(bonusState.revealOrder[i])
  }

  // Yazma modunda boş pozisyonlar (soldan sağa)
  const emptyPositions: number[] = []
  for (let i = 0; i < wordChars.length; i++) {
    if (!lockedPositions.has(i)) emptyPositions.push(i)
  }

  // Kullanıcının yazdığı harfleri boş pozisyonlara eşle
  const userCharsMap: Record<number, string> = {}
  if (isWriting) {
    const userChars = Array.from(bonusState.userInput)
    for (let j = 0; j < userChars.length; j++) {
      if (j < emptyPositions.length) {
        userCharsMap[emptyPositions[j]] = userChars[j]
      }
    }
  }

  // İmleç: yazma modunda sıradaki boş kutu
  const cursorPos = isWriting
    ? emptyPositions[bonusState.userInput.length] ?? -1
    : -1

  // 10 ve 11 harfli kelimelerde 320px ekranda taşmayı önleyici kompakt yerleşim
  const isCompact = wordChars.length >= 10
  const gapClass = isCompact ? 'gap-0.5 sm:gap-1' : 'gap-1 sm:gap-1.5'
  const textClass = isCompact ? 'text-xs sm:text-base md:text-xl' : 'text-sm sm:text-lg md:text-xl'
  const roundedClass = isCompact ? 'rounded-lg sm:rounded-xl' : 'rounded-xl'

  return (
    <div
      className={`flex justify-center ${gapClass} w-full max-w-[430px] px-1 sm:px-2`}
      role="row"
      aria-label="Bonus kelime kutuları"
    >
      {wordChars.map((char, idx) => {
        const isLocked = lockedPositions.has(idx)
        const userChar = userCharsMap[idx]
        const isCursor = idx === cursorPos
        const hasUserChar = userChar !== undefined

        let displayChar = ''
        let bgClass = 'bg-white/5 border-white/10'

        if (isLocked) {
          // Açılmış harf: yeşil ve kilitli
          displayChar = turkishUpper(char)
          bgClass = 'bg-emerald-600 border-emerald-400 text-white font-black shadow-sm shadow-emerald-500/40'
        } else if (hasUserChar) {
          // Oyuncunun yazdığı harf
          displayChar = turkishUpper(userChar)
          bgClass = 'bg-white/10 border-white/30 text-white font-bold'
        } else if (isCursor) {
          // Aktif imleç — Son derece belirgin altın/kehribar ışık efekti, kalın parlak çerçeve ve hafif büyüme
          bgClass = 'bg-amber-400/30 border-amber-300 text-white ring-4 ring-amber-400/80 shadow-[0_0_22px_rgba(251,191,36,0.95)] scale-105 z-10 animate-pulse'
        }

        return (
          <div
            key={idx}
            className={`
              flex-1 min-w-0 max-w-[42px] sm:max-w-[46px] aspect-square
              flex flex-col items-center justify-center
              ${roundedClass} ${textClass} font-black
              border-2 transition-all duration-200 relative
              ${bgClass}
            `}
            role="gridcell"
          >
            <span>{displayChar}</span>
            {/* Boş aktif kutuda ekstra dikkat çekici zıplayan imleç çizgisi */}
            {isCursor && displayChar === '' && (
              <div className="w-3.5 sm:w-5 h-1 sm:h-1.5 bg-amber-300 rounded-full animate-bounce shadow-[0_0_10px_rgba(251,191,36,1)] absolute bottom-1" />
            )}
          </div>
        )
      })}
    </div>
  )
}
