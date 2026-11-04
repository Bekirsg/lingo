import { useState, useEffect, useCallback } from 'react'
import { getSettings, setSettings, type KeyboardMode } from '../data/storage'

export interface InputModeState {
  mode: KeyboardMode
  isGameMode: boolean
  isSystemMode: boolean
  setKeyboardMode: (mode: KeyboardMode) => void
}

/**
 * Aktif klavye girdi modunu ('game' | 'system') dinler ve yönetir.
 * Ayarlar ekranında yapılan değişiklikleri anında senkronize eder.
 */
export function useInputMode(): InputModeState {
  const [mode, setMode] = useState<KeyboardMode>(() => getSettings().keyboard)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ keyboard?: KeyboardMode }>
      if (customEvent.detail?.keyboard) {
        setMode(customEvent.detail.keyboard)
      } else {
        setMode(getSettings().keyboard)
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'be:settings') {
        setMode(getSettings().keyboard)
      }
    }

    window.addEventListener('be:settings_changed', handleSettingsChanged)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('be:settings_changed', handleSettingsChanged)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const setKeyboardMode = useCallback((newMode: KeyboardMode) => {
    setSettings({ keyboard: newMode })
    setMode(newMode)
  }, [])

  return {
    mode,
    isGameMode: mode === 'game',
    isSystemMode: mode === 'system',
    setKeyboardMode,
  }
}
