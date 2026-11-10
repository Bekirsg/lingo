/**
 * LİNGO v2 — Analizler: Performans Sekmesi
 * SPEC-v2 Bölüm 7.4
 */

import type { MergedAnalytics } from '../../analytics/types'
import { computePerformance } from '../../analytics/selectors'
import { EmptyState } from './EmptyState'

interface PerformanceTabProps {
  merged: MergedAnalytics
}

export function PerformanceTab({ merged }: PerformanceTabProps) {
  if (!merged.hasData) {
    return (
      <EmptyState
        message="Performans verisi yok"
        subtext="Oyun ve çalışma yaptıkça harf uzunlukları ve tahmin süreleri burada analiz edilecektir."
      />
    )
  }

  const { byLength, bonus, timing, pass } = computePerformance(merged)

  return (
    <div className="space-y-4 pb-8">
      {/* ─── Harf Sayısına Göre Performans (4–7) ─── */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <span>📏</span> Harf Sayısına Göre Başarı
        </h3>

        <div className="space-y-3">
          {byLength.map((item) => {
            const hasEnough = item.successRate !== null
            const maxGuessDist = Math.max(1, ...Object.values(item.guessDist))

            return (
              <div
                key={item.length}
                className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-2.5"
              >
                {/* Başlık ve Temel Sayılar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">
                      {item.length} Harfli
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ({item.solved}/{item.seen} doğru)
                    </span>
                  </div>
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                      hasEnough
                        ? item.successRate! >= 70
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : item.successRate! >= 40
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-slate-700/40 text-slate-400 border-slate-600/30'
                    }`}
                  >
                    {hasEnough ? `%${item.successRate}` : 'Yeterli veri yok'}
                  </span>
                </div>

                {/* Ortalama Tahmin ve Kayıp Nedenleri */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-black/20 rounded-lg p-2">
                    <div className="text-[10px] text-slate-400">Ortalama Tahmin</div>
                    <div className="font-bold text-slate-200 mt-0.5">
                      {item.avgGuess !== null ? `${item.avgGuess}. tahmin` : '-'}
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2">
                    <div className="text-[10px] text-slate-400">Kayıp / PAS</div>
                    <div className="font-bold text-rose-300 mt-0.5">
                      {item.lost} kayıp {item.lossReasons.pass > 0 && `(${item.lossReasons.pass} PAS)`}
                    </div>
                  </div>
                </div>

                {/* 1–5. Tahmin Dağılımı Çubukları */}
                {item.solved > 0 && (
                  <div className="pt-1">
                    <div className="text-[10px] font-bold text-slate-400 mb-1.5">
                      Tahmin Dağılımı (1–5. hak)
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px]">
                      {[1, 2, 3, 4, 5].map((g) => {
                        const cnt = item.guessDist[g] || 0
                        const pct = Math.round((cnt / maxGuessDist) * 100)
                        return (
                          <div key={g} className="flex flex-col items-center">
                            <div className="h-10 w-full bg-black/30 rounded flex items-end p-0.5">
                              <div
                                style={{ height: `${pct}%` }}
                                className="w-full bg-violet-500/70 rounded-sm"
                              />
                            </div>
                            <span className="text-slate-400 mt-1">{g}.</span>
                            <span className="text-white font-bold">{cnt}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Kayıp Nedenleri Ayrıntısı (varsa) */}
                {item.lost > 0 && (
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 pt-1 border-t border-white/5">
                    {item.lossReasons.five_guesses > 0 && (
                      <span>5 Hak: {item.lossReasons.five_guesses}</span>
                    )}
                    {item.lossReasons.invalid_word > 0 && (
                      <span className="text-amber-400">Sözlük Dışı: {item.lossReasons.invalid_word}</span>
                    )}
                    {item.lossReasons.timeout > 0 && (
                      <span className="text-rose-400">Süre Doldu: {item.lossReasons.timeout}</span>
                    )}
                    {item.lossReasons.pass > 0 && (
                      <span className="text-cyan-400">PAS: {item.lossReasons.pass}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Bonus Soru Performansı ─── */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>🎁</span> Bonus Soru (8 Harfli)
          </h3>
          <span className="text-xs font-bold text-amber-400 font-mono">
            {bonus.seen > 0 ? `${bonus.solved}/${bonus.seen} (${bonus.successRate}%)` : 'Veri yok'}
          </span>
        </div>

        {bonus.seen === 0 ? (
          <p className="text-xs text-slate-500 italic">Henüz bonus soru oynanmadı.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 rounded-xl p-2.5">
                <div className="text-[10px] text-slate-400">BİL'de Açık Harf Ortalaması</div>
                <div className="text-base font-black text-white mt-0.5">
                  {bonus.avgLettersOpened !== null ? `${bonus.avgLettersOpened} harf` : '-'}
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5">
                <div className="text-[10px] text-slate-400">BİL'e Basma Zamanı</div>
                <div className="text-base font-black text-amber-300 mt-0.5">
                  {bonus.avgBilSecond !== null ? `${bonus.avgBilSecond}. saniye` : '-'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-slate-400 text-[10px]">Doğru</div>
                <div className="font-bold text-emerald-400 mt-0.5">{bonus.solved}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-slate-400 text-[10px]">Yanlış / Süre</div>
                <div className="font-bold text-rose-400 mt-0.5">
                  {bonus.wrong + bonus.writeTimeout}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-slate-400 text-[10px]">Hiç Basılmadı</div>
                <div className="font-bold text-slate-400 mt-0.5">{bonus.notPressed}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Zaman ve PAS Kullanımı ─── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Zaman */}
        <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5">
          <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1">
            <span>⏱️</span> Tahmin Süresi
          </h4>
          <div className="text-xl font-black text-cyan-400">
            {timing.avgGuessSeconds !== null ? `${timing.avgGuessSeconds} sn` : '-'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Süre aşımı: {timing.timeoutCount} ({timing.timeoutRate !== null ? `%${timing.timeoutRate}` : '-'})
          </div>
        </div>

        {/* PAS */}
        <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5">
          <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1">
            <span>⏭️</span> PAS Kullanımı
          </h4>
          <div className="text-xl font-black text-amber-400">
            {pass.totalPass} kez
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Soru başına: {pass.passPerQuestion !== null ? `${pass.passPerQuestion}` : '-'}
          </div>
        </div>
      </div>
    </div>
  )
}
