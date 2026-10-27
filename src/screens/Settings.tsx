import { useState } from 'react'
import { getSettings, setSettings, resetHighScore, type SettingsData } from '../data/storage'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

interface SettingsProps {
  onBack: () => void
}

export default function Settings({ onBack }: SettingsProps) {
  const [settings, setSettingsState] = useState<SettingsData>(getSettings)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  const toggle = (key: keyof SettingsData) => {
    const updated = setSettings({ [key]: !settings[key] })
    setSettingsState(updated)

    if (key === 'sound' && updated.sound) {
      playSound('key_press')
    } else if (key === 'haptics' && updated.haptics) {
      triggerHaptic('tap')
    }
  }

  const handleReset = () => {
    if (!resetConfirm) {
      setResetConfirm(true)
      return
    }
    resetHighScore()
    triggerHaptic('wrong')
    setResetConfirm(false)
    setResetDone(true)
    setTimeout(() => setResetDone(false), 3000)
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

      {/* Skor ve İstatistik Sıfırlama */}
      <div className="mt-8">
        {resetDone && (
          <div className="mb-3 px-4 py-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-sm text-center font-bold animate-fade-in">
            ✓ En yüksek skor ve istatistikler sıfırlandı.
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
          {resetConfirm ? '⚠️  Emin misin? Tümünü Sıfırla!' : '🗑️  En Yüksek Skoru Sıfırla'}
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
