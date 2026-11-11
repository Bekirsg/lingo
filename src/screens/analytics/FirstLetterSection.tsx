/**
 * LİNGO v2 — Analiz: İlk Harfe Göre Başarısızlık Bölümü
 */

import type { InitialLetterMissedStats } from '../../analytics/selectors'

interface FirstLetterSectionProps {
  stats: InitialLetterMissedStats[]
}

export function FirstLetterSection({ stats }: FirstLetterSectionProps) {
  return (
    <section className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <span>🔤</span> En Başarısız Olunan Baş Harfler
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Kelimelerin ilk harfine göre en çok kaçırılma ve hata sayıları
        </p>
      </div>

      {stats.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 bg-white/[0.02] rounded-xl border border-white/5">
          Henüz baş harflere göre kayıtlı hata bulunmuyor.
        </div>
      ) : (
        <div className="space-y-2">
          {stats.slice(0, 8).map((item) => (
            <div
              key={item.char}
              className="bg-white/5 rounded-xl p-2.5 border border-white/5 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-black text-violet-300 text-sm shrink-0">
                  {item.char}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{`${item.char} ile Başlayan`}</span>
                    <span className="text-[10px] text-slate-400">
                      {`(${item.distinctWordsCount} farklı kelime)`}
                    </span>
                  </div>
                  {item.topWords.length > 0 && (
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {item.topWords.map((w) => `${w.word} (×${w.total})`).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                {`${item.missedCount} Hata`}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
