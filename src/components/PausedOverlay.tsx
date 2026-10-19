interface PausedOverlayProps {
  onResume: () => void
  onExit?: () => void
}

export default function PausedOverlay({ onResume, onExit }: PausedOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-sm rounded-3xl p-6 bg-slate-900/95 border border-white/10 shadow-2xl flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-400 flex items-center justify-center text-3xl mb-4 text-violet-400">
          ⏸️
        </div>

        <h2 className="text-2xl font-black text-white mb-2">
          Oyun Duraklatıldı
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Süreler ve oyun durumu donduruldu. Hazır olduğunda kaldığın yerden devam edebilirsin.
        </p>

        <button
          type="button"
          onClick={onResume}
          className="w-full py-4 px-6 rounded-2xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-black text-lg transition-all shadow-lg shadow-violet-600/40 border border-violet-400 mb-3"
        >
          Devam Et ▶
        </button>

        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="w-full py-3 px-6 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 font-bold text-sm transition-all border border-white/5"
          >
            Ana Menüye Dön
          </button>
        )}
      </div>
    </div>
  )
}
