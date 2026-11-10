/**
 * LİNGO v2 — Analizler: Harfler Sekmesi
 * SPEC-v2 Bölüm 7.5
 */

import type { MergedAnalytics } from '../../analytics/types'
import { computeLetters } from '../../analytics/selectors'
import { EmptyState } from './EmptyState'

interface LettersTabProps {
  merged: MergedAnalytics
}

export function LettersTab({ merged }: LettersTabProps) {
  if (!merged.hasData) {
    return (
      <EmptyState
        message="Harf verisi yok"
        subtext="Oyun sırasında tahmin yaptıkça harflerin başarı ve karışıklık oranları burada analiz edilecektir."
      />
    )
  }

  const { hardestLetters, pairs, positions } = computeLetters(merged)

  const PAIR_LABELS: Record<string, string> = {
    iı: 'i ↔ ı',
    oö: 'o ↔ ö',
    uü: 'u ↔ ü',
    cç: 'c ↔ ç',
    sş: 's ↔ ş',
    gğ: 'g ↔ ğ',
  }

  const maxPairCount = Math.max(1, ...Object.values(pairs))

  return (
    <div className="space-y-4 pb-8">
      {/* ─── En Zorlanılan 10 Harf ─── */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>🔴</span> En Çok Zorlanılan Harfler
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Tahminde yazıldığında kırmızı çıkma oranı en yüksek olanlar (en az 10 deneme).
          </p>
        </div>

        {hardestLetters.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">
            Henüz en az 10 kez denenen harf bulunamadı (Yeterli veri yok).
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {hardestLetters.map((item, idx) => (
              <div
                key={item.char}
                className="bg-white/5 rounded-xl p-2.5 flex items-center justify-between border border-white/5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500 font-bold">
                    #{idx + 1}
                  </span>
                  <span className="text-base font-black text-white font-mono uppercase">
                    {item.char}
                  </span>
                  {item.isTurkishSpecial && (
                    <span className="text-[9px] font-bold px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      TR
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-rose-400">
                    %{item.redRate}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    {item.redCount}/{item.totalCount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Benzer Harf Karışıklığı Sayaçları ─── */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>🔀</span> Benzer Harf Karışıklığı
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Kelimedeki harf yerine benzerinin yazılma sıklığı.
          </p>
        </div>

        <div className="space-y-2">
          {Object.entries(PAIR_LABELS).map(([key, label]) => {
            const count = pairs[key] || 0
            const pct = Math.round((count / maxPairCount) * 100)

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 font-mono">{label}</span>
                  <span className="font-mono text-slate-400 font-bold">{count} kez</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${count > 0 ? Math.max(5, pct) : 0}%` }}
                    className="h-full bg-amber-500/80 rounded-full"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Konum Isı Haritası (4–7) ─── */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>🗺️</span> Konum Başarı Oranları (Isı Haritası)
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Her harf uzunluğu için kutu konumlarının yeşil / sarı / kırmızı dağılımı (1. kilitli harf hariç).
          </p>
        </div>

        <div className="space-y-3">
          {[4, 5, 6, 7].map((len) => {
            const posList = positions[len] || []
            if (posList.length === 0) return null

            return (
              <div key={len} className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-2">
                <div className="text-xs font-bold text-white">{len} Harfli Kelimeler</div>
                <div className="grid grid-cols-6 gap-1.5">
                  {posList.map((p) => (
                    <div
                      key={p.pos}
                      className="bg-black/20 rounded-lg p-1.5 flex flex-col items-center text-center"
                    >
                      <span className="text-[10px] text-slate-400 font-mono mb-1">
                        {p.pos + 1}. kutu
                      </span>
                      {p.total === 0 ? (
                        <span className="text-[10px] text-slate-600">-</span>
                      ) : (
                        <div className="h-10 w-4 bg-slate-800 rounded overflow-hidden flex flex-col justify-end">
                          <div
                            style={{ height: `${p.redRate}%` }}
                            className="w-full bg-rose-500/90"
                            title={`Kırmızı: %${p.redRate}`}
                          />
                          <div
                            style={{ height: `${p.yellowRate}%` }}
                            className="w-full bg-amber-400/90"
                            title={`Sarı: %${p.yellowRate}`}
                          />
                          <div
                            style={{ height: `${p.greenRate}%` }}
                            className="w-full bg-emerald-500/90"
                            title={`Yeşil: %${p.greenRate}`}
                          />
                        </div>
                      )}
                      <span className="text-[9px] font-mono font-bold text-emerald-400 mt-1">
                        %{p.greenRate}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
