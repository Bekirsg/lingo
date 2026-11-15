import { useEffect, useState } from 'react'
import GameLogo from '../components/GameLogo'

interface SplashScreenProps {
  onReady: () => void
}

export default function SplashScreen({ onReady }: SplashScreenProps) {
  const [fadeIn, setFadeIn] = useState(false)

  useEffect(() => {
    // Fade-in animasyonu başlat
    const t1 = setTimeout(() => setFadeIn(true), 100)
    // 2 saniye sonra ana menüye geç
    const t2 = setTimeout(() => onReady(), 2000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onReady])

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-[var(--color-bg-primary)] px-6">
      <div
        className={`transition-all duration-700 ease-out flex flex-col items-center ${
          fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {/* 3D Modern Logo */}
        <GameLogo size="large" />

        {/* Yükleniyor göstergesi */}
        <div className="mt-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  )
}
