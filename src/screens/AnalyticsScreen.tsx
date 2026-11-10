/**
 * LİNGO v2 — Analizler Ekranı
 * SPEC-v2 Bölüm 7 ve 3.4
 */

import { useState, useMemo } from 'react'
import { loadAnalytics } from '../analytics/storage'
import { mergeBuckets } from '../analytics/merge'
import { computeOverview } from '../analytics/selectors'
import type { AnalyticsFilter, FilterMode, FilterLevel } from '../analytics/types'
import { OverviewTab } from './analytics/OverviewTab'
import { WordsTab } from './analytics/WordsTab'
import { InvalidWordsTab } from './analytics/InvalidWordsTab'
import { PerformanceTab } from './analytics/PerformanceTab'
import { LettersTab } from './analytics/LettersTab'
import { ProgressTab } from './analytics/ProgressTab'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

export type AnalyticsTabKey =
  | 'overview'
  | 'words'
  | 'invalid'
  | 'performance'
  | 'letters'
  | 'progress'

interface AnalyticsScreenProps {
  onBack: () => void
}

export default function AnalyticsScreen({ onBack }: AnalyticsScreenProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTabKey>('overview')
  const [modeFilter, setModeFilter] = useState<FilterMode>('all')
  const [levelFilter, setLevelFilter] = useState<FilterLevel>('all')

  // Veriyi be:v2:analytics'ten oku
  const rawData = useMemo(() => loadAnalytics(), [])

  const filter: AnalyticsFilter = useMemo(
    () => ({
      mode: modeFilter,
      level: levelFilter,
    }),
    [modeFilter, levelFilter]
  )

  const merged = useMemo(() => mergeBuckets(rawData, filter), [rawData, filter])
  const overview = useMemo(() => computeOverview(merged, rawData, filter), [merged, rawData, filter])

  const tabs: { key: AnalyticsTabKey; label: string; icon: string }[] = [
    { key: 'overview', label: 'Özet', icon: '📊' },
    { key: 'words', label: 'Kelimeler', icon: '📖' },
    { key: 'invalid', label: 'Sözlük Dışı', icon: '❌' },
    { key: 'performance', label: 'Performans', icon: '📈' },
    { key: 'letters', label: 'Harfler', icon: '🔤' },
    { key: 'progress', label: 'İlerleme', icon: '🚀' },
  ]

  const isLevelIrrelevant = modeFilter === 'hatalar' && levelFilter !== 'all'

  const handleTabChange = (tab: AnalyticsTabKey) => {
    playSound('key_press')
    triggerHaptic('tap')
    setActiveTab(tab)
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] select-none overflow-x-hidden">
      {/* ─── Sabit Üst Bar (Sticky Header) ─── */}
      <header className="sticky top-0 z-30 bg-[var(--color-bg-primary)]/95 backdrop-blur-md border-b border-white/10 px-4 pt-3 pb-2 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playSound('key_press')
                triggerHaptic('tap')
                onBack()
              }}
              className="text-[var(--color-accent)] text-2xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90 transition-transform -ml-2"
              aria-label="Ana Menüye Dön"
            >
              ←
            </button>
            <h2 className="text-lg font-black text-white tracking-wide">Analizler</h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
            LİNGO v2
          </span>
        </div>

        {/* ─── Filtre Satırı (Mod & Seviye) ─── */}
        <div className="space-y-1.5 pt-1">
          {/* Mod Seçimi */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 mr-1">Mod:</span>
            {[
              { id: 'all' as FilterMode, label: 'Tümü' },
              { id: 'yarisma' as FilterMode, label: 'Yarışma' },
              { id: 'calisma' as FilterMode, label: 'Çalışma' },
              { id: 'hatalar' as FilterMode, label: 'Hatalarımla' },
            ].map((m) => {
              const active = modeFilter === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    playSound('key_press')
                    triggerHaptic('tap')
                    setModeFilter(m.id)
                  }}
                  className={`
                    px-2.5 py-1.5 rounded-xl font-bold transition-all shrink-0 text-xs
                    ${
                      active
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 ring-1 ring-violet-400'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Seviye Seçimi */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 mr-1">Seviye:</span>
            {[
              { id: 'all' as FilterLevel, label: 'Tümü' },
              { id: 'kolay' as FilterLevel, label: 'Kolay' },
              { id: 'orta' as FilterLevel, label: 'Orta' },
              { id: 'zor' as FilterLevel, label: 'Zor' },
            ].map((lvl) => {
              const active = levelFilter === lvl.id
              return (
                <button
                  key={lvl.id}
                  type="button"
                  disabled={modeFilter === 'hatalar'}
                  onClick={() => {
                    playSound('key_press')
                    triggerHaptic('tap')
                    setLevelFilter(lvl.id)
                  }}
                  className={`
                    px-2.5 py-1 rounded-lg font-bold transition-all shrink-0 text-xs
                    ${
                      active
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }
                    ${modeFilter === 'hatalar' ? 'opacity-40 cursor-not-allowed' : ''}
                  `}
                >
                  {lvl.label}
                </button>
              )
            })}
          </div>

          {/* Hatalarımla + Seviye Uyarısı */}
          {isLevelIrrelevant && (
            <div className="text-[10px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
              ℹ️ Bu mod için seviye ayrımı yok.
            </div>
          )}

          {/* Mod=Tümü Bilgilendirme Notu */}
          {modeFilter === 'all' && (
            <p className="text-[10px] text-slate-400 leading-tight px-1">
              * Hatalarımla çalış, zorlandığın kelimelerden oluştuğu için başarı oranını düşürebilir.
            </p>
          )}
        </div>

        {/* ─── Sekmeler Çubuğu (Yatay Kaydırılabilir) ─── */}
        <nav
          className="flex gap-2 overflow-x-auto no-scrollbar pt-2 pb-1 border-t border-white/5 -mx-4 px-4"
          aria-label="Analiz sekmeleri"
        >
          {tabs.map((t) => {
            const active = activeTab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => handleTabChange(t.key)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all min-h-[44px]
                  ${
                    active
                      ? 'bg-white/20 text-white border border-white/20 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
                aria-current={active ? 'page' : undefined}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            )
          })}
        </nav>
      </header>

      {/* ─── Sekme İçeriği (Tab Content) ─── */}
      <main className="flex-1 px-4 pt-4">
        {activeTab === 'overview' && <OverviewTab overview={overview} filter={filter} />}
        {activeTab === 'words' && <WordsTab rawData={rawData} filter={filter} />}
        {activeTab === 'invalid' && <InvalidWordsTab rawData={rawData} filter={filter} />}
        {activeTab === 'performance' && <PerformanceTab merged={merged} />}
        {activeTab === 'letters' && <LettersTab merged={merged} />}
        {activeTab === 'progress' && <ProgressTab rawData={rawData} filter={filter} />}
      </main>
    </div>
  )
}
