import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

export type AppScreen =
  | 'splash'
  | 'menu'
  | 'level_select'
  | 'game'
  | 'howtoplay'
  | 'settings'
  | 'analytics'

interface MainMenuProps {
  onNavigate: (screen: AppScreen, mode?: 'yarisma' | 'calisma') => void
}

export default function MainMenu({ onNavigate }: MainMenuProps) {
  const menuItems = [
    { label: '🎮  Yarışma', screen: 'level_select' as AppScreen, mode: 'yarisma' as const, primary: true, disabled: false, badge: null },
    { label: '📚  Çalışma', screen: 'level_select' as AppScreen, mode: 'calisma' as const, primary: false, disabled: false, badge: null },
    { label: '📊  Analizler', screen: 'analytics' as AppScreen, mode: undefined, primary: false, disabled: false, badge: null },
    { label: '📖  Nasıl Oynanır', screen: 'howtoplay' as AppScreen, mode: undefined, primary: false, disabled: false, badge: null },
    { label: '⚙️  Ayarlar', screen: 'settings' as AppScreen, mode: undefined, primary: false, disabled: false, badge: null },
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-[var(--color-bg-primary)] px-6 select-none">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="relative inline-block">
          <div className="absolute -inset-6 bg-[var(--color-accent)] opacity-20 blur-3xl rounded-full" />
          <h1 className="relative text-5xl font-black tracking-widest text-[var(--color-text-primary)]">
            LİNGO
          </h1>
        </div>
        <p className="mt-2 text-xs text-[var(--color-text-muted)] tracking-widest uppercase">
          Türkçe Kelime Oyunu
        </p>
      </div>

      {/* Menü butonları */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        {menuItems.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled) {
                playSound('key_press')
                triggerHaptic('tap')
                onNavigate(item.screen, item.mode)
              }
            }}
            className={`
              w-full py-3.5 px-6 rounded-2xl text-base font-bold
              transition-all duration-200 relative flex items-center justify-between
              ${
                item.primary
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 border border-violet-400/50 hover:brightness-110 active:scale-95'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] border border-white/10 backdrop-blur-sm hover:border-[var(--color-accent)]/40 active:scale-95'
              }
              ${item.disabled ? 'opacity-40 cursor-not-allowed hover:border-white/10 active:scale-100' : ''}
            `}
          >
            <span>{item.label}</span>
            {item.badge && (
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alt bilgi */}
      <p className="mt-10 text-xs text-[var(--color-text-muted)] font-mono">
        v2.0.0-dev
      </p>
    </div>
  )
}
