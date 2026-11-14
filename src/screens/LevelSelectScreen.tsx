/**
 * LİNGO v2 — Seviye Seçimi Ekranı (Yarışma ve Çalışma Modları)
 * SPEC-v2 Bölüm 3.2, 3.3, 4.6, 5, 6 & V2-M4 / V2-M5
 */

import { useState, useEffect, useCallback } from 'react'
import type { GameLevel } from '../data/levels'
import { getLevelRecords } from '../data/storage'
import { loadWordRepository, ensureLevelsLoaded, ensureBonusLevelLoaded, ensureBonusLoaded } from '../data/wordsLoader'
import { formatPoints } from '../components/Hud'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'
import { loadAnalytics } from '../analytics/storage'
import { loadStudyData } from '../game/mistakes/studyStorage'
import { getStudyableCandidates, MISTAKE_POOL_SOURCES } from '../game/mistakes/mistakeSelector'
import MistakesManagerModal from './MistakesManagerModal'

export { MISTAKE_POOL_SOURCES }
export type GameMode = 'yarisma' | 'calisma'

interface LevelSelectScreenProps {
  mode?: GameMode
  onSelectLevel: (level: GameLevel) => void
  onSelectMistakes?: () => void
  onBack: () => void
}

interface LevelCardConfig {
  level: GameLevel
  title: string
  subtitle: string
  description: string
  colorBadge: string
  borderColor: string
  accentColor: string
  icon: string
}

const LEVEL_CARDS: LevelCardConfig[] = [
  {
    level: 'kolay',
    title: 'Kolay',
    subtitle: 'A1–A2 Kelimeleri',
    description: 'Temel ve en sık kullanılan günlük Türkçe kelimeler.',
    colorBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    borderColor: 'border-emerald-500/30 hover:border-emerald-400/70',
    accentColor: 'text-emerald-400',
    icon: '🟢',
  },
  {
    level: 'orta',
    title: 'Orta',
    subtitle: 'A1–B2 Kelimeleri',
    description: 'Geniş günlük dağarcık ve yaşayan Türkçe sözcükler.',
    colorBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    borderColor: 'border-amber-500/30 hover:border-amber-400/70',
    accentColor: 'text-amber-400',
    icon: '🟡',
  },
  {
    level: 'zor',
    title: 'Zor',
    subtitle: 'Tüm TDK Sözlüğü',
    description: 'Nadir, edebi ve uzmanlık terimleri dahil tüm kelimeler.',
    colorBadge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    borderColor: 'border-violet-500/30 hover:border-violet-400/70',
    accentColor: 'text-violet-400',
    icon: '🟣',
  },
]

export default function LevelSelectScreen({
  mode = 'yarisma',
  onSelectLevel,
  onSelectMistakes,
  onBack,
}: LevelSelectScreenProps) {
  const [loadingLevel, setLoadingLevel] = useState<GameLevel | null>(null)
  const [loadError, setLoadError] = useState<{ level: GameLevel; message: string } | null>(null)
  const [studyableCount, setStudyableCount] = useState<number | null>(null)
  const [showManagerModal, setShowManagerModal] = useState(false)
  const records = getLevelRecords()

  const isPractice = mode === 'calisma'

  const refreshStudyableCount = useCallback(() => {
    if (!isPractice) return
    loadWordRepository()
      .then(async (repo) => {
        await ensureBonusLoaded(repo)
        const analytics = loadAnalytics()
        const study = loadStudyData()
        const pool = getStudyableCandidates(analytics.missedWords, study.learned, repo, undefined, study.hidden)
        setStudyableCount(pool.totalCount)
      })
      .catch((err) => {
        console.warn('[LevelSelectScreen] Kelime havuzu okunamadı:', err)
        setStudyableCount(0)
      })
  }, [isPractice])

  // Hatalarımla Çalış kartı için çalışılabilir kelime sayısını hesapla
  useEffect(() => {
    refreshStudyableCount()
  }, [refreshStudyableCount])

  const handleSelect = async (level: GameLevel) => {
    if (loadingLevel) return
    setLoadError(null)

    playSound('key_press')
    triggerHaptic('tap')

    // Zor seviyesi hiçbir dosya indirmez, anında başlar (SPEC-v2 4.6)
    if (level === 'zor') {
      onSelectLevel('zor')
      return
    }

    setLoadingLevel(level)

    try {
      const repo = await loadWordRepository()
      await Promise.all([
        ensureLevelsLoaded(repo, level),
        ensureBonusLevelLoaded(repo, level),
      ])
      onSelectLevel(level)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.'
      console.error('[LİNGO v2] Seviye dosyaları yüklenemedi:', msg)
      // SPEC-v2 M4 Düzeltmesi: Üretimde sessizce Zor'a düşme! Yükleme hatası ekranı göster, oyun başlamasın.
      setLoadError({
        level,
        message: 'Seviye kelime listesi indirilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.',
      })
    } finally {
      setLoadingLevel(null)
    }
  }

  // Yükleme Hatası Ekranı (SPEC-v2 M4 Düzeltmesi)
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-[var(--color-bg-primary)] px-6 text-center select-none animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 text-3xl flex items-center justify-center mb-4">
          ⚠️
        </div>
        <h2 className="text-xl font-black text-white mb-2">Seviye Verisi Yüklenemedi</h2>
        <p className="text-xs text-slate-300 max-w-xs mb-6">
          {loadError.message}
        </p>
        <div className="flex flex-col gap-2.5 w-full max-w-xs">
          <button
            type="button"
            onClick={() => handleSelect(loadError.level)}
            className="w-full py-3.5 px-6 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all duration-200 active:scale-95 shadow-lg shadow-violet-600/30"
          >
            🔄 Tekrar Dene
          </button>
          <button
            type="button"
            onClick={() => setLoadError(null)}
            className="w-full py-3 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-sm border border-white/10 transition-all duration-200 active:scale-95"
          >
            ← Geri
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[var(--color-bg-primary)] px-5 py-6 select-none">
      {/* Üst Bar */}
      <div className="flex items-center mb-6">
        <button
          type="button"
          onClick={() => {
            if (loadingLevel) return
            playSound('key_press')
            triggerHaptic('tap')
            onBack()
          }}
          disabled={Boolean(loadingLevel)}
          className="text-[var(--color-accent)] text-2xl font-bold mr-3 active:scale-90 transition-transform disabled:opacity-40"
          aria-label="Geri"
        >
          ←
        </button>
        <div>
          <h2 className="text-xl font-black text-[var(--color-text-primary)]">
            {isPractice ? 'Çalışma • Seviye Seçimi' : 'Yarışma • Seviye Seçimi'}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            {isPractice
              ? 'Alıştırma yapmak istediğin kelime zorluğunu seç'
              : 'Oynamak istediğin kelime zorluğunu seç'}
          </p>
        </div>
      </div>

      {/* Seviye Kartları */}
      <div className="flex-1 flex flex-col justify-center gap-3.5 max-w-sm mx-auto w-full">
        {LEVEL_CARDS.map((card) => {
          const isLoading = loadingLevel === card.level
          const recordScore = records[card.level]

          return (
            <button
              key={card.level}
              type="button"
              disabled={Boolean(loadingLevel)}
              onClick={() => handleSelect(card.level)}
              className={`
                w-full p-4 rounded-2xl bg-[var(--color-bg-card)] border text-left
                transition-all duration-200 active:scale-98 relative overflow-hidden
                ${card.borderColor}
                ${isLoading ? 'ring-2 ring-violet-400 animate-pulse' : 'hover:bg-white/5'}
                ${loadingLevel && !isLoading ? 'opacity-40 cursor-not-allowed' : ''}
              `}
            >
              {/* Kart Başlığı ve Rozet */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{card.icon}</span>
                  <span className="text-xl font-black text-white">{card.title}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${card.colorBadge}`}>
                  {card.subtitle}
                </span>
              </div>

              {/* Açıklama */}
              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                {card.description}
              </p>

              {/* Alt Bilgi: Rekor veya Çalışma Notu ve Durum */}
              <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
                {isPractice ? (
                  <span className="text-slate-400 text-[11px]">
                    🎯 Sınırsız alıştırma • Puan tutulmaz
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>🏆 En Yüksek:</span>
                    <span className={`font-mono font-bold ${card.accentColor}`}>
                      {recordScore > 0 ? formatPoints(recordScore) : '—'}
                    </span>
                  </div>
                )}

                {isLoading ? (
                  <span className="text-violet-300 font-bold flex items-center gap-1 animate-pulse">
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Yükleniyor...
                  </span>
                ) : (
                  <span className="text-slate-400 text-[11px] group-hover:text-white">
                    Seç ➔
                  </span>
                )}
              </div>
            </button>
          )
        })}

        {/* 4. Kart: Hatalarımla Çalış (Çalışma modunda görünür, SPEC-v2 6.5 & M8) */}
        {isPractice && (
          studyableCount !== null && studyableCount > 0 ? (
            <button
              type="button"
              disabled={Boolean(loadingLevel)}
              onClick={() => {
                if (loadingLevel) return
                playSound('key_press')
                triggerHaptic('tap')
                onSelectMistakes?.()
              }}
              className="w-full p-4 rounded-2xl bg-[var(--color-bg-card)] border border-rose-500/30 hover:border-rose-400/70 text-left transition-all duration-200 active:scale-98 relative overflow-hidden group hover:bg-white/5"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔁</span>
                  <span className="text-xl font-black text-white">Hatalarımla Çalış</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      playSound('key_press')
                      triggerHaptic('tap')
                      setShowManagerModal(true)
                    }}
                    className="text-[11px] font-bold text-rose-300 hover:text-white underline underline-offset-2 min-h-[32px] flex items-center"
                  >
                    Listeyi düzenle
                  </button>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-rose-500/20 text-rose-300 border-rose-500/40">
                    {studyableCount} kelime
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                Yarışma ve Çalışma modlarında bilemediğin kelimelerle hedeflenmiş pratik yap.
              </p>
              <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
                <span className="text-slate-400 text-[11px]">
                  🎯 Hedefli tekrar • Puan tutulmaz
                </span>
                <span className="text-slate-400 text-[11px] group-hover:text-white">
                  Başla ➔
                </span>
              </div>
            </button>
          ) : (
            <div
              className="w-full p-4 rounded-2xl bg-[var(--color-bg-card)] border border-white/5 opacity-80 text-left relative"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔁</span>
                  <span className="text-xl font-black text-slate-300">Hatalarımla Çalış</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSound('key_press')
                      triggerHaptic('tap')
                      setShowManagerModal(true)
                    }}
                    className="text-[11px] font-bold text-slate-300 hover:text-white underline underline-offset-2 min-h-[32px] flex items-center"
                  >
                    Listeyi düzenle
                  </button>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-500/20 text-slate-400 border border-slate-500/30">
                    {studyableCount === 0 ? '0 kelime' : 'Yükleniyor...'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-2">
                Yarışma ve Çalışma modlarında bilemediğin kelimelerle hedeflenmiş pratik yap.
              </p>
              <p className="text-[11px] text-amber-300/80 font-medium">
                {studyableCount === 0
                  ? 'Kayıtlı aktif hata yok (veya tümü gizlendi).'
                  : 'Önce Yarışma veya Çalışma modunda oyna'}
              </p>
            </div>
          )
        )}
      </div>

      {/* Bilgilendirme Notu */}
      <p className="text-center text-[11px] text-slate-500 mt-4 mb-2">
        Tahmin doğrulama tüm seviyelerde 23.717 TDK kelimesiyle geçerlidir.
      </p>

      {/* Hatalarım Düzenleme Ekranı Modal'ı */}
      {showManagerModal && (
        <MistakesManagerModal
          onClose={() => setShowManagerModal(false)}
          onDataChanged={refreshStudyableCount}
        />
      )}
    </div>
  )
}
