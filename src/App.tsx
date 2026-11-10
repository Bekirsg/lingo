import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
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
  const [selectedMode, setSelectedMode] = useState<'yarisma' | 'calisma'>('yarisma')
  useVisualViewport()

  // v1 verilerini ilk açılışta güvenle taşı (SPEC-v2 Bölüm 5.1)
  useEffect(() => {
    migrateV1ToV2()
  }, [])

  const navigate = useCallback((s: AppScreen, mode?: 'yarisma' | 'calisma') => {
    if (mode) {
      setSelectedMode(mode)
    }
    setScreen(s)
  }, [])

  const handleLevelSelect = useCallback((level: GameLevel) => {
    setSelectedLevel(level)
    setScreen('game')
  }, [])

  switch (screen) {
    case 'splash':
      return <SplashScreen onReady={() => navigate('menu')} />
    case 'menu':
      return <MainMenu onNavigate={navigate} />
    case 'level_select':
      return (
        <LevelSelectScreen
          mode={selectedMode}
          onSelectLevel={handleLevelSelect}
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
          <AnalyticsScreen onBack={() => navigate('menu')} />
        </Suspense>
      )
    default:
      return <MainMenu onNavigate={navigate} />
  }
}
