import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { GameController, type GameState } from '../game/state'
import { getKeyboardStatuses, ROUND_CONFIGS } from '../game/engine'
import { loadWordRepository, ensureBonusLoaded } from '../data/wordsLoader'
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
import Round4IntroScreen from '../components/Round4IntroScreen'
import Round4StageClearedModal from '../components/Round4StageClearedModal'
import GameOverModal from '../components/GameOverModal'
import { turkishUpper } from '../utils/turkish'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

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

        // Bonus verisini arka planda pre-fetch et (bonusa gelince hazır olsun)
        ensureBonusLoaded(repo).catch(() => {})
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

  const isRound4 = Boolean(
    gameState?.round4State && (
      gameState.screen === 'round4_playing' ||
      gameState.screen === 'round4_stage_cleared' ||
      gameState.screen === 'round4_word_lost' ||
      (gameState.screen === 'paused' && gameState.previousScreen?.startsWith('round4'))
    )
  )
  const rs = gameState?.roundState
  const r4 = gameState?.round4State

  // Klavye harf durumları
  const keyboardStatuses = useMemo(() => {
    if (isRound4 && r4) {
      return getKeyboardStatuses(r4.guesses)
    }
    if (!rs) return {}
    return getKeyboardStatuses(rs.guesses)
  }, [isRound4, r4, rs])

  // Harf tuşuna basıldığında
  const handleChar = useCallback(
    (char: string) => {
      if (!controller || isEvaluating) return
      playSound('key_press')
      triggerHaptic('tap')
      controller.typeLetter(char)
    },
    [controller, isEvaluating],
  )

  // Sil tuşuna basıldığında
  const handleDelete = useCallback(() => {
    if (!controller || isEvaluating) return
    playSound('key_press')
    triggerHaptic('tap')
    controller.deleteLetter()
  }, [controller, isEvaluating])

  // Tahmin gönderildiğinde
  const handleSubmit = useCallback(() => {
    if (!controller || isEvaluating) return

    if (isRound4 && r4) {
      const guess = r4.currentInput
      if (guess.length !== r4.stage) return

      const prevAttempt = r4.wordsAttemptedInStage
      controller.submitRound4Guess(guess)

      // Geçersiz kelime veya 5 hak bittiğinde kelime kaybedilir -> round4_word_lost ekranı
      const latestState = controller.getState()
      const latestR4 = latestState.round4State
      if (latestState.screen === 'round4_word_lost' || (latestR4 && latestR4.wordsAttemptedInStage > prevAttempt)) {
        setIsEvaluating(false)
        setIsShaking(true)
        setTimeout(() => setIsShaking(false), 500)
      } else {
        // Geçerli tahmin: animasyon oynayacak, isEvaluating true
        setIsEvaluating(true)
      }
      return
    }

    if (rs) {
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
    }
  }, [controller, isEvaluating, isRound4, r4, rs])

  // Kutu çevirme animasyonu bittiğinde (≤ 700 ms)
  const handleAnimationComplete = useCallback(() => {
    setIsEvaluating(false)
    if (controller && gameState?.screen === 'playing_round') {
      // SPEC 4.4: 1–3. Turda animasyon bitince bir sonraki tahminin 10 sn'si başlar
      controller.startGuessTimer()
    }
  }, [controller, gameState?.screen])

  // 4. tur kelime kaybı durumunda ses ve titreşim
  const prevScreenRef = useRef(gameState?.screen)
  useEffect(() => {
    if (!gameState) return
    if (gameState.screen === 'round4_word_lost' && prevScreenRef.current !== 'round4_word_lost') {
      playSound('word_lost')
      triggerHaptic('wrong')
    }
    prevScreenRef.current = gameState.screen
  }, [gameState?.screen])

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
  const isBonus = Boolean(
    gameState.bonusState && (
      gameState.screen === 'bonus_reading' ||
      gameState.screen === 'bonus_writing' ||
      gameState.screen === 'bonus_result' ||
      (gameState.screen === 'paused' && gameState.previousScreen?.startsWith('bonus_'))
    )
  )

  if (isBonus) {
    return (
      <>
        <BonusScreen
          state={gameState}
          controller={controller}
          clock={controller.getClock()}
        />

        {/* Duraklatıldı Katmanı */}
        {gameState.screen === 'paused' && (
          <PausedOverlay
            onResume={() => controller.resumeGame()}
            onExit={onBackToMenu}
          />
        )}

        {/* Dev Debug: bonus kelimesini göster + atla kısayolları */}
        {import.meta.env.DEV && (
          <DevDebugBar
            bonusWord={gameState.bonusState?.word}
            controller={controller}
            screen={gameState.screen}
          />
        )}
      </>
    )
  }

  // ─── 4. Tur Giriş Ekranı (SPEC 4.8) ──────────────────────────
  const isRound4Intro =
    gameState.screen === 'round4_intro' ||
    (gameState.screen === 'paused' && gameState.previousScreen === 'round4_intro')

  if (isRound4Intro) {
    return (
      <>
        <Round4IntroScreen
          treasury={gameState.treasury}
          onStart={() => controller.startRound4()}
        />

        {/* Duraklatıldı Katmanı */}
        {gameState.screen === 'paused' && (
          <PausedOverlay
            onResume={() => controller.resumeGame()}
            onExit={onBackToMenu}
          />
        )}

        {import.meta.env.DEV && (
          <DevDebugBar
            controller={controller}
            screen={gameState.screen}
          />
        )}
      </>
    )
  }

  // ─── Oyun Sonu / Final Skor Ekranı (SPEC 4.9) ─────────────────
  if (gameState.screen === 'game_over') {
    return (
      <>
        <GameOverModal
          state={gameState}
          onNewGame={() => controller.startNewGame()}
          onBackToMenu={onBackToMenu}
        />
        {import.meta.env.DEV && (
          <DevDebugBar
            controller={controller}
            screen={gameState.screen}
          />
        )}
      </>
    )
  }

  const canSubmit = isRound4
    ? Boolean(r4) &&
      r4!.currentInput.length === r4!.stage &&
      !isEvaluating &&
      gameState.screen === 'round4_playing'
    : Boolean(rs) &&
      rs!.currentInput.length === rs!.letterCount &&
      !rs!.wordWon &&
      !rs!.wordLost &&
      !isEvaluating

  const isKeyboardDisabled =
    isEvaluating ||
    gameState.screen === 'paused' ||
    (isRound4
      ? !r4 ||
        gameState.screen === 'round4_stage_cleared' ||
        gameState.screen === 'round4_word_lost'
      : !rs || rs.wordWon || rs.wordLost)

  const activeWord = isRound4 ? (r4?.lostWord || r4?.currentWord) : rs?.currentWord

  return (
    <div className="flex-1 flex flex-col justify-between items-center bg-gradient-to-b from-[#0f0a2e] via-[#150d3d] to-[#0a0620] relative overflow-hidden select-none">
      {/* HUD: Tur, Kelime/Etap, Hak, Kasa/Kazanç ve Canlı Süre */}
      <Hud
        state={gameState}
        clock={controller.getClock()}
        onPause={() => controller.pauseGame()}
      />

      {/* 4. Tur Kelime Kaybı Bildirimi (Doğru Cevap Gösterimi - ~3 sn Dondurulmuş) */}
      {gameState.screen === 'round4_word_lost' && r4?.lostWord && (
        <div className="w-full max-w-sm px-4 my-2 z-20 animate-fade-in">
          <div className="bg-rose-950/90 border border-rose-500/60 rounded-2xl px-4 py-2.5 flex flex-col items-center justify-center shadow-lg shadow-rose-950/50 backdrop-blur-md text-center">
            <span className="text-[11px] uppercase font-black tracking-wider text-rose-300">
              ❌ KELİME KAYBEDİLDİ
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">Doğru Kelime:</span>
              <span className="font-mono text-xl font-black text-white tracking-widest">
                {turkishUpper(r4.lostWord)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">Yeni kelime hazırlanıyor...</span>
          </div>
        </div>
      )}

      {/* Oyun Tahtası (5 satır x N harf) */}
      {isRound4 && r4 ? (
        <Board
          boardData={{
            letterCount: r4.stage,
            currentWord: r4.lostWord || r4.currentWord,
            guesses: r4.guesses,
            currentInput: r4.currentInput,
            wordWon: false,
            wordLost: gameState.screen === 'round4_word_lost',
          }}
          isEvaluating={isEvaluating}
          onAnimationComplete={handleAnimationComplete}
          isShaking={isShaking}
        />
      ) : rs ? (
        <Board
          roundState={rs}
          isEvaluating={isEvaluating}
          onAnimationComplete={handleAnimationComplete}
          isShaking={isShaking}
        />
      ) : null}

      {/* Ekran Klavyesi (Özel Türkçe tuşlar) */}
      <Keyboard
        statuses={keyboardStatuses}
        onChar={handleChar}
        onDelete={handleDelete}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
        disabled={isKeyboardDisabled}
      />

      {/* Geliştirici Hata Ayıklama Paneli (Sadece DEV modunda) */}
      {import.meta.env.DEV && (
        <DevDebugBar
          currentWord={activeWord}
          controller={controller}
          screen={gameState.screen}
        />
      )}

      {/* 3-2-1 Geri Sayım Katmanı */}
      {gameState.screen === 'countdown' && (
        <CountdownOverlay
          initialSeconds={gameState.countdownValue}
          onComplete={() => controller.tickCountdown(0)}
          label={
            gameState.countdownTarget === 'bonus_reading'
              ? 'Bonus Soru Başlıyor!'
              : gameState.countdownTarget === 'round4_playing'
                ? 'Büyük Final Başlıyor!'
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

      {/* 4. Tur Duraklama Ekranı (Etap Bilindiğinde - SPEC 4.8) */}
      {gameState.screen === 'round4_stage_cleared' && r4 && (
        <Round4StageClearedModal
          round4State={r4}
          treasury={gameState.treasury}
          clock={controller.getClock()}
          onContinue={() => controller.continueRound4()}
        />
      )}

      {/* Duraklatıldı Katmanı */}
      {gameState.screen === 'paused' && (
        <PausedOverlay
          onResume={() => controller.resumeGame()}
          onExit={onBackToMenu}
        />
      )}

      {/* Tur Özeti (1–3. Tur Sonu - SPEC 4.7 & M7) */}
      {gameState.screen === 'round_summary' && (
        <RoundSummaryModal
          round={gameState.roundState?.round ?? 1}
          wordsWon={gameState.roundState?.wordsWonInRound ?? 0}
          wordPoints={
            (gameState.roundState?.wordsWonInRound ?? 0) *
            (ROUND_CONFIGS[(gameState.roundState?.round ?? 1) - 1]?.pointsPerWord ?? 1000)
          }
          bonusPoints={gameState.bonusState?.won ? gameState.bonusState.frozenScore : 0}
          roundPoints={gameState.currentRoundPoints}
          treasury={gameState.treasury}
          onContinue={() => controller.nextRound()}
        />
      )}
    </div>
  )
}
