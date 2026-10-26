import { useState } from 'react'
import { turkishUpper } from '../utils/turkish'
import type { GameController } from '../game/state'

interface DevDebugBarProps {
  currentWord?: string
  bonusWord?: string
  controller?: GameController | null
}

export default function DevDebugBar({ currentWord, bonusWord, controller }: DevDebugBarProps) {
  // Sadece geliştirme ortamında derlenir / render edilir
  if (!import.meta.env.DEV) return null

  const word = currentWord || bonusWord
  if (!word && !controller) return null

  const [visible, setVisible] = useState(false)

  return (
    <aside
      aria-label="Geliştirici Hata Ayıklama Paneli"
      className="fixed bottom-1 left-2 z-40 flex items-center gap-2 bg-black/80 px-2 py-1 rounded-lg border border-amber-500/40 text-[11px] font-mono select-none"
    >
      {word && (
        <>
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="text-amber-400 hover:text-amber-300 font-bold"
          >
            {visible ? '👁️ Gizle' : '🔍 Cevap'}
          </button>
          {visible && (
            <span className="text-white font-black tracking-wider bg-amber-950 px-1.5 py-0.5 rounded border border-amber-500/50">
              {turkishUpper(word)}
            </span>
          )}
        </>
      )}

      {controller && (
        <>
          <span className="text-slate-600">|</span>
          <button
            type="button"
            onClick={() => controller.devSkipToBonus()}
            className="text-violet-400 hover:text-violet-300 font-bold"
          >
            ⭐ Bonus
          </button>
          <button
            type="button"
            onClick={() => controller.devSkipToNextRound()}
            className="text-emerald-400 hover:text-emerald-300 font-bold"
          >
            ⏩ Tur
          </button>
        </>
      )}
    </aside>
  )
}
