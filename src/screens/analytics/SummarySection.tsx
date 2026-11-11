/**
 * LİNGO v2 — Analiz: Performans Özeti Bölümü
 */

import type { SimplifiedSummaryMetrics } from '../../analytics/selectors'

interface SummarySectionProps {
  summary: SimplifiedSummaryMetrics
}

export function SummarySection({ summary }: SummarySectionProps) {
  const { totalSeen, successRate, totalPass, totalInvalidAttempts, summaryText } = summary

  const rateColor =
    successRate === null
      ? 'text-slate-400'
      : successRate >= 70
      ? 'text-emerald-400'
      : successRate >= 45
      ? 'text-amber-400'
      : 'text-rose-400'

  return (
    <section className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <span>📊</span> Performans Özeti
        </h3>
        <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
          Tüm Zamanlar
        </span>
      </div>

      {/* 4 Ana Metrik */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="bg-white/5 rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">Toplam Soru</div>
          <div className="text-lg font-black text-white mt-0.5">
            {totalSeen.toLocaleString('tr-TR')}
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">Başarı Oranı</div>
          <div className={`text-lg font-black mt-0.5 ${rateColor}`}>
            {successRate !== null ? `%${successRate}` : '—'}
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">PAS Sayısı</div>
          <div className="text-lg font-black text-amber-300 mt-0.5">
            {totalPass.toLocaleString('tr-TR')}
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">TDK Dışı</div>
          <div className="text-lg font-black text-rose-300 mt-0.5">
            {totalInvalidAttempts.toLocaleString('tr-TR')}
          </div>
        </div>
      </div>

      {/* Kısa Açıklayıcı Metin */}
      <div className="bg-white/[0.03] rounded-xl px-3 py-2 border border-white/5 text-xs text-slate-300 leading-relaxed">
        {summaryText}
      </div>
    </section>
  )
}
