import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { GameController, type GameState, type GameMode } from '../game/state'
import { getKeyboardStatuses, ROUND_CONFIGS } from '../game/engine'
import { loadWordRepository, ensureBonusLoaded, ensureLevelsLoaded, ensureBonusLevelLoaded } from '../data/wordsLoader'
import { getLevelRecords } from '../data/storage'
import {
  recordQuestionResolved,
  recordGameCompleted,
  recordSessionCompleted,
  flushPendingAnalyticsSave,
} from '../analytics'
import type { GameLevel } from '../data/levels'
import Hud from '../components/Hud'
import Board from '../components/Board'
import InputLayer from '../components/InputLayer'
import WordResultModal from '../components/WordResultModal'
import CountdownOverlay from '../components/CountdownOverlay'
import PausedOverlay from '../components/PausedOverlay'
import BonusScreen from './BonusScreen'
import RoundSummaryModal from '../components/RoundSummaryModal'
import Round4IntroScreen from '../components/Round4IntroScreen'
import Round4StageClearedModal from '../components/Round4StageClearedModal'
import GameOverModal from '../components/GameOverModal'
import PracticeSummaryModal from '../components/PracticeSummaryModal'
import { turkishUpper } from '../utils/turkish'
import { playSound } from '../audio/sound'
import { triggerHaptic } from '../haptics/vibration'

interface GameScreenProps {
  onBackToMenu: () => void
  level?: GameLevel
  mode?: GameMode
}

export default function GameScreen({ onBackToMenu, level = 'zor', mode = 'yarisma' }: GameScreenProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [controller, setController] = useState<GameController | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isShaking, setIsShaking] = useState(false)

  // Sistem klavyesi odaklama referansı
  const systemFocusRef = useRef<(() => void) | null>(null)

  // Arka plan otomatik duraklatma için referans
  const controllerRef = useRef<GameController | null>(null)
  controllerRef.current = controller

  // Kelime deposunu yükle ve oyunu başlat
  useEffect(() => {
    let active = true

    loadWordRepository()
      .then(async (repo) => {
        if (!active) return

        // Kolay veya Orta ise seviye dosyalarının hazır olduğundan emin ol (Zor hiçbir şey indirmez)
        if (level !== 'zor') {
          try {
            await Promise.all([
              ensureLevelsLoaded(repo, level),
              ensureBonusLevelLoaded(repo, level),
            ])
          } catch (err) {
            console.error('[LİNGO v2] Seviye dosyaları yüklenemedi:', err)
            if (active) {
              setLoadError(true)
              setLoading(false)
            }
            return
          }
        }

        if (!active) return

        const highScore = getLevelRecords()[level]
        const game = new GameController({
          words: repo,
          level,
          mode,
          highScore,
          onStateChange: (state) => {
            setGameState({ ...state })
          },
          onQuestionResolved: recordQuestionResolved,
          onGameCompleted: recordGameCompleted,
          onSessionCompleted: recordSessionCompleted,
        })

        setController(game)
        setGameState(game.getState())
        setLoading(false)

        // Oyunu seçilen seviye ve modla hemen başlat
        game.startNewGame(level, mode)

        // Bonus verisini arka planda pre-fetch et (bonusa gelince hazır olsun)
        ensureBonusLoaded(repo).catch(() => {})
      })
      .catch((err) => {
        console.error('Kelime verisi yüklenirken hata:', err)
        if (active) {
          setLoadError(true)
          setLoading(false)
        }
      })

    return () => {
      active = false
      flushPendingAnalyticsSave()
    }
  }, [level, mode, reloadKey])

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

  // Harf tuşuna basıldığında (Ses ve titreşim Keyboard içinde tek sefer çalınır)
  const handleChar = useCallback(
    (char: string) => {
      if (!controller || isEvaluating) return
      controller.typeLetter(char)
    },
    [controller, isEvaluating],
  )

  // Sil tuşuna basıldığında (Ses ve titreşim Keyboard içinde tek sefer çalınır)
  const handleDelete = useCallback(() => {
    if (!controller || isEvaluating) return
    controller.deleteLetter()
  }, [controller, isEvaluating])

  // PAS butonuna basıldığında (SPEC-v2 Bölüm 10)
  const handlePass = useCallback(() => {
    if (!controller || isEvaluating) return
    controller.passWord()
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
      // SPEC 4.4: 1–3. Turda animasyon bitince bir sonraki tahminin 15 sn'si başlar
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

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-dvh bg-[var(--color-bg-primary)] px-6 select-none">
        <div className="w-full max-w-sm rounded-3xl p-6 bg-slate-900/95 border border-rose-500/30 text-center shadow-2xl flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400 text-rose-400 flex items-center justify-center text-3xl mb-3 shadow-lg">
            ⚠️
          </div>
          <h2 className="text-xl font-black text-white mb-1">
            Seviye verisi yüklenemedi
          </h2>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Kelime listesi sunucudan alınamadı. Lütfen internet bağlantını kontrol et ve tekrar dene.
          </p>
          <div className="w-full flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                setLoadError(false)
                setLoading(true)
                setReloadKey((k) => k + 1)
              }}
              className="w-full py-3.5 px-6 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition-all active:scale-95"
            >
              Tekrar Dene
            </button>
            <button
              type="button"
              onClick={onBackToMenu}
              className="w-full py-2.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 font-semibold text-xs transition-all active:scale-95"
            >
              Geri
            </button>
          </div>
        </div>
      </div>
    )
  }

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

  // ─── Çalışma Modu Oturum Özeti Ekranı ─────────────────────────
  if (gameState.screen === 'practice_summary' && gameState.practiceSummary) {
    return (
      <PracticeSummaryModal
        summary={gameState.practiceSummary}
        level={gameState.level}
        onRestart={() => controller.startNewGame(level, mode)}
        onBackToMenu={onBackToMenu}
      />
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
          onEndPractice={() => setShowEndConfirm(true)}
        />

        {/* Çalışmayı Bitir Onay Penceresi */}
        {showEndConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
            <div className="w-full max-w-xs rounded-3xl p-5 bg-slate-900/95 border border-rose-500/30 text-center shadow-2xl flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400 text-rose-400 flex items-center justify-center text-2xl mb-3 shadow-lg">
                🛑
              </div>
              <h3 className="text-lg font-black text-white mb-1">
                Çalışmayı Bitir?
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Çalışma oturumun sonlandırılacak ve performans özetin gösterilecek.
              </p>
              <div className="w-full flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-semibold text-xs active:scale-95 transition-all"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEndConfirm(false)
                    controller.endPractice()
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
                >
                  Bitir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Duraklatıldı Katmanı */}
        {gameState.screen === 'paused' && (
          <PausedOverlay
            onResume={() => controller.resumeGame()}
            onExit={onBackToMenu}
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
      </>
    )
  }

  // ─── Oyun Sonu / Final Skor Ekranı (SPEC 4.9) ─────────────────
  if (gameState.screen === 'game_over') {
    return (
      <GameOverModal
        state={gameState}
        onNewGame={() => controller.startNewGame(level)}
        onBackToMenu={onBackToMenu}
      />
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

  return (
    <div className="flex-1 flex flex-col justify-between items-center bg-gradient-to-b from-[#0f0a2e] via-[#150d3d] to-[#0a0620] relative overflow-hidden select-none">
      {/* HUD: Tur, Kelime/Etap, Hak, Kasa/Kazanç ve Canlı Süre */}
      <Hud
        state={gameState}
        clock={controller.getClock()}
        onPause={() => controller.pauseGame()}
        onEndPractice={() => setShowEndConfirm(true)}
      />

      {/* Çalışmayı Bitir Onay Penceresi */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
          <div className="w-full max-w-xs rounded-3xl p-5 bg-slate-900/95 border border-rose-500/30 text-center shadow-2xl flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400 text-rose-400 flex items-center justify-center text-2xl mb-3 shadow-lg">
              🛑
            </div>
            <h3 className="text-lg font-black text-white mb-1">
              Çalışmayı Bitir?
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Çalışma oturumun sonlandırılacak ve performans özetin gösterilecek.
            </p>
            <div className="w-full flex gap-2">
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-semibold text-xs active:scale-95 transition-all"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEndConfirm(false)
                  controller.endPractice()
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
              >
                Bitir
              </button>
            </div>
          </div>
        </div>
      )}

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
      <div
        className="w-full flex-1 flex flex-col items-center justify-center min-h-0"
        onClick={() => systemFocusRef.current?.()}
      >
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
      </div>

      {/* Ekran Girdi Katmanı (Oyun veya Sistem Klavyesi) */}
      <InputLayer
        statuses={keyboardStatuses}
        onChar={handleChar}
        onDelete={handleDelete}
        onSubmit={handleSubmit}
        onPass={handlePass}
        hasPass={true}
        canSubmit={canSubmit}
        disabled={isKeyboardDisabled}
        onRegisterFocus={(fn) => {
          systemFocusRef.current = fn
        }}
      />

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
                : gameState.mode === 'calisma'
                  ? `${rs?.letterCount ?? 4} Harfli Kelime`
                  : `${rs?.round ?? 1}. Tur Hazırlanıyor`
          }
        />
      )}

      {/* Kelime Sonuç Kartı (1–3. Tur ve Çalışma Modu) */}
      {gameState.screen === 'word_result' && rs && (
        <WordResultModal
          roundState={rs}
          isCalisma={gameState.mode === 'calisma'}
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
