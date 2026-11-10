/**
 * LİNGO v2 — Analizler: İlerleme Sekmesi
 * SPEC-v2 Bölüm 7.6
 */

import { useMemo } from 'react'
import type { AnalyticsData, AnalyticsFilter } from '../../analytics/types'
import { computeProgress } from '../../analytics/selectors'
import { getLevelRecords, getStats } from '../../data/storage'
import { EmptyState } from './EmptyState'

interface ProgressTabProps {
  rawData: AnalyticsData
  filter: AnalyticsFilter
}

export function ProgressTab({ rawData, filter }: ProgressTabProps) {
  const records = useMemo(() => getLevelRecords(), [])
  const stats = useMemo(() => getStats(), [])
  const progress = useMemo(() => computeProgress(rawData, filter), [rawData, filter])

  const { lastGames, lastSessions, gameTrend, sessionTrend } = progress

  const hasAnyData = lastGames.length > 0 || lastSessions.length > 0

  if (!hasAnyData) {
    return (
      <EmptyState
        message="İlerleme verisi yok"
        subtext="Tamamlanan Yarışma oyunları ve Çalışma oturumları burada geçmiş ve eğilim grafiği olarak gösterilecektir."
      />
    )
  }

  return (
    <div className="space-y-4 pb-8">
      {/* ─── Seviye Rekorları ve İstatistikler ─── */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <span>🏆</span> Seviye Rekorları & Genel Durum
        </h3>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/5 rounded-xl p-2.5 border border-emerald-500/20">
            <div className="text-[10px] text-emerald-400 font-bold uppercase">Kolay</div>
            <div className="text-base font-black text-white mt-0.5">
              {records.kolay.toLocaleString('tr-TR')}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 border border-amber-500/20">
            <div className="text-[10px] text-amber-400 font-bold uppercase">Orta</div>
            <div className="text-base font-black text-white mt-0.5">
              {records.orta.toLocaleString('tr-TR')}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 border border-violet-500/20">
            <div className="text-[10px] text-violet-400 font-bold uppercase">Zor</div>
            <div className="text-base font-black text-white mt-0.5">
              {records.zor.toLocaleString('tr-TR')}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
          <span>Toplam Oyun: <strong className="text-white">{stats.gamesPlayed}</strong></span>
          <span>En İyi Etap: <strong className="text-amber-400">{stats.bestStage}</strong></span>
        </div>
      </div>

      {/* ─── Son 10 Yarışma Oyunu ─── */}
      {lastGames.length > 0 && (
        <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>🎮</span> Son Yarışma Oyunları
            </h3>
            {gameTrend && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  gameTrend.direction === 'up'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : gameTrend.direction === 'down'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-slate-700/40 text-slate-400 border-slate-600/30'
                }`}
              >
                {gameTrend.direction === 'up'
                  ? `↑ +${gameTrend.diff.toLocaleString('tr-TR')}`
                  : gameTrend.direction === 'down'
                  ? `↓ ${gameTrend.diff.toLocaleString('tr-TR')}`
                  : '→ Değişim yok'}
              </span>
            )}
          </div>

          {gameTrend && (
            <p className="text-[11px] text-slate-400 leading-tight">
              Son 5 oyunun ortalaması ({gameTrend.last5Avg.toLocaleString('tr-TR')}), önceki 5 oyuna ({gameTrend.prev5Avg.toLocaleString('tr-TR')}) göre karşılaştırıldı.
            </p>
          )}

          <div className="space-y-1.5 pt-1">
            {lastGames.map((g, idx) => {
              const levelColor =
                g.level === 'kolay'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : g.level === 'orta'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-violet-500/20 text-violet-300 border-violet-500/30'

              const dateStr = new Date(g.timestamp).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <div
                  key={idx}
                  className="bg-white/5 rounded-xl p-2.5 flex items-center justify-between border border-white/5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${levelColor}`}>
                      {g.level.toUpperCase()}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">{dateStr}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">
                      {g.lastCompletedStage ? `${g.lastCompletedStage}H Etap` : 'Final yok'}
                    </span>
                    <span className="font-black text-amber-400 font-mono text-sm">
                      {g.finalScore.toLocaleString('tr-TR')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Son 10 Çalışma Oturumu ─── */}
      {lastSessions.length > 0 && (
        <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>📚</span> Son Çalışma Oturumları
            </h3>
            {sessionTrend && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  sessionTrend.direction === 'up'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : sessionTrend.direction === 'down'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-slate-700/40 text-slate-400 border-slate-600/30'
                }`}
              >
                {sessionTrend.direction === 'up'
                  ? `↑ +%${sessionTrend.diff}`
                  : sessionTrend.direction === 'down'
                  ? `↓ -%${Math.abs(sessionTrend.diff)}`
                  : '→ Değişim yok'}
              </span>
            )}
          </div>

          {sessionTrend && (
            <p className="text-[11px] text-slate-400 leading-tight">
              Son 5 oturumun başarı oranı (%{sessionTrend.last5SuccessRate}), önceki 5 oturuma (%{sessionTrend.prev5SuccessRate}) göre karşılaştırıldı.
            </p>
          )}

          <div className="space-y-1.5 pt-1">
            {lastSessions.map((s, idx) => {
              const successRate = s.totalQuestions > 0 ? Math.round((s.wonCount / s.totalQuestions) * 100) : 0
              const dateStr = new Date(s.timestamp).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <div
                  key={idx}
                  className="bg-white/5 rounded-xl p-2.5 flex items-center justify-between border border-white/5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      {s.mode === 'calisma' ? 'ÇALIŞMA' : 'HATALAR'}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">{dateStr}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {s.wonCount}/{s.totalQuestions}
                    </span>
                    <span className="font-black text-emerald-400 font-mono text-sm">
                      %{successRate}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
