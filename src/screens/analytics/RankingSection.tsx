/**
 * LİNGO v2 — Analiz: Harf Sayısına Göre Başarı Sıralaması
 */

import type { LengthRankingItem } from '../../analytics/selectors'

interface RankingSectionProps {
  ranking: LengthRankingItem[]
  activeLength?: number
}

const MEDALS = ['🥇', '🥈', '🥉', '4.']

export function RankingSection({ ranking, activeLength }: RankingSectionProps) {
  return (
    <section className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <span>🏆</span> Başarı Sıralaması
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Harf sayılarına göre en başarılı olduğun modlar (başarı oranına göre)
        </p>
      </div>

      <div className="space-y-2">
        {ranking.map((item, idx) => {
          const isSelected = activeLength === item.length
          const hasData = item.successRate !== null
          const rate = item.successRate ?? 0

          const barColor =
            rate >= 70
              ? 'bg-emerald-500'
              : rate >= 45
              ? 'bg-amber-500'
              : 'bg-rose-500'

          return (
            <div
              key={item.length}
              className={`rounded-xl p-2.5 border transition-all ${
                isSelected
                  ? 'bg-violet-950/40 border-violet-500/40 ring-1 ring-violet-500/30'
                  : 'bg-white/5 border-white/5'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{MEDALS[idx] || `${idx + 1}.`}</span>
                  <span className="font-bold text-white">{`${item.length} Harfli`}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {`(${item.solved}/${item.seen} doğru)`}
                  </span>
                </div>
                <span className="font-black font-mono text-sm">
                  {hasData ? (
                    <span
                      className={
                        rate >= 70
                          ? 'text-emerald-400'
                          : rate >= 45
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }
                    >
                      {`%${rate}`}
                    </span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </span>
              </div>

              {/* İlerleme Çubuğu */}
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${hasData ? Math.max(4, rate) : 0}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
