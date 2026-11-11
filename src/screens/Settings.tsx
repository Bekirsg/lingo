import { useState } from 'react'
import {
  getSettings,
  setSettings,
  resetLevelRecords,
  devSimulateV1Record,
  devRerunMigration,
  type SettingsData,
} from '../data/storage'
import {
  resetAnalytics,
  saveAnalytics,
  generateSampleAnalyticsData,
  getSampleAnalyticsSizeKb,
} from '../analytics'
import { generateMistakesDevData } from '../game/mistakes/devMistakes'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

interface SettingsProps {
  onBack: () => void
}

export default function Settings({ onBack }: SettingsProps) {
  const [settings, setSettingsState] = useState<SettingsData>(getSettings)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [resetAnalyticsConfirm, setResetAnalyticsConfirm] = useState(false)
  const [analyticsResetDone, setAnalyticsResetDone] = useState(false)
  const [devMessage, setDevMessage] = useState<string | null>(null)

  const toggle = (key: 'sound' | 'haptics') => {
    const updated = setSettings({ [key]: !settings[key] })
    setSettingsState(updated)

    if (key === 'sound' && updated.sound) {
      playSound('key_press')
    } else if (key === 'haptics' && updated.haptics) {
      triggerHaptic('tap')
    }
  }

  const handleKeyboardChange = (mode: 'game' | 'system') => {
    if (settings.keyboard === mode) return
    const updated = setSettings({ keyboard: mode })
    setSettingsState(updated)
    playSound('key_press')
    triggerHaptic('tap')
  }

  const handleReset = () => {
    if (!resetConfirm) {
      setResetConfirm(true)
      return
    }
    resetLevelRecords()
    triggerHaptic('wrong')
    setResetConfirm(false)
    setResetDone(true)
    setTimeout(() => setResetDone(false), 3000)
  }

  const handleResetAnalytics = () => {
    if (!resetAnalyticsConfirm) {
      setResetAnalyticsConfirm(true)
      return
    }
    resetAnalytics()
    triggerHaptic('wrong')
    setResetAnalyticsConfirm(false)
    setAnalyticsResetDone(true)
    setTimeout(() => setAnalyticsResetDone(false), 3000)
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[var(--color-bg-primary)] px-5 py-6 select-none">
      {/* Üst bar */}
      <div className="flex items-center mb-8">
        <button
          onClick={() => {
            playSound('key_press')
            triggerHaptic('tap')
            onBack()
          }}
          className="text-[var(--color-accent)] text-2xl font-bold mr-3 active:scale-90 transition-transform"
          aria-label="Geri"
        >
          ←
        </button>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Ayarlar</h2>
      </div>

      {/* Ayar seçenekleri */}
      <div className="space-y-3">
        <ToggleRow
          label="🔊 Ses Efektleri"
          description="WebAudio sentezleyici sesler"
          value={settings.sound}
          onToggle={() => toggle('sound')}
        />
        <ToggleRow
          label="📳 Titreşim (Haptics)"
          description="Doğru, yanlış ve geri sayım titreşimleri"
          value={settings.haptics}
          onToggle={() => toggle('haptics')}
        />
      </div>

      {/* Klavye Tercihi */}
      <div className="mt-6">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5 px-1">
          ⌨️ Klavye Seçeneği
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleKeyboardChange('game')}
            className={`
              flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all duration-150 active:scale-95
              ${
                settings.keyboard === 'game'
                  ? 'bg-violet-600/30 border-violet-400 text-white shadow-lg shadow-violet-500/20 ring-1 ring-violet-400'
                  : 'bg-[var(--color-bg-card)] border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }
            `}
            aria-pressed={settings.keyboard === 'game'}
          >
            <span className="text-2xl mb-1">🎮</span>
            <span className="text-sm font-bold">Oyun Klavyesi</span>
            <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">Özel 29 harfli ekran klavyesi</span>
          </button>

          <button
            type="button"
            onClick={() => handleKeyboardChange('system')}
            className={`
              flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all duration-150 active:scale-95
              ${
                settings.keyboard === 'system'
                  ? 'bg-emerald-600/30 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400'
                  : 'bg-[var(--color-bg-card)] border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }
            `}
            aria-pressed={settings.keyboard === 'system'}
          >
            <span className="text-2xl mb-1">📱</span>
            <span className="text-sm font-bold">Telefon Klavyesi</span>
            <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">Cihaz klavyesi + eylem çubuğu</span>
          </button>
        </div>
      </div>

      {/* Skor ve İstatistik Sıfırlama */}
      <div className="mt-8">
        {resetDone && (
          <div className="mb-3 px-4 py-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-sm text-center font-bold animate-fade-in">
            ✓ 3 seviyedeki tüm rekorlar ve istatistikler sıfırlandı.
          </div>
        )}

        <button
          type="button"
          onClick={handleReset}
          className={`
            w-full py-4 px-6 rounded-2xl text-base font-bold
            transition-all duration-200 active:scale-95 shadow-md
            ${
              resetConfirm
                ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 animate-pulse'
                : 'bg-white/5 hover:bg-white/10 text-rose-300 border border-rose-500/30'
            }
          `}
        >
          {resetConfirm ? '⚠️  Emin misin? 3 Seviyeyi de Sıfırla!' : '🗑️  Rekorları Sıfırla'}
        </button>

        {resetConfirm && (
          <button
            type="button"
            onClick={() => setResetConfirm(false)}
            className="w-full mt-2 py-3 text-sm text-slate-400 hover:text-white"
          >
            Vazgeç
          </button>
        )}
      </div>

      {/* Analiz Verisini Sıfırlama */}
      <div className="mt-4">
        {analyticsResetDone && (
          <div className="mb-3 px-4 py-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-sm text-center font-bold animate-fade-in">
            ✓ Analiz verisi başarıyla sıfırlandı.
          </div>
        )}

        <button
          type="button"
          onClick={handleResetAnalytics}
          className={`
            w-full py-4 px-6 rounded-2xl text-base font-bold
            transition-all duration-200 active:scale-95 shadow-md
            ${
              resetAnalyticsConfirm
                ? 'bg-rose-700 hover:bg-rose-600 text-white border border-rose-400 animate-pulse'
                : 'bg-white/5 hover:bg-white/10 text-rose-300 border border-rose-500/30'
            }
          `}
        >
          {resetAnalyticsConfirm
            ? '⚠️ Tüm oyun ve çalışma analiz verileriniz silinecektir. Bu işlem geri alınamaz.'
            : '📊 Analiz Verisini Sıfırla'}
        </button>

        {resetAnalyticsConfirm && (
          <button
            type="button"
            onClick={() => setResetAnalyticsConfirm(false)}
            className="w-full mt-2 py-2 text-sm text-slate-400 hover:text-white"
          >
            Vazgeç
          </button>
        )}
      </div>

      {/* Geliştirici Test Araçları (Prod derlemesinde otomatik tree-shake edilir) */}
      {import.meta.env.DEV && (
        <div className="mt-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-2">
            🛠️ Geliştirici Araçları (DEV)
          </h3>
          {devMessage && (
            <div className="mb-2 p-2 rounded-lg bg-amber-500/20 text-amber-200 text-xs">
              {devMessage}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                const sample = generateSampleAnalyticsData()
                saveAnalytics(sample)
                playSound('key_press')
                setDevMessage(`Örnek analiz verisi üretildi (~${getSampleAnalyticsSizeKb(sample)} KB, 7 kova, 30 oyun, 40 oturum, 200 kaçırılan kelime).`)
                setTimeout(() => setDevMessage(null), 4000)
              }}
              className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold text-left border border-amber-500/30 transition-colors"
            >
              📊 Örnek analiz verisi üret (~30 oyun, 40 oturum, 200 kaçırılan)
            </button>
            <button
              type="button"
              onClick={() => {
                generateMistakesDevData()
                playSound('key_press')
                setDevMessage('Hatalarımla için 15 gerçek kelime eklendi (bazıları streak=1).')
                setTimeout(() => setDevMessage(null), 4000)
              }}
              className="py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold text-left border border-rose-500/30 transition-colors"
            >
              🎯 Hatalarımla için örnek veri (15 kelime)
            </button>
            <button
              type="button"
              onClick={() => {
                resetAnalytics()
                playSound('key_press')
                setDevMessage('Analiz verisi temizlendi.')
                setTimeout(() => setDevMessage(null), 3000)
              }}
              className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold text-left border border-amber-500/30 transition-colors"
            >
              🧹 Analiz verisini temizle
            </button>
            <button
              type="button"
              onClick={() => {
                devSimulateV1Record(12345)
                playSound('key_press')
                setDevMessage('v1 rekoru (12.345) localStorage içine yazıldı.')
                setTimeout(() => setDevMessage(null), 3000)
              }}
              className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold text-left border border-amber-500/30 transition-colors"
            >
              📥 v1 rekoru simüle et (12.345)
            </button>
            <button
              type="button"
              onClick={() => {
                const res = devRerunMigration()
                playSound('key_press')
                setDevMessage(`Taşıma çalıştırıldı (Sonuç: ${res ? 'taşındı' : 'veri yok/güncel'}).`)
                setTimeout(() => setDevMessage(null), 3000)
              }}
              className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold text-left border border-amber-500/30 transition-colors"
            >
              🔄 taşımayı yeniden çalıştır
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ToggleRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string
  description?: string
  value: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between bg-[var(--color-bg-card)] rounded-2xl px-5 py-4 border border-white/5">
      <div className="flex flex-col">
        <span className="text-base font-bold text-[var(--color-text-primary)]">{label}</span>
        {description && <span className="text-xs text-slate-400">{description}</span>}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`
          w-14 h-8 rounded-full transition-colors duration-200 relative
          ${value ? 'bg-emerald-500' : 'bg-slate-700'}
        `}
        aria-label={`${label} ${value ? 'açık' : 'kapalı'}`}
      >
        <div
          className={`
            w-6 h-6 bg-white rounded-full absolute top-1
            transition-transform duration-200 shadow-md
            ${value ? 'translate-x-7' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  )
}
