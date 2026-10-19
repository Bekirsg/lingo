import { useEffect, useState } from 'react'
import type { Clock } from '../game/clock'

interface TimerDisplayProps {
  clock: Clock
  className?: string
}

/**
 * Bağımsız çalışan süre bileşeni.
 * Sadece bu bileşen 100ms'de bir yeniden çizilir; tüm sayfa re-render olmaz!
 * SPEC 6.2: Köşede büyük, canlı geri sayım (son 3 saniyede kırmızı/pulse)
 */
export default function TimerDisplay({ clock, className = '' }: TimerDisplayProps) {
  const [seconds, setSeconds] = useState(() => Math.ceil(clock.getRemainingSeconds()))

  useEffect(() => {
    // 50ms aralıkla saatin kalan süresini kontrol et
    const interval = setInterval(() => {
      const remaining = Math.ceil(clock.getRemainingSeconds())
      setSeconds(prev => (prev !== remaining ? remaining : prev))
    }, 50)

    return () => clearInterval(interval)
  }, [clock])

  const isLow = seconds <= 3 && seconds > 0
  const isZero = seconds === 0

  return (
    <div
      className={`flex items-center justify-center font-mono font-black tabular-nums transition-colors duration-200 ${
        isZero
          ? 'text-red-500 scale-95'
          : isLow
            ? 'text-red-400 animate-pulse scale-105'
            : 'text-amber-400'
      } ${className}`}
      aria-label={`Kalan süre: ${seconds} saniye`}
    >
      <span className="text-2xl leading-none">{seconds}</span>
      <span className="text-xs ml-0.5 opacity-70 font-sans">sn</span>
    </div>
  )
}
