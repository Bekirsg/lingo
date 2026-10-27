import { useEffect, useState } from 'react'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

interface CountdownOverlayProps {
  initialSeconds?: number
  onComplete: () => void
  label?: string
}

export default function CountdownOverlay({
  initialSeconds = 3,
  onComplete,
  label = 'Hazır Ol!',
}: CountdownOverlayProps) {
  const [count, setCount] = useState(initialSeconds)

  useEffect(() => {
    if (count > 0) {
      playSound('countdown_tick')
      triggerHaptic('countdown')
    } else {
      playSound('countdown_go')
      onComplete()
      return
    }

    const timer = setTimeout(() => {
      setCount((prev) => prev - 1)
    }, 900)

    return () => clearTimeout(timer)
  }, [count, onComplete])

  if (count <= 0) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md select-none animate-fade-in">
      <span className="text-sm font-bold uppercase tracking-widest text-violet-300 mb-4 animate-pulse">
        {label}
      </span>
      <div
        key={count}
        className="w-28 h-28 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 border-2 border-violet-400 flex items-center justify-center text-6xl font-black text-white shadow-2xl shadow-violet-500/50 transform animate-scale-bounce"
      >
        {count}
      </div>
    </div>
  )
}
