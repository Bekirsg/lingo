/**
 * BEKİR-EREN Oyun Durum Makinesi Tip Tanımları
 * SPEC Bölüm 2.1-2, Bölüm 3, Bölüm 4, Bölüm 6.1
 */

import type { Mark } from '../engine'

export type GameScreen =
  | 'menu'                     // Ana menü
  | 'countdown'                // 3-2-1 geri sayım
  | 'playing_round'            // 1–3. tur kelime tahmin tahtası
  | 'word_result'              // Kelime sonuç kartı (1–3. tur)
  | 'bonus_reading'            // Bonus soru: 3 sn okuma ve saniyede bir harf açılışı
  | 'bonus_writing'            // Bonus soru: BİL basıldıktan sonra 3 sn yazma
  | 'bonus_result'             // Bonus soru sonucu
  | 'round_summary'            // Tur özeti (1. ve 2. tur sonu)
  | 'round4_intro'             // 4. tur (Büyük Final) giriş ekranı
  | 'round4_playing'           // 4. tur kelime tahmin tahtası (120 sn tek sayaç)
  | 'round4_stage_cleared'     // 4. tur etap bilindi (duraklama ekranı)
  | 'game_over'                // Oyun sonu / Final skor ekranı
  | 'paused'                   // Duraklatıldı katmanı (arka plan / kullanıcı duraklatması)

export interface GuessAttempt {
  guess: string
  marks: Mark[]
}

export interface RoundState {
  round: 1 | 2 | 3
  /** 1-3. turlarda kelime sırası (1..5) */
  wordIndex: number
  /** Mevcut kelimenin harf sayısı */
  letterCount: number
  /** Mevcut doğru kelime */
  currentWord: string
  /** Yapılan tahminler (maks 5) */
  guesses: GuessAttempt[]
  /** Mevcut yazılmakta olan tahmin */
  currentInput: string
  /** Kelime bilindi mi? */
  wordWon: boolean
  /** Kelime kaybedildi mi? */
  wordLost: boolean
  /** Kelime kaybetme nedeni */
  lossReason?: 'invalid_word' | 'time_out' | 'max_attempts'
}

export interface BonusState {
  word: string
  definition: string
  /** Açılan harf indeksleri (0 hariç, sırasıyla) */
  revealOrder: number[]
  /** Kaç rastgele harf açıldı (0..7) */
  revealedCount: number
  /** Anlık puan (3000 -> 0) */
  currentScore: number
  /** BİL basıldığı andaki dondurulmuş puan */
  frozenScore: number
  /** BİL basıldı mı? */
  bilPressed: boolean
  /** Oyuncunun yazdığı tahmin */
  userInput: string
  /** Bonus bilindi mi? */
  won: boolean
}

export interface Round4State {
  /** Mevcut etap (4, 5, 6 veya 7) */
  stage: number
  /** Tamamlanan son etap (4, 5, 6, 7 veya null) */
  lastCompletedStage: number | null
  /** Mevcut kelime */
  currentWord: string
  /** Yapılan tahminler (maks 5) */
  guesses: GuessAttempt[]
  /** Mevcut yazılmakta olan tahmin */
  currentInput: string
  /** Bu etapta kelime kaçıncı denemede (kaç kelime yandı) */
  wordsAttemptedInStage: number
}

export interface GameState {
  screen: GameScreen
  /** Duraklatılmadan önceki ekran */
  previousScreen?: GameScreen
  /** 1–3. turlarda biriken toplam kasa (maks 39.000) */
  treasury: number
  /** Mevcut turun kasaya katkısı */
  currentRoundPoints: number
  /** Bu oyunda kullanılmış kelimeler kümesi (tekrar önleme) */
  usedWords: Set<string>
  /** Geri sayım değeri (3, 2, 1) */
  countdownValue: number
  /** Geri sayımdan sonra geçilecek hedef ekran */
  countdownTarget?: 'playing_round' | 'round4_playing' | 'bonus_reading'

  /** 1–3. tur durumu */
  roundState?: RoundState
  /** Bonus soru durumu */
  bonusState?: BonusState
  /** 4. tur durumu */
  round4State?: Round4State

  /** Final skoru (oyun bittiğinde) */
  finalScore: number
  /** Yeni rekor mu? */
  isNewRecord: boolean
}
