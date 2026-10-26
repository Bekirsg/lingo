/**
 * Round4IntroScreen — 4. Tur (Büyük Final) giriş ekranı
 *
 * SPEC 4.7/4.8: kuralları kısaca anlatır (120 sn tek sayaç,
 * kazanç kasanın YERİNE geçer, hiç etap bitmezse 0 puan riski),
 * "Başla" butonu ile 3-2-1 sonra tur başlar.
 */

import { formatPoints } from './Hud'

interface Round4IntroScreenProps {
  treasury: number
  onStart: () => void
}

export default function Round4IntroScreen({ treasury, onStart }: Round4IntroScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="max-w-sm w-full p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 shadow-2xl shadow-amber-500/10 text-center flex flex-col items-center animate-scale-up">
        {/* Rozet */}
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 text-4xl bg-amber-500/20 border-2 border-amber-400 shadow-lg shadow-amber-500/30">
          🔥
        </div>

        <h2 className="text-2xl font-black text-white mb-1">
          4. TUR — BÜYÜK FİNAL
        </h2>

        <p className="text-sm text-slate-300 mb-4">
          Kasan: <span className="font-mono font-black text-emerald-400">{formatPoints(treasury)}</span>
        </p>

        {/* Kurallar */}
        <div className="w-full bg-white/5 rounded-2xl border border-white/10 px-4 py-3 mb-5 text-left space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-black text-sm mt-0.5">⏱</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-white">120 saniye</span> tek sayaç, tüm etaplarda akar. Tahmin başına süre yok.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-black text-sm mt-0.5">📈</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Etaplar: <span className="font-bold text-white">4→5→6→7 harfli</span>. Her bilinirse kazanç artar. 7 harfli bilirsen <span className="font-bold text-emerald-400">250.000 + 2K</span>!
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-400 font-black text-sm mt-0.5">⚠️</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Kazanç kasanın <span className="font-bold text-white">yerine geçer</span>. Hiçbir etap bitmezse <span className="font-bold text-red-400">0 puan</span>!
            </p>
          </div>
        </div>

        {/* Kazanç Tablosu */}
        <div className="w-full bg-white/5 rounded-xl border border-white/10 px-3 py-2 mb-5 text-[10px]">
          <div className="grid grid-cols-2 gap-y-1 text-slate-400">
            <span>Hiçbiri</span><span className="text-right font-mono text-red-400">0</span>
            <span>4 harfli</span><span className="text-right font-mono text-slate-300">{formatPoints(Math.floor(treasury / 2))}</span>
            <span>5 harfli</span><span className="text-right font-mono text-slate-300">{formatPoints(treasury)}</span>
            <span>6 harfli</span><span className="text-right font-mono text-emerald-400">{formatPoints(treasury * 2)}</span>
            <span>7 harfli</span><span className="text-right font-mono text-emerald-400 font-bold">{formatPoints(250_000 + treasury * 2)}</span>
          </div>
        </div>

        {/* Başla Butonu */}
        <button
          type="button"
          onClick={onStart}
          className="
            w-full py-4 px-6 rounded-2xl text-xl font-black tracking-wider
            text-white transition-all duration-200 active:scale-95 shadow-lg
            bg-gradient-to-r from-amber-500 to-orange-600
            hover:from-amber-400 hover:to-orange-500
            shadow-amber-600/40 border border-amber-400
          "
        >
          🔥 BAŞLA
        </button>
      </div>
    </div>
  )
}
