/**
 * LİNGO v2 — Analiz: TDK Dışı Kelime Denemeleri Bölümü
 */

import type { SimplifiedInvalidWordsResult } from '../../analytics/selectors'
import { playSound } from '../../audio/sound'
import { triggerHaptic } from '../../haptics/vibration'

interface InvalidWordsSectionProps {
  data: SimplifiedInvalidWordsResult
  onOpenManage?: () => void
}

export function InvalidWordsSection({ data, onOpenManage }: InvalidWordsSectionProps) {
  const { totalAttempts, uniqueCount, items } = data

  return (
    <section className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>🚫</span> TDK Dışı Kelime Denemeleri
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Sözlükte yer almayan ve tahmin hakkını boşa harcayan diziler
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenManage && (
            <button
              type="button"
              onClick={() => {
                playSound('key_press')
                triggerHaptic('tap')
                onOpenManage()
              }}
              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-[11px] font-bold text-slate-300 border border-white/10 transition-all flex items-center gap-1 min-h-[32px]"
              title="Listeyi düzenle"
            >
              <span>✏️</span> Düzenle
            </button>
          )}
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-rose-400">
              {`${totalAttempts} Toplam`}
            </div>
            <div className="text-[10px] text-slate-400">
              {`${uniqueCount} Farklı Dizi`}
            </div>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 bg-white/[0.02] rounded-xl border border-white/5">
          {totalAttempts === 0
            ? 'Kayıtlı TDK dışı kelime denemesi bulunmuyor.'
            : 'En az 2 kez tekrarlanan geçersiz kelime denemesi yok.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {items.slice(0, 12).map((item) => (
              <div
                key={item.word}
                className="bg-white/5 rounded-xl p-2.5 border border-white/5 flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-black text-rose-300 tracking-wider uppercase font-mono">
                    {item.word}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {item.length} Harfli
                  </span>
                </div>
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {`×${item.total}`}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 italic">
            İpucu: Sözlükte yer almayan kelimeleri tahmin olarak göndermek hak ve süre kaybına neden olur.
          </p>
        </>
      )}
    </section>
  )
}
