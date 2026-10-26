/**
 * BonusScreen — Bonus soru ekranı (okuma + yazma fazları)
 *
 * SPEC 4.6: Üstte canlı kalan süre ve canlı anlık puan; ortada tanım
 * (bonus boyunca ekranda kalır); altında 8 kutu; kutuların altında
 * büyük "BİL" butonu. İlk kutuda ilk harf yeşil ve kilitli.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import type { GameState } from '../game/state'
import { GameController } from '../game/state'
import type { Clock } from '../game/clock'
import { normalize } from '../game/engine'
import BonusBoardRow from '../components/BonusBoardRow'
import Keyboard from '../components/Keyboard'
import { turkishUpper } from '../utils/turkish'
import { formatPoints } from '../components/Hud'

interface BonusScreenProps {
  state: GameState
  controller: GameController
  clock: Clock
}

export default function BonusScreen({ state, controller, clock }: BonusScreenProps) {
  const bs = state.bonusState
  if (!bs) return null

  const isReading = state.screen === 'bonus_reading'
  const isWriting = state.screen === 'bonus_writing'
  const isResult = state.screen === 'bonus_result'

  // ─── Canlı Süre ve Puan Göstergesi (50ms tick ile sadece kendini render eder) ───
  const [liveRemaining, setLiveRemaining] = useState(() => Math.ceil(clock.getRemainingSeconds()))
  const [liveScore, setLiveScore] = useState(bs.currentScore)
  const controllerRef = useRef(controller)
  controllerRef.current = controller

  useEffect(() => {
    if (!isReading && !isWriting) return

    const interval = setInterval(() => {
      const remaining = Math.ceil(clock.getRemainingSeconds())
      setLiveRemaining(prev => prev !== remaining ? remaining : prev)

      if (isReading && !bs.bilPressed) {
        // Okuma + harf açılma fazında controller'a zamanı bildir
        const elapsed = clock.getElapsedSeconds()
        controllerRef.current.updateBonusTime(elapsed)
        setLiveScore(bs.currentScore)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [clock, isReading, isWriting, bs])

  // Yazma fazında puan donmuş olur
  const displayScore = isWriting || isResult ? bs.frozenScore : liveScore
  const displayRemaining = isResult ? 0 : liveRemaining

  // ─── Klavye İşleyicileri (Yazma Fazı) ─────────────────────────

  const handleChar = useCallback((char: string) => {
    if (!isWriting) return
    controller.typeBonusLetter(char)
  }, [controller, isWriting])

  const handleDelete = useCallback(() => {
    if (!isWriting) return
    controller.deleteBonusLetter()
  }, [controller, isWriting])

  const handleSubmit = useCallback(() => {
    // Bonus'ta manuel gönder yok, kutular dolunca otomatik
  }, [])

  // ─── Fiziksel Klavye Desteği (Yazma Fazı) ─────────────────────
  useEffect(() => {
    if (!isWriting) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Backspace') {
        e.preventDefault()
        controller.deleteBonusLetter()
      } else if (e.key.length === 1) {
        const norm = normalize(e.key)
        if (/^[a-zçğıöşü]$/.test(norm)) {
          e.preventDefault()
          controller.typeBonusLetter(e.key)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [controller, isWriting])

  // ─── Sonuç Ekranı ─────────────────────────────────────────────
  if (isResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <div
          className={`
            w-full max-w-sm rounded-3xl p-6 flex flex-col items-center text-center
            border shadow-2xl animate-scale-up
            ${bs.won
              ? 'bg-slate-900/95 border-emerald-500/50 shadow-emerald-500/20'
              : 'bg-slate-900/95 border-rose-500/50 shadow-rose-500/20'
            }
          `}
        >
          {/* İkon */}
          <div
            className={`
              w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl
              border shadow-lg
              ${bs.won
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-emerald-500/30 animate-bounce'
                : 'bg-rose-500/20 border-rose-400 text-rose-400 shadow-rose-500/30'
              }
            `}
          >
            {bs.won ? '🎉' : '❌'}
          </div>

          <h2 className="text-2xl font-black text-white mb-1">
            {bs.won ? 'Bonus Bildin!' : 'Bonus Kaçtı'}
          </h2>

          {bs.won ? (
            <p className="text-emerald-400 font-bold text-lg mb-3">
              +{formatPoints(bs.frozenScore)} PUAN
            </p>
          ) : (
            <p className="text-rose-400 font-medium text-sm mb-2">
              {bs.answered ? 'Yanlış cevap veya süre doldu' : 'Süre doldu — 0 puan'}
            </p>
          )}

          {/* Doğru kelime her durumda gösterilir */}
          <div className="mt-1 mb-4 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
            <span className="text-xs text-slate-400 mr-2">Doğru Kelime:</span>
            <span className="font-mono text-xl font-black text-white tracking-widest">
              {turkishUpper(bs.word)}
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-4 italic">
            "{bs.definition}"
          </p>

          <button
            type="button"
            onClick={() => controller.dismissBonusResult()}
            className={`
              w-full py-4 px-6 rounded-2xl text-lg font-black tracking-wide
              text-white transition-all duration-200 active:scale-95 shadow-lg
              ${bs.won
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/40 border border-emerald-400'
                : 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/40 border border-violet-400'
              }
            `}
          >
            Devam Et ➔
          </button>
        </div>
      </div>
    )
  }

  // ─── Okuma ve Yazma Fazları ────────────────────────────────────

  // Yazma fazında boş kutu sayısı ve dolu sayısı (canSubmit hesabı)
  const lockedCount = 1 + bs.revealedCount
  const emptyCount = 8 - lockedCount
  const allFilled = isWriting && bs.userInput.length >= emptyCount

  return (
    <div className="flex-1 flex flex-col items-center justify-between bg-gradient-to-b from-[#0f0a2e] via-[#150d3d] to-[#0a0620] relative overflow-hidden select-none">

      {/* ─── Üst Bar: Canlı Süre + Puan ───────────────────────── */}
      <header className="w-full px-4 pt-4 pb-2 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          {/* Tur / Bonus etiketi */}
          <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-600/30 text-amber-300 border border-amber-500/30 backdrop-blur-md">
            ⭐ BONUS SORU
          </span>

          {/* Kasa */}
          <div className="flex items-baseline gap-1 text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">KASA:</span>
            <span className="font-mono font-black text-emerald-400 text-sm">
              {formatPoints(state.treasury)}
            </span>
          </div>
        </div>

        {/* Canlı Süre ve Puan Göstergesi */}
        <div className="flex items-center justify-center gap-6">
          {/* Süre */}
          <div className={`flex items-center bg-black/40 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-inner ${
            displayRemaining <= 3 && displayRemaining > 0
              ? 'border-red-500/40 animate-pulse'
              : 'border-white/10'
          }`}>
            <span className={`font-mono font-black text-2xl leading-none tabular-nums ${
              displayRemaining <= 3 && displayRemaining > 0 ? 'text-red-400' : 'text-amber-400'
            }`}>
              {isWriting ? displayRemaining : displayRemaining}
            </span>
            <span className="text-xs ml-0.5 opacity-70 font-sans text-slate-400">sn</span>
          </div>

          {/* Anlık Puan */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              {isWriting ? 'DONMUŞ PUAN' : 'ANLIK PUAN'}
            </span>
            <span className={`font-mono font-black text-2xl leading-tight tabular-nums ${
              displayScore >= 2000
                ? 'text-emerald-400'
                : displayScore >= 1000
                  ? 'text-amber-400'
                  : displayScore > 0
                    ? 'text-orange-400'
                    : 'text-red-400'
            }`}>
              {formatPoints(displayScore)}
            </span>
          </div>
        </div>
      </header>

      {/* ─── Tanım ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 w-full max-w-sm px-4 py-3">
        <div className="bg-white/5 rounded-2xl border border-white/10 px-5 py-4 backdrop-blur-md shadow-inner">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
            Tanım
          </p>
          <p className="text-base sm:text-lg font-medium text-white leading-relaxed">
            {bs.definition}
          </p>
        </div>
      </div>

      {/* ─── 8 Kutu (Tek Satır) ───────────────────────────────── */}
      <div className="flex-shrink-0 w-full flex justify-center py-3">
        <BonusBoardRow bonusState={bs} isWriting={isWriting} />
      </div>

      {/* ─── BİL Butonu (Okuma fazında) / Klavye (Yazma fazında) ─ */}
      <div className="flex-shrink-0 w-full pb-4">
        {isReading && (
          <div className="flex justify-center px-4">
            <button
              type="button"
              onClick={() => controller.pressBil()}
              className="
                w-full max-w-sm py-5 px-8 rounded-2xl
                bg-gradient-to-r from-amber-500 to-amber-600
                hover:from-amber-400 hover:to-amber-500
                text-slate-950 text-2xl font-black tracking-wider
                shadow-xl shadow-amber-500/30 border border-amber-400
                transition-all duration-200 active:scale-95
                animate-pulse
              "
            >
              ✋ BİL
            </button>
          </div>
        )}

        {isWriting && (
          <Keyboard
            statuses={{}}
            onChar={handleChar}
            onDelete={handleDelete}
            onSubmit={handleSubmit}
            canSubmit={allFilled}
            disabled={bs.answered}
          />
        )}
      </div>
    </div>
  )
}
