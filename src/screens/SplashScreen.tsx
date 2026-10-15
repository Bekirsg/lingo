import { useEffect, useState } from 'react'

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
    <div className="flex flex-col items-center justify-center min-h-dvh bg-[var(--color-bg-primary)]">
      <div
        className={`transition-all duration-700 ease-out ${
          fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {/* Logo */}
        <div className="relative">
          <div className="absolute -inset-8 bg-[var(--color-accent)] opacity-20 blur-3xl rounded-full" />
          <h1 className="relative text-5xl font-black tracking-tight text-[var(--color-text-primary)] text-center">
            BEKİR
            <span className="text-[var(--color-accent)]">-</span>
            EREN
          </h1>
        </div>

        {/* Alt başlık */}
        <p className="mt-4 text-sm text-[var(--color-text-secondary)] text-center tracking-widest uppercase">
          Türkçe Kelime Oyunu
        </p>

        {/* Yükleniyor göstergesi */}
        <div className="mt-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  )
}
