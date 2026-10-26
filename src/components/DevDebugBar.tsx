import { useState } from 'react'
import { turkishUpper } from '../utils/turkish'

interface DevDebugBarProps {
  currentWord?: string
}

export default function DevDebugBar({ currentWord }: DevDebugBarProps) {
  // Sadece geliştirme ortamında derlenir / render edilir
  if (!import.meta.env.DEV || !currentWord) return null

  const [visible, setVisible] = useState(false)

  return (
    <aside
      aria-label="Geliştirici Hata Ayıklama Paneli"
      className="fixed bottom-1 left-2 z-40 flex items-center gap-2 bg-black/80 px-2 py-1 rounded-lg border border-amber-500/40 text-[11px] font-mono select-none"
    >
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="text-amber-400 hover:text-amber-300 font-bold"
      >
        {visible ? '👁️ Gizle' : '🔍 Cevabı Gör'}
      </button>
      {visible && (
        <span className="text-white font-black tracking-wider bg-amber-950 px-1.5 py-0.5 rounded border border-amber-500/50">
          {turkishUpper(currentWord)}
        </span>
      )}
    </aside>
  )
}
