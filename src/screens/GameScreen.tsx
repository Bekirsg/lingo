import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { GameController, type GameState } from '../game/state'
import { getKeyboardStatuses } from '../game/engine'
import { loadWordRepository } from '../data/wordsLoader'
import { getHighScore } from '../data/storage'
import Hud from '../components/Hud'
import Board from '../components/Board'
import Keyboard from '../components/Keyboard'
import WordResultModal from '../components/WordResultModal'
import CountdownOverlay from '../components/CountdownOverlay'
import PausedOverlay from '../components/PausedOverlay'
import DevDebugBar from '../components/DevDebugBar'
import BonusScreen from './BonusScreen'
import RoundSummaryModal from '../components/RoundSummaryModal'

interface GameScreenProps {
  onBackToMenu: () => void
}

export default function GameScreen({ onBackToMenu }: GameScreenProps) {
  const [loading, setLoading] = useState(true)
  const [controller, setController] = useState<GameController | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isShaking, setIsShaking] = useState(false)

  // Arka plan otomatik duraklatma için referans
  const controllerRef = useRef<GameController | null>(null)
  controllerRef.current = controller

  // Kelime deposunu yükle ve oyunu başlat
  useEffect(() => {
    let active = true

    loadWordRepository()
      .then((repo) => {
        if (!active) return

        const highScore = getHighScore()
        const game = new GameController({
          words: repo,
          highScore,
          onStateChange: (state) => {
            setGameState({ ...state })
          },
        })

        setController(game)
        setGameState(game.getState())
        setLoading(false)

        // Oyunu hemen başlat
        game.startNewGame()
      })
      .catch((err) => {
        console.error('Kelime verisi yüklenirken hata:', err)
      })

    return () => {
      active = false
    }
  }, [])

  // SPEC Bölüm 2.1-4: Arka plana atılınca (sekme gizlenince / blur) otomatik duraklama
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && controllerRef.current) {
        controllerRef.current.pauseGame()
      }
    }

    const handleBlur = () => {
      if (controllerRef.current) {
        controllerRef.current.pauseGame()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  // Klavye harf durumları
  const keyboardStatuses = useMemo(() => {
    if (!gameState?.roundState) return {}
    return getKeyboardStatuses(gameState.roundState.guesses)
  }, [gameState?.roundState])

  // Harf tuşuna basıldığında
  const handleChar = useCallback(
    (char: string) => {
      if (!controller || isEvaluating) return
      controller.typeLetter(char)
    },
    [controller, isEvaluating],
  )

  // Sil tuşuna basıldığında
  const handleDelete = useCallback(() => {
    if (!controller || isEvaluating) return
    controller.deleteLetter()
  }, [controller, isEvaluating],)

  // Tahmin gönderildiğinde
  const handleSubmit = useCallback(() => {
    if (!controller || !gameState?.roundState || isEvaluating) return
    const rs = gameState.roundState
    const guess = rs.currentInput

    if (guess.length !== rs.letterCount) return

    // Tahmini gönder: autoStartNextTimer = false (çünkü kutu çevirme animasyonu oynayacak!)
    setIsEvaluating(true)
    controller.submitGuess(guess, false)

    // Geçersiz kelime kontrolü -> titreme tetikle
    const latestState = controller.getState()
    if (latestState.roundState?.lossReason === 'invalid_word') {
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
    }
  }, [controller, gameState?.roundState, isEvaluating])

  // Kutu çevirme animasyonu bittiğinde (≤ 700 ms)
  const handleAnimationComplete = useCallback(() => {
    setIsEvaluating(false)
    if (controller) {
      // SPEC 4.4: Animasyon bitince bir sonraki tahminin 10 sn'si başlar
      controller.startGuessTimer()
    }
  }, [controller])

  if (loading || !controller || !gameState) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[var(--color-bg-primary)] p-6 select-none">
        <div className="w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">
          Kelimeler hazırlanıyor...
        </p>
      </div>
    )
  }

  // ─── Bonus Ekranları (okuma + yazma + sonuç) ─────────────────
  if (
    gameState.screen === 'bonus_reading' ||
    gameState.screen === 'bonus_writing' ||
    gameState.screen === 'bonus_result'
  ) {
    return (
      <>
        <BonusScreen
          state={gameState}
          controller={controller}
          clock={controller.getClock()}
        />

        {/* Dev Debug: bonus kelimesini göster + atla kısayolları */}
        <DevDebugBar
          bonusWord={gameState.bonusState?.word}
          controller={controller}
        />
      </>
    )
  }

  const rs = gameState.roundState
  const canSubmit =
    Boolean(rs) &&
    rs!.currentInput.length === rs!.letterCount &&
    !rs!.wordWon &&
    !rs!.wordLost &&
    !isEvaluating

  return (
    <div className="flex-1 flex flex-col justify-between items-center bg-gradient-to-b from-[#0f0a2e] via-[#150d3d] to-[#0a0620] relative overflow-hidden select-none">
      {/* HUD: Tur, Kelime, Hak, Kasa ve Canlı Süre */}
      <Hud
        state={gameState}
        clock={controller.getClock()}
        onPause={() => controller.pauseGame()}
      />

      {/* Oyun Tahtası (5 satır x N harf) */}
      {rs && (
        <Board
          roundState={rs}
          isEvaluating={isEvaluating}
          onAnimationComplete={handleAnimationComplete}
          isShaking={isShaking}
        />
      )}

      {/* Ekran Klavyesi (Özel Türkçe tuşlar) */}
      <Keyboard
        statuses={keyboardStatuses}
        onChar={handleChar}
        onDelete={handleDelete}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
        disabled={isEvaluating || !rs || rs.wordWon || rs.wordLost}
      />

      {/* Geliştirici Hata Ayıklama Paneli (Sadece DEV modunda) */}
      <DevDebugBar
        currentWord={rs?.currentWord}
        controller={controller}
      />

      {/* 3-2-1 Geri Sayım Katmanı */}
      {gameState.screen === 'countdown' && (
        <CountdownOverlay
          initialSeconds={gameState.countdownValue}
          onComplete={() => controller.tickCountdown(0)}
          label={
            gameState.countdownTarget === 'bonus_reading'
              ? 'Bonus Soru Başlıyor!'
              : `${rs?.round ?? 1}. Tur Hazırlanıyor`
          }
        />
      )}

      {/* Kelime Sonuç Kartı (1–3. Tur) */}
      {gameState.screen === 'word_result' && rs && (
        <WordResultModal
          roundState={rs}
          onContinue={() => controller.dismissWordResult()}
        />
      )}

      {/* Duraklatıldı Katmanı */}
      {gameState.screen === 'paused' && (
        <PausedOverlay
          onResume={() => controller.resumeGame()}
          onExit={onBackToMenu}
        />
      )}

      {/* Tur Özeti (SPEC 4.7) */}
      {gameState.screen === 'round_summary' && (
        <RoundSummaryModal
          round={gameState.roundState?.round ?? 1}
          roundPoints={gameState.currentRoundPoints}
          treasury={gameState.treasury}
          onContinue={() => controller.nextRound()}
        />
      )}

      {/* 4. Tur Giriş Ekranı (M6'da tamamlanacak) */}
      {gameState.screen === 'round4_intro' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
          <div className="max-w-xs w-full p-6 rounded-3xl bg-slate-900 border border-amber-500/40 text-center flex flex-col items-center">
            <span className="text-4xl mb-3">🔥</span>
            <h3 className="text-xl font-black text-white mb-1">Büyük Final (4. Tur)</h3>
            <p className="text-xs text-slate-400 mb-4">
              M6 aşamasında tamamlanacak.
            </p>
            <button
              type="button"
              onClick={onBackToMenu}
              className="w-full py-3 px-4 rounded-xl bg-amber-600 text-white font-bold"
            >
              Ana Menüye Dön
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
