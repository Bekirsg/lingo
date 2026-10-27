import { getHighScore, getStats } from '../data/storage'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

interface HighScoreProps {
  onBack: () => void
}

export default function HighScore({ onBack }: HighScoreProps) {
  const highScore = getHighScore()
  const stats = getStats()

  return (
    <div className="flex flex-col items-center justify-between min-h-dvh bg-[var(--color-bg-primary)] px-6 py-8 select-none">
      {/* Üst bar */}
      <div className="w-full flex items-center justify-between mb-4">
        <button
          onClick={() => {
            playSound('key_press')
            triggerHaptic('tap')
            onBack()
          }}
          className="text-[var(--color-accent)] text-2xl font-bold active:scale-90 transition-transform p-2 -ml-2"
          aria-label="Geri"
        >
          ←
        </button>
        <h2 className="text-xl font-bold text-white">İstatistikler</h2>
        <div className="w-8" />
      </div>

      {/* İçerik */}
      <div className="w-full max-w-sm flex flex-col items-center text-center my-auto">
        <div className="text-6xl mb-3 animate-bounce">🏆</div>
        <h1 className="text-lg font-bold text-slate-400 mb-2 uppercase tracking-widest">
          En Yüksek Skor
        </h1>

        {/* Skor Kartı */}
        <div className="w-full bg-[var(--color-bg-card)] rounded-3xl px-6 py-6 border border-white/10 shadow-2xl backdrop-blur-md mb-6">
          <p className="text-5xl font-black text-amber-400 font-mono tracking-tight tabular-nums">
            {highScore.toLocaleString('tr-TR')}
          </p>
          <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-wider">puan</p>
        </div>

        {/* İstatistikler */}
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
            <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <span>🎮</span>
              <span>Oynanan Oyun</span>
            </span>
            <span className="font-mono font-black text-white text-lg">
              {stats.gamesPlayed}
            </span>
          </div>

          <div className="flex items-center justify-between bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
            <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <span>⭐</span>
              <span>En İyi Etap</span>
            </span>
            <span className="font-bold text-emerald-400 text-sm">
              {stats.bestStage}
            </span>
          </div>
        </div>

        {stats.gamesPlayed === 0 && (
          <p className="mt-8 text-sm text-slate-400 font-medium">
            Henüz tamamlanan oyun yok. Hadi başla ve rekor kır!
          </p>
        )}
      </div>

      {/* Alt boşluk */}
      <div className="w-full" />
    </div>
  )
}
