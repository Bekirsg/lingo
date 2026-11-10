/**
 * LİNGO v2 — Analizler: Kelimeler Sekmesi (Kaçırılan Kelimeler)
 * SPEC-v2 Bölüm 7.2
 */

import { useState, useEffect, useMemo } from 'react'
import type { AnalyticsData, AnalyticsFilter } from '../../analytics/types'
import { filterAndSortMissedWords } from '../../analytics/selectors'
import { EmptyState } from './EmptyState'

interface WordsTabProps {
  rawData: AnalyticsData
  filter: AnalyticsFilter
}

export function WordsTab({ rawData, filter }: WordsTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [letterFilter, setLetterFilter] = useState<number | 'all'>('all')
  const [levelFilter, setLevelFilter] = useState<'all' | 'kolay' | 'orta' | 'zor'>('all')
  const [sortBy, setSortBy] = useState<'alpha' | 'count'>('alpha')
  const [pageLimit, setPageLimit] = useState(50)

  // Tembel seviye verisi haritası: { [word]: 'kolay' | 'orta' | 'zor' }
  const [levelsMap, setLevelsMap] = useState<Record<string, 'kolay' | 'orta' | 'zor'>>({})
  const [levelsLoading, setLevelsLoading] = useState(false)
  const [levelsFailed, setLevelsFailed] = useState(false)

  // Öğrenilmiş kelimeler (be:v2:study)
  const [learnedSet, setLearnedSet] = useState<Set<string>>(new Set())

  // Seviye dosyalarını tembel yükle
  useEffect(() => {
    let active = true

    async function loadLevels() {
      setLevelsLoading(true)
      try {
        const map: Record<string, 'kolay' | 'orta' | 'zor'> = {}
        const lengths = [4, 5, 6, 7, 8]
        await Promise.all(
          lengths.map(async (len) => {
            const res = await fetch(`/data/levels-${len}.json`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            if (data?.kolay && Array.isArray(data.kolay)) {
              for (const w of data.kolay) map[w] = 'kolay'
            }
            if (data?.orta && Array.isArray(data.orta)) {
              for (const w of data.orta) map[w] = 'orta'
            }
          })
        )
        if (active) {
          setLevelsMap(map)
          setLevelsFailed(false)
          setLevelsLoading(false)
        }
      } catch (err) {
        console.warn('[WordsTab] Seviye dosyaları yüklenemedi:', err)
        if (active) {
          setLevelsFailed(true)
          setLevelsLoading(false)
        }
      }
    }

    loadLevels()

    // be:v2:study oku
    try {
      const rawStudy = typeof localStorage !== 'undefined' ? localStorage.getItem('be:v2:study') : null
      if (rawStudy) {
        const parsed = JSON.parse(rawStudy)
        if (parsed?.learned && typeof parsed.learned === 'object') {
          setLearnedSet(new Set(Object.keys(parsed.learned)))
        }
      }
    } catch {
      // yoksay
    }

    return () => {
      active = false
    }
  }, [])

  const filteredItems = useMemo(() => {
    return filterAndSortMissedWords(rawData.missedWords || {}, {
      mode: filter.mode,
      searchQuery,
      letterFilter,
      levelFilter,
      sortBy,
      levelsMap,
      learnedSet,
    })
  }, [rawData.missedWords, filter.mode, searchQuery, letterFilter, levelFilter, sortBy, levelsMap, learnedSet])

  const visibleItems = useMemo(() => {
    return filteredItems.slice(0, pageLimit)
  }, [filteredItems, pageLimit])

  const hasAnyMissed = Object.keys(rawData.missedWords || {}).length > 0

  if (!hasAnyMissed) {
    return <EmptyState message="Kaçırılan kelime yok" subtext="Oyun veya çalışma sırasında bilemediğin kelimeler burada birikecektir." />
  }

  return (
    <div className="space-y-3 pb-8">
      {/* ─── Üst Eylem ve Başlık ─── */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400 font-bold">
          Toplam {filteredItems.length} Kaçırılan Kelime
        </div>
        <button
          type="button"
          disabled
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-bold opacity-60 cursor-not-allowed"
          title="V2-M8 aşamasında bağlanacaktır"
        >
          <span>🎯 Bu kelimelerle çalış</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-black">
            YAKINDA
          </span>
        </button>
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
          placeholder="Kelime ara..."
          className="w-full bg-[var(--color-bg-card)] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
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

      {/* ─── Filtre Çipleri: Harf Sayısı & Seviye ─── */}
      <div className="space-y-2">
        {/* Harf Sayısı */}
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
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }
                `}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Seviye */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0 mr-1">Seviye:</span>
          {(['all', 'kolay', 'orta', 'zor'] as const).map((lvl) => {
            const isSelected = levelFilter === lvl
            const label = lvl === 'all' ? 'Tümü' : lvl === 'kolay' ? 'Kolay' : lvl === 'orta' ? 'Orta' : 'Zor'
            return (
              <button
                key={lvl}
                type="button"
                disabled={levelsFailed}
                onClick={() => {
                  setLevelFilter(lvl)
                  setPageLimit(50)
                }}
                className={`
                  px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0
                  ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }
                  ${levelsFailed ? 'opacity-40 cursor-not-allowed' : ''}
                `}
              >
                {label}
              </button>
            )
          })}
          {levelsLoading && (
            <span className="text-[10px] text-slate-400 italic shrink-0">Yükleniyor...</span>
          )}
          {levelsFailed && (
            <span className="text-[10px] text-rose-400 italic shrink-0">Seviyeler pasif</span>
          )}
        </div>
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
            En Çok Kaçırılan
          </button>
        </div>
      </div>

      {/* ─── Liste ─── */}
      {visibleItems.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-white/5 rounded-2xl">
          Filtreye uygun kaçırılan kelime bulunamadı.
        </div>
      ) : (
        <div className="space-y-1.5">
          {visibleItems.map((item) => {
            const levelColor =
              item.level === 'kolay'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : item.level === 'orta'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-violet-500/20 text-violet-300 border-violet-500/30'

            return (
              <div
                key={item.word}
                className="flex items-center justify-between bg-[var(--color-bg-card)] rounded-xl px-3.5 py-2.5 border border-white/5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white tracking-wide">
                    {item.word}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${levelColor}`}>
                    {item.level ? item.level[0].toUpperCase() + item.level.slice(1) : 'Zor'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.letterCount}H
                  </span>
                  {item.isLearned && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ Öğrenildi
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs font-mono font-bold">
                  {filter.mode === 'all' ? (
                    <>
                      {item.y > 0 && <span className="text-violet-400">Y×{item.y}</span>}
                      {item.c > 0 && <span className="text-emerald-400">Ç×{item.c}</span>}
                    </>
                  ) : filter.mode === 'yarisma' ? (
                    <span className="text-violet-400">Y×{item.y}</span>
                  ) : (
                    <span className="text-emerald-400">Ç×{item.c}</span>
                  )}
                </div>
              </div>
            )
          })}
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
