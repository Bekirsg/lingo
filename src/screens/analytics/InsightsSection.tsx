/**
 * LİNGO v2 — Analiz: Gelişim Önerileri Bölümü
 */

import type { ActionableInsight } from '../../analytics/selectors'

interface InsightsSectionProps {
  insights: ActionableInsight[]
}

export function InsightsSection({ insights }: InsightsSectionProps) {
  return (
    <section className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <span>💡</span> Gelişim Önerileri
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Oyun ve çalışma verilerine dayalı kişiselleştirilmiş ipuçları
        </p>
      </div>

      <div className="space-y-2">
        {insights.map((item) => {
          const typeBadge =
            item.type === 'tip'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : item.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'

          const icon = item.type === 'tip' ? '🎯' : item.type === 'warning' ? '⚠️' : 'ℹ️'

          return (
            <div
              key={item.id}
              className={`rounded-xl p-3 border ${typeBadge} flex items-start gap-2.5`}
            >
              <span className="text-base shrink-0 mt-0.5">{icon}</span>
              <div className="space-y-1">
                <h4 className="text-xs font-black tracking-wide text-white">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.message}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
