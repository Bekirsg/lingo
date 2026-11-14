/**
 * LİNGO Oyun Durum Makinesi Tip Tanımları
 * SPEC Bölüm 2.1-2, Bölüm 3, Bölüm 4, Bölüm 6.1
 */

import type { Mark } from '../engine'
import type { GameLevel } from '../../data/levels'

export type GameMode = 'yarisma' | 'calisma' | 'hatalar'

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
  | 'round4_word_lost'         // 4. tur kelime kaybedildi (doğru cevap ~3 sn gösterilir, sayaç dondurulmuş)
  | 'round4_stage_cleared'     // 4. tur etap bilindi (duraklama ekranı)
  | 'game_over'                // Oyun sonu / Final skor ekranı
  | 'practice_summary'         // Çalışma modu oturum özeti
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
  lossReason?: 'invalid_word' | 'time_out' | 'max_attempts' | 'pass'
  /** Bu turda bilinen toplam kelime sayısı (0..5) */
  wordsWonInRound: number
}

export interface BonusState {
  word: string
  definition: string
  /** Kelime harf uzunluğu (varsayılan 8, parametrik) */
  length: number
  /** Açılan harf indeksleri (0 hariç, sırasıyla) */
  revealOrder: number[]
  /** Kaç rastgele harf açıldı (0..length-1) */
  revealedCount: number
  /** Anlık puan (3000 -> 0) */
  currentScore: number
  /** BİL basıldığı andaki dondurulmuş puan */
  frozenScore: number
  /** BİL basıldı mı? */
  bilPressed: boolean
  /** Oyuncunun yazdığı harfler (sadece boş kutulara, sırayla) */
  userInput: string
  /** Bonus bilindi mi? */
  won: boolean
  /** Bonus yazma süresi doldu veya sonuç gösterildi mi? */
  answered: boolean
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
  /** round4_word_lost ekranında gösterilecek kaybedilen kelime */
  lostWord?: string
}

export interface MissedWordItem {
  word: string
  letterCount: number
  reason: 'lost' | 'pass'
  correctWord: string
}

export interface PracticeSummary {
  totalQuestions: number
  wonCount: number
  lostCount: number
  passCount: number
  byLetter: Record<number, { asked: number; won: number }>
  bonusWonCount: number
  bonusLostCount: number
  missedWords: MissedWordItem[]
  /** Hatalarımla modunda bu oturumda öğrenilen kelimeler (SPEC M8) */
  learnedWords?: string[]
  /** Oturum çalışılacak kelime kalmadığı için otomatik mi bitti? */
  autoEnded?: boolean
  /** Oturum bittiğinde havuzda kalan çalışılabilir kelime sayısı */
  remainingCount?: number
}

export interface PracticeState {
  cycle: number
  questionIndexInCycle: number // 1: 4h, 2: 5h, 3: 6h, 4: 7h, 5: 8h bonus
  totalAsked: number
  totalWon: number
  totalLost: number
  totalPassed: number
  byLetter: Record<number, { asked: number; won: number }>
  bonusWonCount: number
  bonusLostCount: number
  missedWords: MissedWordItem[]
  currentWordInvalidGuesses: string[]
  currentWordGuessTimes: number[]
  /** Hatalarımla modunda havuzda kalan çalışılabilir kelime sayısı */
  remainingCount?: number
  /** Hatalarımla modunda soru sonuç kartında gösterilecek ardışık doğru / öğrenildi bilgisi */
  streakInfo?: { streak: number; justLearned: boolean }
  /** Hatalarımla modunda bu oturumda öğrenilen kelimeler listesi */
  learnedThisSession?: string[]
  /** Hatalarımla modunda mevcut adım (4, 5, 6, 7 veya 'bonus') */
  currentMistakeStep?: 4 | 5 | 6 | 7 | 'bonus'
  /** Çalışılacak kelime kalmadığı için otomatik bitirildi mi? */
  autoEnded?: boolean
}

export interface QuestionResolvedEvent {
  mode: GameMode
  level?: GameLevel
  letterCount: number
  result: 'won' | 'lost' | 'pass'
  attemptCount: number
  lossReason?: 'five_guesses' | 'invalid_word' | 'timeout' | 'pass' | 'max_attempts' | 'time_out'
  word: string
  /** Gönderilen her geçerli veya geçersiz tahminin metni */
  guesses?: string[]
  /** Kutu sonuçları (her tahmin için tam renk dizisi) */
  guessMarks?: Mark[][]
  /** Her tahminin süresi (milisaniye) */
  guessDurationsMs?: number[]
  /** Tahmin süreleri (saniye, geriye dönük uyumluluk) */
  guessTimes: number[]
  /** Sözlük dışı gönderilen diziler */
  invalidWords?: string[]
  /** Sözlük dışı diziler (geriye dönük uyumluluk) */
  invalidGuesses: string[]
  /** Bonusta sonuç türü */
  bonusResultType?: 'correct' | 'wrong' | 'not_pressed' | 'write_timeout'
  /** BİL anındaki (veya expire anındaki) açılmış harf sayısı */
  bonusLettersOpened?: number
  /** BİL saniyesi */
  bonusBilSeconds?: number
  /** Bonus puanı */
  bonusPoints?: number
}

export interface GameCompletedEvent {
  timestamp: number
  level: GameLevel
  finalScore: number
  treasury: number
  lastCompletedStage: number | null
  solvedWordsCount: number
  lostWordsCount: number
  round4TimeLeft: number
}

export interface SessionCompletedEvent {
  timestamp: number
  mode: 'calisma' | 'hatalar'
  level?: GameLevel
  totalQuestions: number
  wonCount: number
  lostCount: number
  passCount: number
  byLetter: Record<number, { asked: number; won: number }>
  bonusWonCount: number
  bonusLostCount: number
}

export interface GameState {
  screen: GameScreen
  /** Oyun modu: yarışma veya çalışma (SPEC-v2 Bölüm 6) */
  mode: GameMode
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

  /** 1–3. tur durumu (çalışma modunda normal kelimeler için de kullanılır) */
  roundState?: RoundState
  /** Bonus soru durumu */
  bonusState?: BonusState
  /** 4. tur durumu */
  round4State?: Round4State

  /** Çalışma modu durumu (SPEC-v2 Bölüm 6) */
  practiceState?: PracticeState
  /** Çalışma modu tamamlanma / oturum özeti */
  practiceSummary?: PracticeSummary

  /** Final skoru (oyun bittiğinde) */
  finalScore: number
  /** Yeni rekor mu? */
  isNewRecord: boolean
  /** Seçilen oyun seviyesi (SPEC-v2 Bölüm 4 & 5) */
  level: GameLevel
}
