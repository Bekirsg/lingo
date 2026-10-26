/**
 * BonusBoardRow — 8 kutu tek satır (bonus soru tahtası)
 *
 * SPEC 4.6: Bu ekranda normal 5 satırlı tahmin tahtası yoktur,
 * sadece tek satır 8 kutu vardır. İlk kutuda ilk harf yeşil ve kilitli.
 * Açılan harfler de yeşil ve kilitli. Boş kutulara oyuncu yazar.
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
  for (let i = 0; i < 8; i++) {
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

  return (
    <div
      className="flex justify-center gap-1.5 w-full max-w-[380px] px-2"
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
          // Aktif imleç
          bgClass = 'bg-white/10 border-violet-400 text-white ring-2 ring-violet-400/50 animate-pulse'
        }

        return (
          <div
            key={idx}
            className={`
              w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center
              rounded-xl text-lg sm:text-xl font-black
              border-2 transition-all duration-300
              ${bgClass}
            `}
            role="gridcell"
          >
            <span>{displayChar}</span>
          </div>
        )
      })}
    </div>
  )
}
