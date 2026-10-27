import { useEffect } from 'react'
import type { RoundState } from '../game/state'
import { ROUND_CONFIGS } from '../game/engine'
import { formatPoints } from './Hud'
import { turkishUpper } from '../utils/turkish'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

interface WordResultModalProps {
  roundState: RoundState
  onContinue: () => void
}

export default function WordResultModal({ roundState, onContinue }: WordResultModalProps) {
  const { round, currentWord, wordWon, lossReason } = roundState
  const points = ROUND_CONFIGS[round - 1]?.pointsPerWord ?? 1000

  useEffect(() => {
    if (wordWon) {
      playSound('word_won')
      triggerHaptic('correct')
    } else {
      playSound(lossReason === 'invalid_word' ? 'invalid_word' : 'word_lost')
      triggerHaptic('wrong')
    }
  }, [wordWon, lossReason])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className={`
          w-full max-w-sm rounded-3xl p-6 flex flex-col items-center text-center
          border shadow-2xl transition-all transform animate-scale-up
          ${
            wordWon
              ? 'bg-slate-900/95 border-emerald-500/50 shadow-emerald-500/20'
              : 'bg-slate-900/95 border-rose-500/50 shadow-rose-500/20'
          }
        `}
      >
        {/* Durum İkonu */}
        <div
          className={`
            w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl
            border shadow-lg
            ${
              wordWon
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-emerald-500/30 animate-bounce'
                : 'bg-rose-500/20 border-rose-400 text-rose-400 shadow-rose-500/30'
            }
          `}
        >
          {wordWon ? '🎉' : '❌'}
        </div>

        {/* Başlık */}
        <h2 className="text-2xl font-black text-white mb-1">
          {wordWon ? 'Tebrikler! Bildin' : 'Kelime Kaybedildi'}
        </h2>

        {/* Alt Açıklama */}
        {wordWon ? (
          <p className="text-emerald-400 font-bold text-lg mb-4">
            +{formatPoints(points)} PUAN
          </p>
        ) : (
          <div className="flex flex-col items-center gap-1 mb-5">
            <span className="text-xs uppercase font-medium text-slate-400 tracking-wider">
              {lossReason === 'invalid_word'
                ? 'Geçersiz Kelime (Sözlükte Yok)'
                : lossReason === 'time_out'
                  ? 'Süre Doldu'
                  : '5 Tahmin Hakkı Bitti'}
            </span>
            <div className="mt-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <span className="text-xs text-slate-400 mr-2">Doğru Kelime:</span>
              <span className="font-mono text-xl font-black text-white tracking-widest">
                {turkishUpper(currentWord)}
              </span>
            </div>
          </div>
        )}

        {/* Devam Et Butonu */}
        <button
          type="button"
          onClick={() => {
            playSound('key_press')
            triggerHaptic('tap')
            onContinue()
          }}
          className={`
            w-full py-4 px-6 rounded-2xl text-lg font-black tracking-wide
            text-white transition-all duration-200 active:scale-95 shadow-lg
            ${
              wordWon
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/40 border border-emerald-400'
                : 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/40 border border-violet-400'
            }
          `}
        >
          Devam Et ➔
        </button>
      </div>
    </div>
  )
}
