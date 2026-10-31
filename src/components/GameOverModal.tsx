/**
 * GameOverModal — Oyun Sonu & Final Skor Ekranı
 *
 * SPEC 4.9 & M7:
 * Final skor ekranı:
 * - Final skor (yukarı sayma animasyonu ile)
 * - 1–3. Tur Kasası
 * - Tamamlanan son etap (örn: "6 Harfli Etap" veya "Hiçbiri (Kasa Yandı)")
 * - Bu telefondaki en yüksek skor (localStorage 'be:highscore')
 * - "Yeni Rekor!" rozeti ve kutlama efekti
 * - Ses ve titreşim efektleri (new_record veya game_over)
 * - İstatistik güncellemesi (recordGameResult)
 * - "Yeni Oyun" ve "Ana Menü" butonları
 */

import { useEffect, useState, useRef } from 'react'
import type { GameState } from '../game/state'
import { recordGameResult, getHighScore } from '../data/storage'
import { formatPoints } from './Hud'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

interface GameOverModalProps {
  state: GameState
  onNewGame: () => void
  onBackToMenu: () => void
}

export default function GameOverModal({
  state,
  onNewGame,
  onBackToMenu,
}: GameOverModalProps) {
  const { finalScore, treasury, round4State } = state
  const lastStage = round4State?.lastCompletedStage ?? null

  const prevHighScoreRef = useRef<number>(getHighScore())
  const hasRecordedRef = useRef(false)

  const isRecord = finalScore > 0 && finalScore > prevHighScoreRef.current

  // İstatistikleri ve rekoru tam bir kez kaydet, ses ve titreşim çal
  useEffect(() => {
    if (!hasRecordedRef.current) {
      hasRecordedRef.current = true
      recordGameResult(finalScore, lastStage)

      if (isRecord) {
        playSound('new_record')
        triggerHaptic('record')
      } else {
        playSound('game_over')
        if (finalScore > 0) {
          triggerHaptic('correct')
        } else {
          triggerHaptic('wrong')
        }
      }
    }
  }, [finalScore, lastStage, isRecord])

  // Final skor yukarı sayma animasyonu
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    if (finalScore <= 0) {
      setAnimatedScore(0)
      return
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      setAnimatedScore(finalScore)
      return
    }

    const duration = 1000
    const startVal = 0
    const targetVal = finalScore
    const startTime = performance.now()

    let frameId: number
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(1, elapsed / duration)
      // Ease out expo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      const current = Math.round(startVal + (targetVal - startVal) * ease)
      setAnimatedScore(current)

      if (progress < 1) {
        frameId = requestAnimationFrame(animate)
      }
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [finalScore])

  const stageLabel = lastStage ? `${lastStage} Harfli Etap` : 'Hiçbiri (Kasa Yandı)'
  const displayHighScore = Math.max(prevHighScoreRef.current, finalScore)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none">
      <div className="max-w-sm w-full p-6 rounded-3xl bg-slate-900/95 border border-violet-500/40 shadow-2xl shadow-violet-500/20 text-center flex flex-col items-center animate-scale-up">
        {/* Rekor veya Bitiş İkonu */}
        <div
          className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-3 text-4xl border shadow-lg ${
            isRecord
              ? 'bg-amber-500/20 border-amber-400 text-amber-400 shadow-amber-500/30 animate-bounce'
              : finalScore > 0
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-emerald-500/30'
                : 'bg-rose-500/20 border-rose-400 text-rose-400 shadow-rose-500/30'
          }`}
        >
          {isRecord ? '👑' : finalScore > 0 ? '🏆' : '💀'}
        </div>

        {isRecord && (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/30 text-amber-300 border border-amber-500/40 mb-2 animate-pulse">
            🎉 YENİ REKOR!
          </span>
        )}

        <h2 className="text-2xl font-black text-white mb-1">
          {finalScore > 0 ? 'Oyun Tamamlandı!' : 'Süre Bitti! (0 Puan)'}
        </h2>

        {/* Skor Kartı */}
        <div className="my-4 w-full bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col items-center">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
            FİNAL SKOR
          </span>
          <span
            className={`font-mono font-black text-4xl mb-3 tracking-tight ${
              finalScore > 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatPoints(animatedScore)}
          </span>

          <div className="w-full space-y-1.5 pt-2 border-t border-white/10 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">1–3. Tur Kasası:</span>
              <span className="font-mono font-bold">{formatPoints(treasury)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Tamamlanan Etap:</span>
              <span className="font-bold text-amber-400">{stageLabel}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">En Yüksek Skor:</span>
              <span className="font-mono font-bold text-violet-300">
                {formatPoints(displayHighScore)}
              </span>
            </div>
          </div>
        </div>

        {/* Butonlar */}
        <div className="w-full space-y-2 mt-1">
          <button
            type="button"
            onClick={() => {
              playSound('key_press')
              triggerHaptic('tap')
              onNewGame()
            }}
            className="
              w-full py-4 px-6 rounded-2xl text-lg font-black tracking-wide
              text-white transition-all duration-200 active:scale-95 shadow-lg
              bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/40 border border-emerald-400
            "
          >
            🎮 Yeniden Oyna
          </button>

          <button
            type="button"
            onClick={() => {
              playSound('key_press')
              triggerHaptic('tap')
              onBackToMenu()
            }}
            className="
              w-full py-3 px-6 rounded-2xl text-sm font-bold tracking-wide
              text-slate-300 hover:text-white transition-all duration-200 active:scale-95
              bg-white/5 hover:bg-white/10 border border-white/10
            "
          >
            🏠 Ana Menüye Dön
          </button>
        </div>
      </div>
    </div>
  )
}
