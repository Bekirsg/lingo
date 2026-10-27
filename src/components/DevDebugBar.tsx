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
  const [isOpen, setIsOpen] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)

  const isRound4 =
    screen === 'round4_playing' ||
    screen === 'round4_stage_cleared' ||
    screen === 'round4_word_lost'

  // Varsayılanda sol üst köşede küçük "🛠️" düğmesi olarak durur
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed top-2 left-2 z-50 w-7 h-7 rounded-lg bg-black/80 hover:bg-black text-amber-400 border border-amber-500/50 flex items-center justify-center text-xs shadow-lg backdrop-blur-md transition-transform active:scale-90"
        title="Geliştirici Test Paneli (🛠️)"
        aria-label="Geliştirici test panelini aç"
      >
        🛠️
      </button>
    )
  }

  return (
    <aside
      aria-label="Geliştirici Hata Ayıklama Paneli"
      className="fixed top-2 left-2 z-50 flex flex-col gap-2 bg-slate-950/95 p-3 rounded-2xl border border-amber-500/60 shadow-2xl backdrop-blur-md max-w-[92vw] text-[11px] font-mono select-none"
    >
      {/* Başlık ve Kapat Butonu */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1.5">
        <span className="font-bold text-amber-400 flex items-center gap-1.5">
          <span>🛠️</span>
          <span>DEV TEST PANELİ</span>
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold"
        >
          ✕ Kapat
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {/* Cevap Aç/Kapa */}
        {word && (
          <button
            type="button"
            onClick={() => setShowAnswer(!showAnswer)}
            className="text-amber-300 hover:text-amber-200 font-bold px-2 py-1 rounded-md bg-amber-950/60 border border-amber-500/40"
          >
            {showAnswer ? '👁️' : '🔍'} {showAnswer ? turkishUpper(word) : 'Cevabı Gör'}
          </button>
        )}

        {controller && (
          <>
            {/* 1–3. Tur Kısayolları */}
            <button
              type="button"
              onClick={() => {
                controller.devSkipToBonus()
                setIsOpen(false)
              }}
              className="text-violet-300 hover:text-violet-200 font-bold px-2 py-1 bg-violet-950/60 border border-violet-500/40 rounded-md"
              title="Mevcut turu geç, bonusa atla"
            >
              ⭐ Bonusa Atla
            </button>

            <button
              type="button"
              onClick={() => {
                controller.devSkipToNextRound()
                setIsOpen(false)
              }}
              className="text-emerald-300 hover:text-emerald-200 font-bold px-2 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded-md"
              title="Sonraki tura atla"
            >
              ⏩ Sonraki Tur
            </button>
          </>
        )}
      </div>

      {controller && (
        <div className="flex flex-col gap-1 border-t border-white/10 pt-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            4. Tur Kasa Seçimi:
          </span>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => {
                controller.devSkipToRound4(0)
                setIsOpen(false)
              }}
              className="text-rose-300 hover:text-rose-200 font-bold px-2 py-1 bg-rose-950/60 border border-rose-500/40 rounded-md"
              title="4. Tura atla (Kasa: 0)"
            >
              🔥 Kasa 0
            </button>

            <button
              type="button"
              onClick={() => {
                controller.devSkipToRound4(20000)
                setIsOpen(false)
              }}
              className="text-amber-300 hover:text-amber-200 font-bold px-2 py-1 bg-amber-950/60 border border-amber-500/40 rounded-md"
              title="4. Tura atla (Kasa: 20.000)"
            >
              🔥 Kasa 20K
            </button>

            <button
              type="button"
              onClick={() => {
                controller.devSkipToRound4(39000)
                setIsOpen(false)
              }}
              className="text-emerald-300 hover:text-emerald-200 font-bold px-2 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded-md"
              title="4. Tura atla (Kasa: 39.000)"
            >
              🔥 Kasa 39K
            </button>
          </div>
        </div>
      )}

      {/* 4. Tur İçi Kısayollar */}
      {controller && isRound4 && (
        <div className="flex flex-col gap-1 border-t border-white/10 pt-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            4. Tur Hızlı Aksiyon:
          </span>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => {
                controller.devSetRound4Time(10)
                setIsOpen(false)
              }}
              className="text-orange-300 hover:text-orange-200 font-bold px-2 py-1 bg-orange-950/60 border border-orange-500/40 rounded-md"
              title="4. tur kalan süresini 10 saniyeye düşür"
            >
              ⏱️ Süreyi 10 sn Yap
            </button>

            <button
              type="button"
              onClick={() => {
                controller.devAutoSolveRound4()
                setIsOpen(false)
              }}
              className="text-cyan-300 hover:text-cyan-200 font-bold px-2 py-1 bg-cyan-950/60 border border-cyan-500/40 rounded-md"
              title="Bu etaptaki kelimeyi otomatik bil"
            >
              💡 Otomatik Bil
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
