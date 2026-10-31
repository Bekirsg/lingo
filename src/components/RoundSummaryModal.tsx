/**
 * RoundSummaryModal — Tur Özet Ekranı (1–3. Tur Sonu, Bonus Sonrası)
 *
 * SPEC 4.7 & M7:
 * - Tam ekran
 * - "N. TUR BİTTİ"
 * - Kaç kelime bilindi (x/5)
 * - Kelime puanı
 * - Bonus puanı
 * - Tur kazancı
 * - Toplam kasa (sayılar yukarı sayma animasyonuyla)
 * - "Devam Et" (3. turdan sonra 4. tur giriş ekranına geçer)
 */

import { useEffect, useState } from 'react'
import { formatPoints } from './Hud'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

interface RoundSummaryModalProps {
  round: number
  wordsWon: number
  wordPoints: number
  bonusPoints: number
  roundPoints: number
  treasury: number
  onContinue: () => void
}

export default function RoundSummaryModal({
  round,
  wordsWon,
  wordPoints,
  bonusPoints,
  roundPoints,
  treasury,
  onContinue,
}: RoundSummaryModalProps) {
  // Toplam kasa yukarı sayma animasyonu
  const [animatedTreasury, setAnimatedTreasury] = useState(0)

  useEffect(() => {
    playSound('stage_cleared')
    triggerHaptic('correct')

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      setAnimatedTreasury(treasury)
      return
    }

    // 0'dan treasury değerine akıcı sayma animasyonu
    const duration = 800
    const startVal = Math.max(0, treasury - roundPoints)
    const targetVal = treasury
    const startTime = performance.now()

    let frameId: number
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(1, elapsed / duration)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startVal + (targetVal - startVal) * ease)
      setAnimatedTreasury(current)

      if (progress < 1) {
        frameId = requestAnimationFrame(animate)
      }
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [treasury, roundPoints])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between items-center bg-gradient-to-b from-[#0f0a2e] via-[#150d3d] to-[#0a0620] px-6 py-8 select-none animate-fade-in">
      {/* Üst Kısım / Rozet */}
      <div className="w-full flex flex-col items-center text-center mt-4">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-3 text-4xl bg-emerald-500/20 border border-emerald-400 shadow-xl shadow-emerald-500/30 animate-bounce">
          🏆
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-1">
          {round}. ETAP TAMAMLANDI
        </span>
        <h1 className="text-3xl font-black text-white tracking-wide">
          {round}. TUR BİTTİ
        </h1>
      </div>

      {/* İstatistik & Puan Detayları Kartı */}
      <div className="w-full max-w-sm bg-white/5 rounded-3xl p-5 border border-white/10 shadow-2xl backdrop-blur-md space-y-3 my-auto">
        {/* Bilinen Kelime Sayısı */}
        <div className="flex items-center justify-between py-2 border-b border-white/10 text-sm">
          <span className="text-slate-300 font-medium flex items-center gap-2">
            <span>📝</span>
            <span>Bilinen Kelime:</span>
          </span>
          <span className="font-mono font-black text-white text-base">
            {wordsWon} / 5
          </span>
        </div>

        {/* Kelime Kazancı */}
        <div className="flex items-center justify-between py-2 border-b border-white/10 text-sm">
          <span className="text-slate-300 font-medium flex items-center gap-2">
            <span>🎯</span>
            <span>Kelime Puanı:</span>
          </span>
          <span className="font-mono font-black text-white text-base">
            +{formatPoints(wordPoints)}
          </span>
        </div>

        {/* Bonus Kazancı */}
        <div className="flex items-center justify-between py-2 border-b border-white/10 text-sm">
          <span className="text-slate-300 font-medium flex items-center gap-2">
            <span>⭐</span>
            <span>Bonus Soru Puanı:</span>
          </span>
          <span className={`font-mono font-black text-base ${bonusPoints > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
            {bonusPoints > 0 ? `+${formatPoints(bonusPoints)}` : '0'}
          </span>
        </div>

        {/* Bu Turun Toplam Kazancı */}
        <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-sm">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-300">
            Tur Kazancı:
          </span>
          <span className="font-mono font-black text-emerald-400 text-lg">
            +{formatPoints(roundPoints)}
          </span>
        </div>

        {/* Toplam Kasa (Canlı Sayma Animasyonlu) */}
        <div className="pt-2 flex flex-col items-center text-center">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">
            TOPLAM KASA
          </span>
          <span className="font-mono font-black text-4xl text-emerald-400 tracking-tight tabular-nums">
            {formatPoints(animatedTreasury)}
          </span>
        </div>
      </div>

      {/* Devam Et Butonu */}
      <div className="w-full max-w-sm mb-4">
        <button
          type="button"
          onClick={() => {
            playSound('key_press')
            triggerHaptic('tap')
            onContinue()
          }}
          className="
            w-full py-4 px-6 rounded-2xl text-lg font-black tracking-wide
            text-white transition-all duration-200 active:scale-95 shadow-xl
            bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/40 border border-emerald-400
          "
        >
          {round < 3 ? `${round + 1}. Tura Geç ➔` : '4. TUR — Büyük Final ➔'}
        </button>
      </div>
    </div>
  )
}
