import { useState, useEffect } from 'react'
import { resetHighScore } from '../data/storage'

const SETTINGS_KEY = 'be:settings'

interface SettingsData {
  sound: boolean
  haptics: boolean
}

function loadSettings(): SettingsData {
  try {
    const val = localStorage.getItem(SETTINGS_KEY)
    if (val) return JSON.parse(val)
  } catch {
    // geçersiz veri
  }
  return { sound: true, haptics: true }
}

function saveSettings(s: SettingsData): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    // sessizce geç
  }
}

interface SettingsProps {
  onBack: () => void
}

export default function Settings({ onBack }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsData>(loadSettings)
  const [resetConfirm, setResetConfirm] = useState(false)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const toggle = (key: keyof SettingsData) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleReset = () => {
    if (!resetConfirm) {
      setResetConfirm(true)
      return
    }
    resetHighScore()
    setResetConfirm(false)
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[var(--color-bg-primary)] px-5 py-6">
      {/* Üst bar */}
      <div className="flex items-center mb-8">
        <button
          onClick={onBack}
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
          value={settings.sound}
          onToggle={() => toggle('sound')}
        />
        <ToggleRow
          label="📳 Titreşim"
          value={settings.haptics}
          onToggle={() => toggle('haptics')}
        />
      </div>

      {/* Skor sıfırlama */}
      <div className="mt-8">
        <button
          onClick={handleReset}
          className={`
            w-full py-4 px-6 rounded-2xl text-base font-bold
            transition-all duration-200 active:scale-95
            ${
              resetConfirm
                ? 'bg-[var(--color-absent)] text-white'
                : 'bg-[var(--color-bg-card)] text-[var(--color-absent)] border border-[var(--color-absent)]/30'
            }
          `}
        >
          {resetConfirm ? '⚠️  Emin misin? Sıfırla!' : '🗑️  En Yüksek Skoru Sıfırla'}
        </button>
        {resetConfirm && (
          <button
            onClick={() => setResetConfirm(false)}
            className="w-full mt-2 py-3 text-sm text-[var(--color-text-muted)]"
          >
            İptal
          </button>
        )}
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string
  value: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between bg-[var(--color-bg-card)] rounded-2xl px-5 py-4 border border-white/5">
      <span className="text-base text-[var(--color-text-primary)]">{label}</span>
      <button
        onClick={onToggle}
        className={`
          w-14 h-8 rounded-full transition-colors duration-200 relative
          ${value ? 'bg-[var(--color-accent)]' : 'bg-gray-600'}
        `}
        aria-label={`${label} ${value ? 'açık' : 'kapalı'}`}
      >
        <div
          className={`
            w-6 h-6 bg-white rounded-full absolute top-1
            transition-transform duration-200
            ${value ? 'translate-x-7' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  )
}
