/**
 * LİNGO v2 — Yarışma Seviye Seçimi Ekranı
 * SPEC-v2 Bölüm 3.2, 4.6, 5 & V2-M4
 */

import { useState } from 'react'
import type { GameLevel } from '../data/levels'
import { getLevelRecords } from '../data/storage'
import { loadWordRepository, ensureLevelsLoaded, ensureBonusLevelLoaded } from '../data/wordsLoader'
import { formatPoints } from '../components/Hud'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

interface LevelSelectScreenProps {
  onSelectLevel: (level: GameLevel) => void
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

export default function LevelSelectScreen({ onSelectLevel, onBack }: LevelSelectScreenProps) {
  const [loadingLevel, setLoadingLevel] = useState<GameLevel | null>(null)
  const records = getLevelRecords()

  const handleSelect = async (level: GameLevel) => {
    if (loadingLevel) return

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
    } catch (err) {
      console.warn('[LİNGO v2] Seviye dosyaları yüklenemedi, Zor havuzuna düşülüyor:', err)
    } finally {
      onSelectLevel(level)
    }
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
            Yarışma • Seviye Seçimi
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Oynamak istediğin kelime zorluğunu seç
          </p>
        </div>
      </div>

      {/* Seviye Kartları */}
      <div className="flex-1 flex flex-col justify-center gap-4 max-w-sm mx-auto w-full">
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

              {/* Alt Bilgi: Rekor ve Durum */}
              <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span>🏆 En Yüksek:</span>
                  <span className={`font-mono font-bold ${card.accentColor}`}>
                    {recordScore > 0 ? formatPoints(recordScore) : '—'}
                  </span>
                </div>

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
      </div>

      {/* Bilgilendirme Notu */}
      <p className="text-center text-[11px] text-slate-500 mt-4 mb-2">
        Tahmin doğrulama tüm seviyelerde 23.717 TDK kelimesiyle geçerlidir.
      </p>
    </div>
  )
}
