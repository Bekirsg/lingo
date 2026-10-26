/**
 * RoundSummaryModal — Tur özeti ekranı (geçici basit sürüm)
 *
 * SPEC 4.7: "N. TUR BİTTİ — Kazandığın: X puan — Toplam Kasa: Y — Devam Et"
 * Tam sürüm M7'de yapılacak.
 */

import { formatPoints } from '../components/Hud'

interface RoundSummaryModalProps {
  round: number
  roundPoints: number
  treasury: number
  onContinue: () => void
}

export default function RoundSummaryModal({
  round,
  roundPoints,
  treasury,
  onContinue,
}: RoundSummaryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="max-w-sm w-full p-6 rounded-3xl bg-slate-900/95 border border-emerald-500/40 shadow-2xl shadow-emerald-500/15 text-center flex flex-col items-center animate-scale-up">
        {/* Rozet */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl bg-emerald-500/20 border border-emerald-400 shadow-lg shadow-emerald-500/30">
          🏆
        </div>

        {/* Başlık */}
        <h2 className="text-2xl font-black text-white mb-1">
          {round}. TUR BİTTİ
        </h2>

        {/* Kazanç */}
        <div className="flex flex-col items-center gap-2 mt-3 mb-4 w-full">
          <div className="flex items-center justify-between w-full bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Bu Turda</span>
            <span className="font-mono font-black text-emerald-400">
              +{formatPoints(roundPoints)}
            </span>
          </div>

          <div className="flex items-center justify-between w-full bg-white/5 rounded-xl px-4 py-2.5 border border-emerald-500/20">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Toplam Kasa</span>
            <span className="font-mono font-black text-lg text-emerald-400">
              {formatPoints(treasury)}
            </span>
          </div>
        </div>

        {/* Devam Et */}
        <button
          type="button"
          onClick={onContinue}
          className="
            w-full py-4 px-6 rounded-2xl text-lg font-black tracking-wide
            text-white transition-all duration-200 active:scale-95 shadow-lg
            bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/40 border border-emerald-400
          "
        >
          {round < 3 ? `${round + 1}. Tura Geç ➔` : '4. TUR — Büyük Final ➔'}
        </button>
      </div>
    </div>
  )
}
