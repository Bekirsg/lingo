import type { Clock } from '../game/clock'
import type { GameState } from '../game/state'
import TimerDisplay from './TimerDisplay'

interface HudProps {
  state: GameState
  clock: Clock
  onPause?: () => void
}

/**
 * Sayıları Türkçe binlik ayraçlı formatlar: 12000 -> 12.000
 */
export function formatPoints(num: number): string {
  return num.toLocaleString('tr-TR')
}

export default function Hud({ state, clock, onPause }: HudProps) {
  const rs = state.roundState
  if (!rs) return null

  const guessNumber = rs.guesses.length + (rs.wordWon || rs.wordLost ? 0 : 1)
  const currentHak = Math.min(guessNumber, 5)

  return (
    <header className="w-full px-4 pt-3 pb-2 flex flex-col gap-2 select-none">
      {/* Üst Satır: Tur ve Sıra | Kasa | Duraklat */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-violet-600/30 text-violet-300 border border-violet-500/30 backdrop-blur-md">
            {rs.round}. TUR • Kelime {rs.wordIndex}/5
          </span>
          <span className="text-xs font-medium text-slate-400">
            {rs.letterCount} Harfli
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Kasa Göstergesi */}
          <div className="flex items-baseline gap-1 text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              KASA:
            </span>
            <span className="font-mono font-black text-emerald-400 text-sm">
              {formatPoints(state.treasury)}
            </span>
          </div>

          {/* Duraklat butonu */}
          {onPause && (
            <button
              type="button"
              onClick={onPause}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-300 transition-all border border-white/10"
              title="Oyunu Duraklat"
              aria-label="Oyunu Duraklat"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Alt Satır: Hak Göstergesi ve Canlı Geri Sayım */}
      <div className="flex items-center justify-between px-1">
        {/* Tahmin Hakları: Hak 2/5 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-300">
            Hak {currentHak}/5
          </span>
          {/* Hak indikatör noktacıkları */}
          <div className="flex items-center gap-1 ml-1">
            {[1, 2, 3, 4, 5].map((index) => {
              const isUsed = index <= rs.guesses.length
              const isCurrent = index === guessNumber && !rs.wordWon && !rs.wordLost
              return (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isUsed
                      ? 'bg-slate-600 scale-75'
                      : isCurrent
                        ? 'bg-violet-400 scale-110 shadow-sm shadow-violet-400'
                        : 'bg-slate-700/60'
                  }`}
                />
              )
            })}
          </div>
        </div>

        {/* Canlı Sayaç (Sadece burası 50ms tick'lerinde render olur) */}
        <div className="flex items-center bg-black/40 px-3 py-1 rounded-xl border border-white/10 backdrop-blur-md shadow-inner">
          <TimerDisplay clock={clock} />
        </div>
      </div>
    </header>
  )
}
