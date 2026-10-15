import { getHighScore } from '../data/storage'

interface HighScoreProps {
  onBack: () => void
}

export default function HighScore({ onBack }: HighScoreProps) {
  const highScore = getHighScore()

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-[var(--color-bg-primary)] px-6">
      {/* Üst bar */}
      <div className="absolute top-6 left-5 flex items-center">
        <button
          onClick={onBack}
          className="text-[var(--color-accent)] text-2xl font-bold active:scale-90 transition-transform"
          aria-label="Geri"
        >
          ←
        </button>
      </div>

      {/* İçerik */}
      <div className="text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
          En Yüksek Skor
        </h2>
        <div className="mt-6 bg-[var(--color-bg-card)] rounded-2xl px-10 py-8 border border-white/5">
          <p className="text-5xl font-black text-[var(--color-accent)]">
            {highScore.toLocaleString('tr-TR')}
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">puan</p>
        </div>
        {highScore === 0 && (
          <p className="mt-6 text-sm text-[var(--color-text-muted)]">
            Henüz oyun oynamadın. Hadi başla!
          </p>
        )}
      </div>
    </div>
  )
}
