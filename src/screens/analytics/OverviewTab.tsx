/**
 * LİNGO v2 — Analizler: Özet Sekmesi
 * SPEC-v2 Bölüm 7.1, 7.7
 */

import type { OverviewMetrics } from '../../analytics/selectors'
import type { AnalyticsFilter } from '../../analytics/types'
import { EmptyState } from './EmptyState'

interface OverviewTabProps {
  overview: OverviewMetrics
  filter: AnalyticsFilter
  onStartMistakes?: () => void
}

export function OverviewTab({ overview, onStartMistakes }: OverviewTabProps) {
  if (!overview.hasData) {
    return <EmptyState message="Henüz veri yok" subtext="Yarışma veya Çalışma modunda oynadıkça özet istatistiklerin ve önerilerin burada görünecek." />
  }

  const { yarisma, calisma, modeQuestionCount, insights } = overview

  const totalStageCount =
    yarisma.stageDistribution.none +
    yarisma.stageDistribution.stage4 +
    yarisma.stageDistribution.stage5 +
    yarisma.stageDistribution.stage6 +
    yarisma.stageDistribution.stage7

  return (
    <div className="space-y-4 pb-6">
      {/* ─── Mod Dağılımı Satırı ─── */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5">
        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
          Soru Sayısı Dağılımı
        </h4>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/5 rounded-xl p-2.5">
            <div className="text-xs text-slate-400">Yarışma</div>
            <div className="text-base font-black text-violet-400 mt-0.5">
              {modeQuestionCount.yarisma.toLocaleString('tr-TR')}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5">
            <div className="text-xs text-slate-400">Çalışma</div>
            <div className="text-base font-black text-emerald-400 mt-0.5">
              {modeQuestionCount.calisma.toLocaleString('tr-TR')}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5">
            <div className="text-xs text-slate-400">Hatalar</div>
            <div className="text-base font-black text-amber-400 mt-0.5">
              {modeQuestionCount.hatalar.toLocaleString('tr-TR')}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Yarışma Kartı ─── */}
      {yarisma.available && (
        <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>🎮</span> Yarışma Performansı
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              {yarisma.gamesCount} Oyun
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-[11px] text-slate-400">Ortalama Skor</div>
              <div className="text-lg font-black text-white mt-0.5">
                {yarisma.avgScore.toLocaleString('tr-TR')}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-[11px] text-slate-400">En İyi Skor</div>
              <div className="text-lg font-black text-amber-400 mt-0.5">
                {yarisma.bestScore.toLocaleString('tr-TR')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white/5 rounded-xl p-2.5">
              <div className="text-[11px] text-slate-400">4. Tura Ulaşma</div>
              <div className="text-base font-black text-emerald-400 mt-0.5">
                {yarisma.r4ReachRate !== null ? `%${yarisma.r4ReachRate}` : '-'}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5">
              <div className="text-[11px] text-slate-400">Finalde Kalan Süre</div>
              <div className="text-base font-black text-cyan-400 mt-0.5">
                {yarisma.r4AvgTimeLeft !== null ? `${yarisma.r4AvgTimeLeft} sn` : '-'}
              </div>
            </div>
          </div>

          {/* Son Tamamlanan Etap Dağılımı Çubuğu */}
          {totalStageCount > 0 && (
            <div className="bg-white/5 rounded-xl p-3 mt-2">
              <div className="text-[11px] font-bold text-slate-400 mb-2">
                Son Tamamlanan Etap Dağılımı
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                {yarisma.stageDistribution.none > 0 && (
                  <div
                    style={{ width: `${(yarisma.stageDistribution.none / totalStageCount) * 100}%` }}
                    className="bg-rose-500/80"
                    title={`Hiçbiri: ${yarisma.stageDistribution.none}`}
                  />
                )}
                {yarisma.stageDistribution.stage4 > 0 && (
                  <div
                    style={{ width: `${(yarisma.stageDistribution.stage4 / totalStageCount) * 100}%` }}
                    className="bg-amber-500/80"
                    title={`4 Harf: ${yarisma.stageDistribution.stage4}`}
                  />
                )}
                {yarisma.stageDistribution.stage5 > 0 && (
                  <div
                    style={{ width: `${(yarisma.stageDistribution.stage5 / totalStageCount) * 100}%` }}
                    className="bg-blue-500/80"
                    title={`5 Harf: ${yarisma.stageDistribution.stage5}`}
                  />
                )}
                {yarisma.stageDistribution.stage6 > 0 && (
                  <div
                    style={{ width: `${(yarisma.stageDistribution.stage6 / totalStageCount) * 100}%` }}
                    className="bg-indigo-500/80"
                    title={`6 Harf: ${yarisma.stageDistribution.stage6}`}
                  />
                )}
                {yarisma.stageDistribution.stage7 > 0 && (
                  <div
                    style={{ width: `${(yarisma.stageDistribution.stage7 / totalStageCount) * 100}%` }}
                    className="bg-emerald-500/80"
                    title={`7 Harf (Tam): ${yarisma.stageDistribution.stage7}`}
                  />
                )}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
                <span>0: {yarisma.stageDistribution.none}</span>
                <span>4h: {yarisma.stageDistribution.stage4}</span>
                <span>5h: {yarisma.stageDistribution.stage5}</span>
                <span>6h: {yarisma.stageDistribution.stage6}</span>
                <span>7h: {yarisma.stageDistribution.stage7}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Çalışma Kartı ─── */}
      {calisma.available && (
        <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>📚</span> Çalışma Performansı
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {calisma.sessionsCount} Oturum
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="bg-white/5 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400">Toplam Soru</div>
              <div className="text-base font-black text-white mt-0.5">
                {calisma.totalQuestions}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400">Başarı Oranı</div>
              <div className="text-base font-black text-emerald-400 mt-0.5">
                {calisma.successRate !== null ? `%${calisma.successRate}` : '-'}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400">PAS Sayısı</div>
              <div className="text-base font-black text-amber-400 mt-0.5">
                {calisma.passCount}
              </div>
            </div>
          </div>

          {/* Harf Sayısına Göre Dağılım */}
          <div className="bg-white/5 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-400 mb-2">
              Harf Dağılımı (Bilinen / Sorulan)
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
              {[4, 5, 6, 7, 8].map((len) => {
                const stat = calisma.byLetter[len] || { asked: 0, won: 0 }
                return (
                  <div key={len} className="bg-black/20 rounded-lg p-1.5">
                    <div className="text-[10px] text-slate-400 font-bold">
                      {len === 8 ? 'Bonus' : `${len}H`}
                    </div>
                    <div className="font-bold text-slate-200 mt-0.5 text-[11px]">
                      {stat.won}/{stat.asked}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Öneriler Kutusu (SPEC 7.7) ─── */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
          <span>💡</span> Akıllı Öneriler
        </h3>

        {insights.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            Henüz bir öneri oluşturulacak kadar veri bulunamadı. Oynamaya devam ettikçe öneriler belirecektir.
          </p>
        ) : (
          <div className="space-y-2 mt-3">
            {insights.map((item) => {
              const badgeColor =
                item.type === 'warning'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : item.type === 'tip'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'

              const icon = item.type === 'warning' ? '⚠️' : item.type === 'tip' ? '💡' : 'ℹ️'

              return (
                <div
                  key={item.id}
                  className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-start gap-2.5"
                >
                  <span className="text-base mt-0.5">{icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-200">{item.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${badgeColor}`}>
                        #{item.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.message}</p>
                    {item.id === 'review_errors' && onStartMistakes && (
                      <button
                        type="button"
                        onClick={onStartMistakes}
                        className="mt-2 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                      >
                        <span>🎯 Bu Kelimelerle Çalış</span>
                        <span>➔</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
