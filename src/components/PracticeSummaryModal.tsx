/**
 * PracticeSummaryModal — Çalışma Modu Oturum Özeti Ekranı
 * SPEC-v2 Bölüm 6.3 & 12/V2-M5
 */

import type { PracticeSummary } from '../game/state'
import type { GameLevel } from '../data/levels'
import { turkishUpper } from '../utils/turkish'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

interface PracticeSummaryModalProps {
  summary: PracticeSummary
  level: GameLevel
  onRestart: () => void
  onBackToMenu: () => void
}

export default function PracticeSummaryModal({
  summary,
  level,
  onRestart,
  onBackToMenu,
}: PracticeSummaryModalProps) {
  const levelLabel = level === 'kolay' ? 'Kolay' : level === 'orta' ? 'Orta' : 'Zor'
  const successRate = summary.totalQuestions > 0
    ? Math.round((summary.wonCount / summary.totalQuestions) * 100)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md max-h-[90dvh] flex flex-col bg-slate-900/95 border border-violet-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl text-white overflow-hidden">
        
        {/* Başlık ve Rozet */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-wide text-white">
              Çalışma Özeti
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Oturum Performansı
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
            level === 'kolay'
              ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
              : level === 'orta'
                ? 'bg-amber-600/30 text-amber-300 border-amber-500/40'
                : 'bg-violet-600/30 text-violet-300 border-violet-500/40'
          }`}>
            {levelLabel}
          </span>
        </div>

        {/* Kaydırılabilir İçerik */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Ana İstatistikler Grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-white/5 rounded-2xl p-2.5 border border-white/10">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Toplam</span>
              <span className="text-lg sm:text-xl font-black text-white">{summary.totalQuestions}</span>
            </div>
            <div className="bg-emerald-500/10 rounded-2xl p-2.5 border border-emerald-500/30">
              <span className="block text-[10px] uppercase font-bold text-emerald-300">Bilinen</span>
              <span className="text-lg sm:text-xl font-black text-emerald-400">{summary.wonCount}</span>
            </div>
            <div className="bg-rose-500/10 rounded-2xl p-2.5 border border-rose-500/30">
              <span className="block text-[10px] uppercase font-bold text-rose-300">Kayıp</span>
              <span className="text-lg sm:text-xl font-black text-rose-400">{summary.lostCount}</span>
            </div>
            <div className="bg-amber-500/10 rounded-2xl p-2.5 border border-amber-500/30">
              <span className="block text-[10px] uppercase font-bold text-amber-300">PAS</span>
              <span className="text-lg sm:text-xl font-black text-amber-400">{summary.passCount}</span>
            </div>
          </div>

          {/* Başarı Oranı Çubuğu */}
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-slate-300">Genel Başarı Oranı</span>
              <span className="text-emerald-400 font-mono text-sm">%{successRate}</span>
            </div>
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, successRate))}%` }}
              />
            </div>
          </div>

          {/* Harf Kırılımı ve Bonus */}
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Harf Sayısına Göre Başarı
            </h3>
            <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
              {[4, 5, 6, 7, 8].map((letters) => {
                const stat = summary.byLetter[letters] ?? { asked: 0, won: 0 }
                return (
                  <div key={letters} className="bg-black/30 rounded-xl p-1.5 border border-white/5">
                    <span className="block text-[10px] text-slate-400 font-medium">
                      {letters === 8 ? 'Bonus' : `${letters} Harf`}
                    </span>
                    <span className="font-mono font-bold text-slate-200">
                      {stat.won}/{stat.asked}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bilinemeyen Kelimeler Listesi */}
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Kaçan Kelimeler ({summary.missedWords.length})
              </h3>
            </div>
            {summary.missedWords.length === 0 ? (
              <p className="text-xs text-emerald-400 font-medium text-center py-3">
                🎉 Harika! Bu oturumda hiç kelime kaçırmadın!
              </p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {summary.missedWords.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/40 border border-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white tracking-wider">
                        {turkishUpper(item.correctWord)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {item.letterCount} Harf
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      item.reason === 'pass'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {item.reason === 'pass' ? 'PAS' : 'Kayıp'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Eylem Butonları */}
        <div className="pt-3 border-t border-white/10 flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              playSound('key_press')
              triggerHaptic('tap')
              onRestart()
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-violet-600/30 transition-all active:scale-95"
          >
            🔄 Yeniden Çalış
          </button>
          <button
            type="button"
            onClick={() => {
              playSound('key_press')
              triggerHaptic('tap')
              onBackToMenu()
            }}
            className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 font-semibold text-xs transition-all active:scale-95"
          >
            Ana Menü
          </button>
        </div>

      </div>
    </div>
  )
}
