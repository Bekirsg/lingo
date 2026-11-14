/**
 * LİNGO v2 — Analiz: Harf Sayısına Göre Başarı Performansı
 */

import type { LengthRankingItem } from '../../analytics/selectors'

interface LengthPerformanceSectionProps {
  items: LengthRankingItem[]
  activeLength?: number
}

export function LengthPerformanceSection({ items, activeLength }: LengthPerformanceSectionProps) {
  // If activeLength is set, show only that length; otherwise show all 4
  const displayItems = activeLength
    ? items.filter((it) => it.length === activeLength)
    : [...items].sort((a, b) => a.length - b.length)

  return (
    <section className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <span>🎯</span> Harf Sayısına Göre Performans
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Doğruluk oranı, ortalama tahmin denemesi, pas ve sözlük dışı istatistikleri
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {displayItems.map((item) => {
          const hasData = item.successRate !== null
          const rate = item.successRate ?? 0

          return (
            <div
              key={item.length}
              className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">{`${item.length} Harfli`}</span>
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                    hasData
                      ? rate >= 70
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : rate >= 45
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  }`}
                >
                  {hasData ? `%${rate} Başarı` : 'Veri Yok'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                <div className="bg-white/5 rounded-lg p-1.5">
                  <div className="text-[10px] text-slate-400">Ort. Tahmin</div>
                  <div className="font-bold text-slate-200 mt-0.5">
                    {item.avgGuess !== null ? `${item.avgGuess.toFixed(1)}.` : '—'}
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-1.5">
                  <div className="text-[10px] text-slate-400">PAS</div>
                  <div className="font-bold text-amber-300 mt-0.5">
                    {item.passCount}
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-1.5">
                  <div className="text-[10px] text-slate-400">TDK Dışı</div>
                  <div className="font-bold text-rose-300 mt-0.5">
                    {item.invalidCount}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 flex justify-between px-0.5 font-mono">
                <span>Çözülen: {item.solved}</span>
                <span>Toplam Soru: {item.seen}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
