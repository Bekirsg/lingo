import type { Clock } from '../game/clock'
import type { GameState } from '../game/state'
import { round4FinalScore } from '../game/engine'
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
  const r4 = state.round4State
  const isRound4 = Boolean(
    r4 && (
      state.screen === 'round4_playing' ||
      state.screen === 'round4_stage_cleared' ||
      state.screen === 'round4_word_lost' ||
      (state.screen === 'paused' && state.previousScreen?.startsWith('round4'))
    )
  )

  if (!rs && !isRound4) return null

  // 4. Tur verileri
  const stage = r4?.stage ?? 4
  const stageIndex = stage - 3 // 4->1, 5->2, 6->3, 7->4
  const currentReward = r4 ? round4FinalScore(state.treasury, r4.lastCompletedStage) : 0
  const targetReward = r4 ? round4FinalScore(state.treasury, stage) : 0

  // 1-3. Tur verileri
  const roundGuessesLen = isRound4 ? r4!.guesses.length : rs!.guesses.length
  const isFinishedWord = !isRound4 && (rs!.wordWon || rs!.wordLost)
  const guessNumber = roundGuessesLen + (isFinishedWord ? 0 : 1)
  const currentHak = Math.min(guessNumber, 5)

  return (
    <header className="w-full px-4 pt-3 pb-2 flex flex-col gap-2 select-none">
      {/* Üst Satır: Tur ve Sıra / Etap | Kasa / Kazanç | Duraklat */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRound4 ? (
            <>
              <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-600/30 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                4. TUR • Etap {stageIndex}/4
              </span>
              <span className="text-xs font-medium text-slate-400">
                {stage} Harfli
              </span>
            </>
          ) : (
            <>
              <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-violet-600/30 text-violet-300 border border-violet-500/30 backdrop-blur-md">
                {rs!.round}. TUR • Kelime {rs!.wordIndex}/5
              </span>
              <span className="text-xs font-medium text-slate-400">
                {rs!.letterCount} Harfli
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isRound4 ? (
            <div className="flex flex-col items-end text-right">
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  KAZANÇ:
                </span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {formatPoints(currentReward)}
                </span>
              </div>
              <span className="text-[10px] text-amber-300/80 font-medium">
                Hedef: {formatPoints(targetReward)}
              </span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1 text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                KASA:
              </span>
              <span className="font-mono font-black text-emerald-400 text-sm">
                {formatPoints(state.treasury)}
              </span>
            </div>
          )}

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
              const isUsed = index <= roundGuessesLen
              const isCurrent = index === guessNumber && !isFinishedWord
              return (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isUsed
                      ? 'bg-slate-600 scale-75'
                      : isCurrent
                        ? isRound4
                          ? 'bg-amber-400 scale-110 shadow-sm shadow-amber-400'
                          : 'bg-violet-400 scale-110 shadow-sm shadow-violet-400'
                        : 'bg-slate-700/60'
                  }`}
                />
              )
            })}
          </div>
        </div>

        {/* Canlı Sayaç (50ms tick'lerinde izole render olur) */}
        <div className="flex items-center bg-black/40 px-3 py-1 rounded-xl border border-white/10 backdrop-blur-md shadow-inner">
          <TimerDisplay clock={clock} />
        </div>
      </div>
    </header>
  )
}
