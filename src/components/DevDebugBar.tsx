import { useState } from 'react'
import { turkishUpper } from '../utils/turkish'
import type { GameController, GameScreen } from '../game/state'

interface DevDebugBarProps {
  currentWord?: string
  bonusWord?: string
  controller?: GameController | null
  screen?: GameScreen
}

export default function DevDebugBar({
  currentWord,
  bonusWord,
  controller,
  screen,
}: DevDebugBarProps) {
  // Sadece geliştirme ortamında derlenir / render edilir
  if (!import.meta.env.DEV) return null

  const word = currentWord || bonusWord
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const isRound4 = screen === 'round4_playing' || screen === 'round4_stage_cleared'

  return (
    <aside
      aria-label="Geliştirici Hata Ayıklama Paneli"
      className="fixed bottom-1 left-2 z-40 flex flex-wrap items-center gap-1.5 bg-black/90 p-1.5 rounded-lg border border-amber-500/50 text-[11px] font-mono select-none max-w-[95vw] shadow-lg"
    >
      {/* Cevap Aç/Kapa */}
      {word && (
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="text-amber-400 hover:text-amber-300 font-bold px-1 py-0.5 rounded bg-amber-950/40"
        >
          {visible ? '👁️' : '🔍'} {visible ? turkishUpper(word) : 'Cevap'}
        </button>
      )}

      {/* Dev Paneli Genişlet / Daralt */}
      {controller && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-white font-bold px-1"
          >
            {expanded ? '▲ Gizle' : '⚙️ Test'}
          </button>

          {expanded && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-slate-600">|</span>

              {/* 1–3. Tur Kısayolları */}
              <button
                type="button"
                onClick={() => controller.devSkipToBonus()}
                className="text-violet-400 hover:text-violet-300 font-bold px-1 bg-violet-950/40 rounded"
                title="Mevcut turu geç, bonusa atla"
              >
                ⭐ Bonus
              </button>

              <button
                type="button"
                onClick={() => controller.devSkipToNextRound()}
                className="text-emerald-400 hover:text-emerald-300 font-bold px-1 bg-emerald-950/40 rounded"
                title="Sonraki tura atla"
              >
                ⏩ Tur
              </button>

              <span className="text-slate-600">|</span>

              {/* 4. Tur Kasa Seçimi Kısayolları */}
              <button
                type="button"
                onClick={() => controller.devSkipToRound4(0)}
                className="text-rose-400 hover:text-rose-300 font-bold px-1 bg-rose-950/40 rounded"
                title="4. Tura atla (Kasa: 0)"
              >
                🔥 4.Tur(0)
              </button>

              <button
                type="button"
                onClick={() => controller.devSkipToRound4(20000)}
                className="text-amber-400 hover:text-amber-300 font-bold px-1 bg-amber-950/40 rounded"
                title="4. Tura atla (Kasa: 20.000)"
              >
                🔥 4.Tur(20K)
              </button>

              <button
                type="button"
                onClick={() => controller.devSkipToRound4(39000)}
                className="text-emerald-400 hover:text-emerald-300 font-bold px-1 bg-emerald-950/40 rounded"
                title="4. Tura atla (Kasa: 39.000)"
              >
                🔥 4.Tur(39K)
              </button>

              {/* 4. Tur İçi Kısayollar */}
              {isRound4 && (
                <>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => controller.devSetRound4Time(10)}
                    className="text-orange-400 hover:text-orange-300 font-bold px-1 bg-orange-950/40 rounded"
                    title="4. tur kalan süresini 10 saniyeye düşür"
                  >
                    ⏱️ 10 sn
                  </button>

                  <button
                    type="button"
                    onClick={() => controller.devAutoSolveRound4()}
                    className="text-cyan-400 hover:text-cyan-300 font-bold px-1 bg-cyan-950/40 rounded"
                    title="Bu etaptaki kelimeyi otomatik bil"
                  >
                    💡 Otomatik Bil
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </aside>
  )
}
