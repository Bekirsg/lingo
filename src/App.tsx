import { useState, useCallback, useEffect } from 'react'
import SplashScreen from './screens/SplashScreen'
import MainMenu, { type AppScreen } from './screens/MainMenu'
import LevelSelectScreen from './screens/LevelSelectScreen'
import HowToPlay from './screens/HowToPlay'
import Settings from './screens/Settings'
import GameScreen from './screens/GameScreen'
import { useVisualViewport } from './hooks/useVisualViewport'
import { migrateV1ToV2 } from './data/storage'
import type { GameLevel } from './data/levels'

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('splash')
  const [selectedLevel, setSelectedLevel] = useState<GameLevel>('zor')
  useVisualViewport()

  // v1 verilerini ilk açılışta güvenle taşı (SPEC-v2 Bölüm 5.1)
  useEffect(() => {
    migrateV1ToV2()
  }, [])

  const navigate = useCallback((s: AppScreen) => setScreen(s), [])

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
          onSelectLevel={handleLevelSelect}
          onBack={() => navigate('menu')}
        />
      )
    case 'game':
      return <GameScreen level={selectedLevel} onBackToMenu={() => navigate('menu')} />
    case 'howtoplay':
      return <HowToPlay onBack={() => navigate('menu')} />
    case 'settings':
      return <Settings onBack={() => navigate('menu')} />
    default:
      return <MainMenu onNavigate={navigate} />
  }
}
