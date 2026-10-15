import { useState, useCallback } from 'react'
import SplashScreen from './screens/SplashScreen'
import MainMenu from './screens/MainMenu'
import HowToPlay from './screens/HowToPlay'
import HighScore from './screens/HighScore'
import Settings from './screens/Settings'

/** Uygulama kök ekran durumları */
type Screen = 'splash' | 'menu' | 'howtoplay' | 'highscore' | 'settings'

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')

  const navigate = useCallback((s: Screen) => setScreen(s), [])

  switch (screen) {
    case 'splash':
      return <SplashScreen onReady={() => navigate('menu')} />
    case 'menu':
      return <MainMenu onNavigate={navigate} />
    case 'howtoplay':
      return <HowToPlay onBack={() => navigate('menu')} />
    case 'highscore':
      return <HighScore onBack={() => navigate('menu')} />
    case 'settings':
      return <Settings onBack={() => navigate('menu')} />
    default:
      return <MainMenu onNavigate={navigate} />
  }
}
