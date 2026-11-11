import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import SplashScreen from './screens/SplashScreen'
import MainMenu, { type AppScreen } from './screens/MainMenu'
import LevelSelectScreen from './screens/LevelSelectScreen'
import HowToPlay from './screens/HowToPlay'
import Settings from './screens/Settings'
import GameScreen from './screens/GameScreen'
import { useVisualViewport } from './hooks/useVisualViewport'
import { migrateV1ToV2 } from './data/storage'
import type { GameLevel } from './data/levels'

const AnalyticsScreen = lazy(() => import('./screens/AnalyticsScreen'))

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('splash')
  const [selectedLevel, setSelectedLevel] = useState<GameLevel>('zor')
  const [selectedMode, setSelectedMode] = useState<'yarisma' | 'calisma' | 'hatalar'>('yarisma')
  useVisualViewport()

  // SW güncelleme bildirimi (autoUpdate + kullanıcı yenile prompt)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  // v1 verilerini ilk açılışta güvenle taşı (SPEC-v2 Bölüm 5.1)
  useEffect(() => {
    migrateV1ToV2()
  }, [])

  const navigate = useCallback((s: AppScreen, mode?: 'yarisma' | 'calisma' | 'hatalar') => {
    if (mode) {
      setSelectedMode(mode)
    }
    setScreen(s)
  }, [])

  const handleLevelSelect = useCallback((level: GameLevel) => {
    setSelectedLevel(level)
    setScreen('game')
  }, [])

  const handleStartMistakes = useCallback(() => {
    setSelectedMode('hatalar')
    setSelectedLevel('zor')
    setScreen('game')
  }, [])

  // Mevcut ekranı seç
  function renderScreen() {
    switch (screen) {
      case 'splash':
        return <SplashScreen onReady={() => navigate('menu')} />
      case 'menu':
        return <MainMenu onNavigate={navigate} />
      case 'level_select':
        return (
          <LevelSelectScreen
            mode={selectedMode === 'hatalar' ? 'calisma' : selectedMode}
            onSelectLevel={handleLevelSelect}
            onSelectMistakes={handleStartMistakes}
            onBack={() => navigate('menu')}
          />
        )
      case 'game':
        return (
          <GameScreen
            level={selectedLevel}
            mode={selectedMode}
            onBackToMenu={() => navigate('menu')}
          />
        )
      case 'howtoplay':
        return <HowToPlay onBack={() => navigate('menu')} />
      case 'settings':
        return <Settings onBack={() => navigate('menu')} />
      case 'analytics':
        return (
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-dvh bg-[var(--color-bg-primary)] text-slate-400 text-sm">
                Analizler yükleniyor...
              </div>
            }
          >
            <AnalyticsScreen
              onBack={() => navigate('menu')}
              onStartMistakes={handleStartMistakes}
            />
          </Suspense>
        )
      default:
        return <MainMenu onNavigate={navigate} />
    }
  }

  return (
    <>
      {renderScreen()}
      {/* PWA güncelleme bildirimi — yeni sürüm hazır olunca gösterilir */}
      {needRefresh && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[var(--color-bg-card)] border border-white/10 shadow-xl rounded-2xl px-4 py-3 text-sm max-w-xs w-[calc(100%-2rem)]">
          <span className="text-[var(--color-text-primary)] flex-1">
            🔄 Yeni sürüm hazır!
          </span>
          <button
            onClick={() => updateServiceWorker(true)}
            className="bg-[var(--color-accent)] text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform whitespace-nowrap"
          >
            Güncelle
          </button>
        </div>
      )}
    </>
  )
}
