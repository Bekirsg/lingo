/**
 * LİNGO v2 — Analiz: En Çok Bilinemeyen Kelimeler Bölümü
 */

import { useState } from 'react'
import type { SimplifiedMissedWord } from '../../analytics/selectors'
import { playSound } from '../../audio/sound'
import { triggerHaptic } from '../../haptics/vibration'

interface MissedWordsSectionProps {
  words: SimplifiedMissedWord[]
  onStartMistakes?: () => void
  onOpenManage?: () => void
}

export function MissedWordsSection({ words, onStartMistakes, onOpenManage }: MissedWordsSectionProps) {
  const [displayLimit, setDisplayLimit] = useState(15)

  const visibleWords = words.slice(0, displayLimit)
  const hasMore = words.length > displayLimit

  const handleShowMore = () => {
    playSound('key_press')
    triggerHaptic('tap')
    setDisplayLimit((prev) => prev + 15)
  }

  return (
    <section className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>❌</span> En Çok Bilinemeyen Kelimeler
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Tekrarlanan kaçırılma sayılarına göre (en az 2 kez bilinemeyenler)
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
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {words.length} Kelime
          </span>
        </div>
      </div>

      {words.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 bg-white/[0.02] rounded-xl border border-white/5">
          Bu filtreye uygun en az 2 kez kaçırılan kelime bulunmuyor.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {visibleWords.map((item) => (
              <div
                key={item.word}
                className="bg-white/5 rounded-xl p-2.5 border border-white/5 flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-black text-white tracking-wider uppercase">
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

          {/* Daha Fazla Göster Butonu */}
          {hasMore && (
            <button
              type="button"
              onClick={handleShowMore}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-98 transition-all text-xs font-bold text-slate-300 flex items-center justify-center gap-1 min-h-[44px]"
            >
              Daha Fazla Göster (+{Math.min(15, words.length - displayLimit)})
            </button>
          )}

          {/* Hatalarımla Çalış Butonu */}
          {onStartMistakes && (
            <button
              type="button"
              onClick={() => {
                playSound('key_press')
                triggerHaptic('tap')
                onStartMistakes()
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-98 transition-all text-xs font-black text-white shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 min-h-[44px]"
            >
              <span>🔥</span> Bu Kelimelerle Çalış
            </button>
          )}
        </>
      )}
    </section>
  )
}
