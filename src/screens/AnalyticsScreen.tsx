/**
 * LİNGO v2 — Analizler Ekranı (Sadeleştirilmiş ve Yeniden Tasarlanmış)
 * Mobil öncelikli, tek dikey akış, 3 filtre görünümü (Tümü / Harf Sayısı / Baş Harf)
 */

import { useState, useMemo } from 'react'
import { loadAnalytics } from '../analytics/storage'
import { mergeBuckets } from '../analytics/merge'
import {
  computeSimplifiedSummary,
  computeRankingByLength,
  computeMissedWords,
  computeInvalidWords,
  computeMissedByFirstLetter,
  computeActionableInsights,
  TURKISH_ALPHABET_LETTERS,
} from '../analytics/selectors'
import type { FilterType, AnalyticsFilter } from '../analytics/types'
import { SummarySection } from './analytics/SummarySection'
import { RankingSection } from './analytics/RankingSection'
import { LengthPerformanceSection } from './analytics/LengthPerformanceSection'
import { MissedWordsSection } from './analytics/MissedWordsSection'
import { FirstLetterSection } from './analytics/FirstLetterSection'
import { InvalidWordsSection } from './analytics/InvalidWordsSection'
import { InsightsSection } from './analytics/InsightsSection'
import { EmptyState } from './analytics/EmptyState'
import MistakesManagerModal from './MistakesManagerModal'
import { loadStudyData } from '../game/mistakes/studyStorage'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

interface AnalyticsScreenProps {
  onBack: () => void
  onStartMistakes?: () => void
}

export default function AnalyticsScreen({ onBack, onStartMistakes }: AnalyticsScreenProps) {
  // 3 Görünüm Filtresi: 'all' (Tümü) | 'length' (Harf Sayısına Göre) | 'initial' (Baş Harfe Göre)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [selectedLength, setSelectedLength] = useState<number>(5)
  const [selectedInitial, setSelectedInitial] = useState<string>('A')

  // Hatalarım Düzenleme Ekranı
  const [showManagerModal, setShowManagerModal] = useState(false)
  const [managerInitialTab, setManagerInitialTab] = useState<'missed' | 'invalid'>('missed')
  const [dataRevision, setDataRevision] = useState(0)

  // Veriyi be:v2:analytics ve be:v2:study'den oku
  const rawData = useMemo(() => loadAnalytics(), [dataRevision])
  const studyData = useMemo(() => loadStudyData(), [dataRevision])

  // Birleşik filtre nesnesi
  const filter: AnalyticsFilter = useMemo(
    () => ({
      type: filterType,
      length: filterType === 'length' ? selectedLength : undefined,
      initial: filterType === 'initial' ? selectedInitial.toLocaleLowerCase('tr-TR') : undefined,
      mode: 'all',
      level: 'all',
    }),
    [filterType, selectedLength, selectedInitial]
  )

  const merged = useMemo(() => mergeBuckets(rawData, filter), [rawData, filter])

  // Hesaplamalar (Saf fonksiyonlar)
  const summary = useMemo(
    () => computeSimplifiedSummary(merged, rawData, filter),
    [merged, rawData, filter]
  )
  const ranking = useMemo(() => computeRankingByLength(merged), [merged])
  const missedWords = useMemo(
    () => computeMissedWords(rawData.missedWords || {}, filter, 2, studyData.hidden),
    [rawData.missedWords, filter, studyData.hidden]
  )
  const invalidWords = useMemo(
    () => computeInvalidWords(rawData.invalidWords || {}, filter, 2, studyData.invalidHidden),
    [rawData.invalidWords, filter, studyData.invalidHidden]
  )
  const firstLetterStats = useMemo(
    () => computeMissedByFirstLetter(rawData.missedWords || {}, filter),
    [rawData.missedWords, filter]
  )
  const insights = useMemo(
    () => computeActionableInsights(merged, rawData, filter),
    [merged, rawData, filter]
  )

  const handleFilterTypeChange = (type: FilterType) => {
    playSound('key_press')
    triggerHaptic('tap')
    setFilterType(type)
  }

  const handleLengthSelect = (len: number) => {
    playSound('key_press')
    triggerHaptic('tap')
    setSelectedLength(len)
  }

  const handleInitialSelect = (char: string) => {
    playSound('key_press')
    triggerHaptic('tap')
    setSelectedInitial(char)
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] select-none overflow-x-hidden">
      {/* ─── Sabit Üst Bar (Sticky Header) ─── */}
      <header className="sticky top-0 z-30 bg-[var(--color-bg-primary)]/95 backdrop-blur-md border-b border-white/10 px-4 pt-3 pb-2.5 space-y-2.5">
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

        {/* ─── 3 Görünüm Filtresi ─── */}
        <div className="space-y-2">
          {/* Ana Filtre Düğmeleri */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5 text-xs font-bold">
            <button
              type="button"
              onClick={() => handleFilterTypeChange('all')}
              className={`py-2 rounded-lg transition-all min-h-[40px] flex items-center justify-center ${
                filterType === 'all'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 ring-1 ring-violet-400 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Tümü
            </button>
            <button
              type="button"
              onClick={() => handleFilterTypeChange('length')}
              className={`py-2 rounded-lg transition-all min-h-[40px] flex items-center justify-center ${
                filterType === 'length'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 ring-1 ring-violet-400 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Harf Sayısı
            </button>
            <button
              type="button"
              onClick={() => handleFilterTypeChange('initial')}
              className={`py-2 rounded-lg transition-all min-h-[40px] flex items-center justify-center ${
                filterType === 'initial'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 ring-1 ring-violet-400 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Baş Harf
            </button>
          </div>

          {/* Alt Seçici: Harf Sayısı (4, 5, 6, 7) */}
          {filterType === 'length' && (
            <div className="grid grid-cols-4 gap-1.5 pt-0.5 text-xs font-bold">
              {[4, 5, 6, 7].map((len) => {
                const active = selectedLength === len
                return (
                  <button
                    key={len}
                    type="button"
                    onClick={() => handleLengthSelect(len)}
                    className={`py-1.5 rounded-lg border transition-all min-h-[36px] flex items-center justify-center ${
                      active
                        ? 'bg-violet-500/20 text-violet-300 border-violet-500/40 ring-1 ring-violet-500/30 font-black'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {len} Harf
                  </button>
                )
              })}
            </div>
          )}

          {/* Alt Seçici: Baş Harf Izgarası (29 Türk Harfi) */}
          {filterType === 'initial' && (
            <div className="pt-0.5">
              <div className="grid grid-cols-10 sm:grid-cols-15 gap-1 max-h-32 overflow-y-auto no-scrollbar p-1 bg-black/20 rounded-xl border border-white/5">
                {TURKISH_ALPHABET_LETTERS.map((char) => {
                  const active = selectedInitial === char
                  return (
                    <button
                      key={char}
                      type="button"
                      onClick={() => handleInitialSelect(char)}
                      className={`h-8 rounded-md font-bold text-xs flex items-center justify-center transition-all ${
                        active
                          ? 'bg-violet-600 text-white shadow ring-1 ring-violet-300 font-black scale-105'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10 active:scale-95'
                      }`}
                    >
                      {char}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ─── Ana İçerik: Tek Dikey Akış (Scrollable) ─── */}
      <main className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full pb-10">
        {!summary.hasData && filterType !== 'all' ? (
          <EmptyState
            message="Bu filtrede henüz veri yok"
            subtext="Seçilen filtre kriterine uygun tamamlanmış oyun veya hata kaydı bulunmuyor."
          />
        ) : !summary.hasData ? (
          <EmptyState
            message="Henüz veri yok"
            subtext="Yarışma veya Çalışma modunda oynadıkça performans analizlerin burada listelenecektir."
          />
        ) : (
          <>
            {/* 1. Performans Özeti */}
            <SummarySection summary={summary} />

            {/* 2. Başarı Sıralaması (Harf Sayılarına Göre) */}
            <RankingSection
              ranking={ranking}
              activeLength={filterType === 'length' ? selectedLength : undefined}
            />

            {/* 3. Harf Sayısına Göre Başarı Performansı */}
            <LengthPerformanceSection
              items={ranking}
              activeLength={filterType === 'length' ? selectedLength : undefined}
            />

            {/* 4. En Çok Bilinemeyen Kelimeler (Katsayı x2, x3...) */}
            <MissedWordsSection
              words={missedWords}
              onStartMistakes={onStartMistakes}
              onOpenManage={() => {
                setManagerInitialTab('missed')
                setShowManagerModal(true)
              }}
            />

            {/* 5. En Başarısız Olunan Kelimeler (İlk Harfe Göre) */}
            <FirstLetterSection stats={firstLetterStats} />

            {/* 6. TDK Dışı Kelime Denemeleri */}
            <InvalidWordsSection
              data={invalidWords}
              onOpenManage={() => {
                setManagerInitialTab('invalid')
                setShowManagerModal(true)
              }}
            />

            {/* 7. Gelişim Önerileri */}
            <InsightsSection insights={insights} />
          </>
        )}
      </main>

      {/* Hatalarım Düzenleme Ekranı Modal'ı */}
      {showManagerModal && (
        <MistakesManagerModal
          initialTab={managerInitialTab}
          onClose={() => setShowManagerModal(false)}
          onDataChanged={() => setDataRevision((prev) => prev + 1)}
        />
      )}
    </div>
  )
}
