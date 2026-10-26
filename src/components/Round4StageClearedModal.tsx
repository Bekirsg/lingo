/**
 * Round4StageClearedModal — 4. Tur Etap Tamamlandı Duraklama Ekranı
 *
 * SPEC 4.8: Bir kelime bilinirse oyun ve sayaç DONAR, duraklama ekranı açılır:
 * tamamlanan etap, o anki garanti kazanç, kalan süre görünür ve "Devam Et" butonu vardır.
 * Çekilme / kazancı alma seçeneği YOKTUR, devam etmek zorunludur.
 */

import type { Round4State } from '../game/state'
import type { Clock } from '../game/clock'
import { round4FinalScore } from '../game/engine'
import { formatPoints } from './Hud'

interface Round4StageClearedModalProps {
  round4State: Round4State
  treasury: number
  clock: Clock
  onContinue: () => void
}

export default function Round4StageClearedModal({
  round4State,
  treasury,
  clock,
  onContinue,
}: Round4StageClearedModalProps) {
  const completedStage = round4State.lastCompletedStage ?? round4State.stage
  const currentReward = round4FinalScore(treasury, completedStage)
  const nextStage = completedStage + 1
  const nextReward = nextStage <= 7 ? round4FinalScore(treasury, nextStage) : currentReward
  const remainingSeconds = Math.ceil(clock.getRemainingSeconds())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="max-w-sm w-full p-6 rounded-3xl bg-slate-900/95 border border-amber-500/50 shadow-2xl shadow-amber-500/20 text-center flex flex-col items-center animate-scale-up">
        {/* Rozet */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl bg-amber-500/20 border border-amber-400 shadow-lg shadow-amber-500/30 animate-bounce">
          🎉
        </div>

        {/* Başlık */}
        <h2 className="text-2xl font-black text-white mb-1">
          {completedStage} Harfli Etap Tamamlandı!
        </h2>

        <p className="text-xs text-slate-400 mb-4">
          Sayaç duraklatıldı. Hazır olunca devam et.
        </p>

        {/* Detay Kartları */}
        <div className="w-full space-y-2 mb-5">
          {/* O Anki Garanti Kazanç */}
          <div className="flex items-center justify-between w-full bg-white/5 rounded-xl px-4 py-2.5 border border-emerald-500/30">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Garanti Kazanç
            </span>
            <span className="font-mono font-black text-lg text-emerald-400">
              {formatPoints(currentReward)}
            </span>
          </div>

          {/* Kalan Süre */}
          <div className="flex items-center justify-between w-full bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Kalan Süre
            </span>
            <span className="font-mono font-black text-white">
              {remainingSeconds} sn
            </span>
          </div>

          {/* Sonraki Etap Hedefi */}
          {nextStage <= 7 && (
            <div className="flex items-center justify-between w-full bg-amber-950/30 rounded-xl px-4 py-2.5 border border-amber-500/20">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-300/80">
                Sıradaki: {nextStage} Harfli
              </span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                Hedef: {formatPoints(nextReward)}
              </span>
            </div>
          )}
        </div>

        {/* Devam Et Butonu — SPEC: Çekilme butonu YOKTUR */}
        <button
          type="button"
          onClick={onContinue}
          className="
            w-full py-4 px-6 rounded-2xl text-lg font-black tracking-wide
            text-white transition-all duration-200 active:scale-95 shadow-lg
            bg-gradient-to-r from-amber-500 to-orange-600
            hover:from-amber-400 hover:to-orange-500
            shadow-amber-500/40 border border-amber-400
          "
        >
          {nextStage <= 7 ? `${nextStage} Harfli Etaba Geç ➔` : 'Büyük Finali Bitir ➔'}
        </button>

        <span className="text-[10px] text-slate-500 mt-3 font-medium">
          (Çekilme seçeneği yoktur, sonraki etaba geçmek zorunludur)
        </span>
      </div>
    </div>
  )
}
