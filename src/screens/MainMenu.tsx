interface MainMenuProps {
  onNavigate: (screen: 'menu' | 'howtoplay' | 'highscore' | 'settings') => void
}

export default function MainMenu({ onNavigate }: MainMenuProps) {
  const menuItems = [
    { label: '🎮  Oyna', screen: 'menu' as const, primary: true, disabled: true },
    { label: '📖  Nasıl Oynanır', screen: 'howtoplay' as const, primary: false, disabled: false },
    { label: '🏆  En Yüksek Skor', screen: 'highscore' as const, primary: false, disabled: false },
    { label: '⚙️  Ayarlar', screen: 'settings' as const, primary: false, disabled: false },
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-[var(--color-bg-primary)] px-6">
      {/* Logo */}
      <div className="mb-12">
        <div className="relative">
          <div className="absolute -inset-6 bg-[var(--color-accent)] opacity-15 blur-3xl rounded-full" />
          <h1 className="relative text-5xl font-black tracking-tight text-[var(--color-text-primary)] text-center">
            BEKİR
            <span className="text-[var(--color-accent)]">-</span>
            EREN
          </h1>
        </div>
        <p className="mt-2 text-xs text-[var(--color-text-muted)] text-center tracking-widest uppercase">
          Türkçe Kelime Oyunu
        </p>
      </div>

      {/* Menü butonları */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        {menuItems.map((item) => (
          <button
            key={item.label}
            disabled={item.disabled}
            onClick={() => !item.disabled && onNavigate(item.screen)}
            className={`
              w-full py-4 px-6 rounded-2xl text-lg font-bold
              transition-all duration-200 active:scale-95
              ${
                item.primary
                  ? 'bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent-glow)] opacity-50 cursor-not-allowed'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] border border-white/10 backdrop-blur-sm hover:border-[var(--color-accent)]/40'
              }
              ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {item.label}
            {item.disabled && (
              <span className="block text-xs font-normal mt-1 opacity-70">
                Yakında...
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alt bilgi */}
      <p className="mt-12 text-xs text-[var(--color-text-muted)]">
        v0.1.0 — M0 İskelet
      </p>
    </div>
  )
}
