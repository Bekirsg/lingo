/**
 * LİNGO v2 — Analizler: Sözlük Dışı Sekmesi
 * SPEC-v2 Bölüm 7.3
 */

import { useState, useMemo } from 'react'
import type { AnalyticsData, AnalyticsFilter } from '../../analytics/types'
import { filterAndSortInvalidWords } from '../../analytics/selectors'
import { EmptyState } from './EmptyState'

interface InvalidWordsTabProps {
  rawData: AnalyticsData
  filter: AnalyticsFilter
}

export function InvalidWordsTab({ rawData, filter }: InvalidWordsTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [letterFilter, setLetterFilter] = useState<number | 'all'>('all')
  const [sortBy, setSortBy] = useState<'alpha' | 'count'>('count')
  const [pageLimit, setPageLimit] = useState(50)

  const filteredItems = useMemo(() => {
    return filterAndSortInvalidWords(rawData.invalidWords || {}, {
      mode: filter.mode,
      searchQuery,
      letterFilter,
      sortBy,
    })
  }, [rawData.invalidWords, filter.mode, searchQuery, letterFilter, sortBy])

  const visibleItems = useMemo(() => {
    return filteredItems.slice(0, pageLimit)
  }, [filteredItems, pageLimit])

  const hasAnyInvalid = Object.keys(rawData.invalidWords || {}).length > 0

  if (!hasAnyInvalid) {
    return (
      <EmptyState
        message="Sözlük dışı kelime yok"
        subtext="Oyun sırasında TDK sözlüğünde bulunmayan tahminler yaptığında burada listelenecektir."
      />
    )
  }

  return (
    <div className="space-y-3 pb-8">
      {/* ─── Açıklama Notu ─── */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-xs text-amber-200/90 leading-relaxed">
        ℹ️ Bunlar kelime sandığın ama TDK'da bulunmayan diziler.
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
        <span>Toplam {filteredItems.length} Sözlük Dışı Dizi</span>
      </div>

      {/* ─── Arama Kutusu ─── */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPageLimit(50)
          }}
          placeholder="Dizi ara..."
          className="w-full bg-[var(--color-bg-card)] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* ─── Filtre Çipleri: Harf Sayısı ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
        <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0 mr-1">Harf:</span>
        {(['all', 4, 5, 6, 7, 8] as const).map((len) => {
          const isSelected = letterFilter === len
          const label = len === 'all' ? 'Tümü' : len === 8 ? '8+ H' : `${len} H`
          return (
            <button
              key={String(len)}
              type="button"
              onClick={() => {
                setLetterFilter(len)
                setPageLimit(50)
              }}
              className={`
                px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0
                ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }
              `}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ─── Sıralama Seçeneği ─── */}
      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-slate-400">Sıralama:</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setSortBy('alpha')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              sortBy === 'alpha' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Alfabetik
          </button>
          <button
            type="button"
            onClick={() => setSortBy('count')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              sortBy === 'count' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            En Çok Yazılan
          </button>
        </div>
      </div>

      {/* ─── Liste ─── */}
      {visibleItems.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-white/5 rounded-2xl">
          Filtreye uygun dizi bulunamadı.
        </div>
      ) : (
        <div className="space-y-1.5">
          {visibleItems.map((item) => (
            <div
              key={item.word}
              className="flex items-center justify-between bg-[var(--color-bg-card)] rounded-xl px-3.5 py-2.5 border border-white/5"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-rose-300 tracking-wide font-mono">
                  {item.word}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {item.letterCount}H
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono font-bold">
                {filter.mode === 'all' ? (
                  <>
                    {item.y > 0 && <span className="text-violet-400">Y×{item.y}</span>}
                    {item.c > 0 && <span className="text-emerald-400">Ç×{item.c}</span>}
                    {item.h > 0 && <span className="text-amber-400">H×{item.h}</span>}
                  </>
                ) : filter.mode === 'yarisma' ? (
                  <span className="text-violet-400">Y×{item.y}</span>
                ) : filter.mode === 'calisma' ? (
                  <span className="text-emerald-400">Ç×{item.c}</span>
                ) : (
                  <span className="text-amber-400">H×{item.h}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Daha Fazla Göster ─── */}
      {filteredItems.length > pageLimit && (
        <button
          type="button"
          onClick={() => setPageLimit((prev) => prev + 50)}
          className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 border border-white/10 transition-colors mt-2"
        >
          Daha Fazla Göster ({pageLimit} / {filteredItems.length})
        </button>
      )}
    </div>
  )
}
