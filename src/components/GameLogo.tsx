interface GameLogoProps {
  size?: 'normal' | 'large'
  showSubtitle?: boolean
  className?: string
}

export default function GameLogo({
  size = 'normal',
  showSubtitle = true,
  className = '',
}: GameLogoProps) {
  const isLarge = size === 'large'

  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* ─── 3D Kelime Taşları (Wordle / Scrabble / 3D Puzzle Tarzı) ─── */}
      <div className="relative mb-3 flex items-center justify-center gap-2 sm:gap-2.5">
        {/* Arka plan yumuşak ışık huzmesi */}
        <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-purple-500/20 blur-2xl rounded-full pointer-events-none" />

        {/* Taş 1: B (Yeşil / Doğru Tahmin Teması) */}
        <div className="relative group transform -rotate-3 hover:rotate-0 transition-transform duration-300">
          <div className="w-12 h-13 sm:w-14 sm:h-15 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 border-t border-emerald-200/60 border-b-4 border-emerald-800 shadow-xl shadow-emerald-950/60 flex items-center justify-center relative overflow-hidden">
            {/* Üst cam yansıması */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-xl pointer-events-none" />
            <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] font-mono">
              B
            </span>
            <span className="absolute bottom-1 right-1.5 text-[9px] font-bold text-emerald-200/80 font-mono">
              3
            </span>
          </div>
        </div>

        {/* Taş 2: S (Altın Sarısı / Farklı Konum Teması) */}
        <div className="relative group transform -translate-y-1 hover:translate-y-0 transition-transform duration-300">
          <div className="w-12 h-13 sm:w-14 sm:h-15 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 border-t border-amber-100/70 border-b-4 border-amber-800 shadow-xl shadow-amber-950/60 flex items-center justify-center relative overflow-hidden">
            {/* Üst cam yansıması */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-white/25 rounded-t-xl pointer-events-none" />
            <span className="text-2xl sm:text-3xl font-black text-slate-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)] font-mono">
              S
            </span>
            <span className="absolute bottom-1 right-1.5 text-[9px] font-bold text-amber-900/80 font-mono">
              2
            </span>
          </div>
        </div>

        {/* Taş 3: G (Mor / Lingo ve Gece Teması) */}
        <div className="relative group transform rotate-3 hover:rotate-0 transition-transform duration-300">
          <div className="w-12 h-13 sm:w-14 sm:h-15 rounded-2xl bg-gradient-to-b from-indigo-500 to-purple-600 border-t border-indigo-200/60 border-b-4 border-purple-900 shadow-xl shadow-purple-950/60 flex items-center justify-center relative overflow-hidden">
            {/* Üst cam yansıması */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-xl pointer-events-none" />
            <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] font-mono">
              G
            </span>
            <span className="absolute bottom-1 right-1.5 text-[9px] font-bold text-indigo-200/80 font-mono">
              4
            </span>
          </div>
        </div>
      </div>

      {/* ─── Ana Başlık: LİNGO ─── */}
      <div className="relative">
        <h1
          className={`
            font-black tracking-[0.2em] uppercase font-mono
            bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent
            drop-shadow-[0_4px_16px_rgba(139,92,246,0.35)]
            ${isLarge ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'}
          `}
        >
          LİNGO
        </h1>
      </div>

      {/* ─── Alt Başlık Rozeti ─── */}
      {showSubtitle && (
        <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 shadow-sm backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <p className="text-[11px] sm:text-xs font-bold text-slate-300 tracking-widest uppercase">
            Türkçe Kelime Oyunu
          </p>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      )}
    </div>
  )
}
