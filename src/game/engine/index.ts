/**
 * LİNGO Oyun Motoru
 * Saf fonksiyonlar — React'ten bağımsız, birim test ile doğrulanır.
 */

// ─── Türkçe Normalizasyon ───────────────────────────────────────

/** Türkçe küçük harfe çevirir (I→ı, İ→i) */
export function turkishLower(s: string): string {
  return s.toLocaleLowerCase('tr-TR')
}

/** Şapkalı harfleri normalize eder: â→a, î→i, û→u */
export function normalizeHat(s: string): string {
  return s.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
}

/** Tam normalizasyon: küçük harf + şapka kaldırma */
export function normalize(s: string): string {
  return normalizeHat(turkishLower(s))
}

/** Türkçe harf sayısı (çok baytlı emoji vb.'den korunmak için) */
export function letterCount(s: string): number {
  return Array.from(s).length
}

/** Kelimenin sadece geçerli Türkçe harflerden oluşup oluşmadığını kontrol eder */
const VALID_CHARS = /^[a-zçğıöşü]+$/
export function isValidWord(s: string): boolean {
  return VALID_CHARS.test(normalize(s))
}

// ─── Harf Değerlendirme (Wordle Algoritması) ────────────────────

export type Mark = 'green' | 'yellow' | 'red'

/**
 * Standart Wordle renklendirme algoritması.
 * SPEC Bölüm 4.3: Her eşleşme bir kez kullanılır.
 * İlk harf (kilitli) her zaman yeşil kabul edilir ve eşleşme sayacına dahildir.
 *
 * @param answer Doğru cevap (normalize edilmiş küçük harf)
 * @param guess  Oyuncunun tahmini (normalize edilmiş küçük harf, aynı uzunlukta)
 * @returns Her pozisyon için Mark dizisi
 */
export function evaluateGuess(answer: string, guess: string): Mark[] {
  const a = Array.from(answer)
  const g = Array.from(guess)
  const marks: Mark[] = Array(a.length).fill('red') as Mark[]
  const remaining: Record<string, number> = {}

  // 1. geçiş: yeşiller
  for (let i = 0; i < a.length; i++) {
    if (g[i] === a[i]) {
      marks[i] = 'green'
    } else {
      remaining[a[i]] = (remaining[a[i]] ?? 0) + 1
    }
  }

  // 2. geçiş: sarılar (kalan harf sayısı kadar)
  for (let i = 0; i < a.length; i++) {
    if (marks[i] !== 'green' && (remaining[g[i]] ?? 0) > 0) {
      marks[i] = 'yellow'
      remaining[g[i]]--
    }
  }

  return marks
}

/**
 * Tahminlerden klavye tuşlarının renk durumlarını çıkarır.
 * Öncelik sırası: green > yellow > red
 */
export function getKeyboardStatuses(
  guesses: { guess: string; marks: Mark[] }[],
): Record<string, Mark> {
  const statuses: Record<string, Mark> = {}
  for (const { guess, marks } of guesses) {
    const chars = Array.from(guess)
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i]
      const mark = marks[i]
      const current = statuses[c]
      if (mark === 'green') {
        statuses[c] = 'green'
      } else if (mark === 'yellow' && current !== 'green') {
        statuses[c] = 'yellow'
      } else if (mark === 'red' && !current) {
        statuses[c] = 'red'
      }
    }
  }
  return statuses
}

// ─── Tur Yapılandırması ─────────────────────────────────────────

export interface RoundConfig {
  round: 1 | 2 | 3 | 4
  wordCount: number
  letterCount: number
  pointsPerWord: number
  hasBonus: boolean
  /** 4. tur etapları (sadece round=4 için) */
  stages?: number[]
}

export const ROUND_CONFIGS: RoundConfig[] = [
  { round: 1, wordCount: 5, letterCount: 4, pointsPerWord: 1000, hasBonus: true },
  { round: 2, wordCount: 5, letterCount: 5, pointsPerWord: 2000, hasBonus: true },
  { round: 3, wordCount: 5, letterCount: 6, pointsPerWord: 3000, hasBonus: true },
  { round: 4, wordCount: 1, letterCount: 4, pointsPerWord: 0, hasBonus: false, stages: [4, 5, 6, 7] },
]

/** Tur'un en yüksek kasa katkısı (bonus dahil) */
export function maxRoundPoints(round: 1 | 2 | 3): number {
  const cfg = ROUND_CONFIGS[round - 1]
  return cfg.wordCount * cfg.pointsPerWord + 3000 // bonus
}

/**
 * Maksimum kasa toplamı: (5×1000+3000) + (5×2000+3000) + (5×3000+3000) = 39.000
 * SPEC Bölüm 4.1
 */
export const MAX_TREASURY = 39_000

/** Her tahmin için süre sınırı (saniye) — 1–3. turlar */
export const GUESS_TIME_LIMIT = 15

/** 4. tur toplam süre (saniye) */
export const ROUND4_TIME_LIMIT = 120

/** Her kelime için tahmin hakkı */
export const MAX_GUESSES = 5

// ─── Bonus Puan Zaman Çizelgesi ─────────────────────────────────

/**
 * Bonus puanı hesaplar.
 * SPEC Bölüm 4.6: puan(n) = 3000 − 200·n (n = açılan rastgele harf sayısı, 0…6)
 * n=7 → puan=0 (doğrudan)
 *
 * @param revealedCount Açılan rastgele harf sayısı (ilk harf hariç, 0–7)
 */
export function bonusScore(revealedCount: number): number {
  if (revealedCount >= 7) return 0
  return 3000 - 200 * revealedCount
}

/**
 * Bonus zamandan açılan harf sayısını hesaplar.
 * SPEC Bölüm 4.6 zaman çizelgesi:
 * - 0 ≤ t < 3: okuma süresi, harf açılmaz → n=0
 * - t = 4: 1. harf, t = 5: 2. harf, ..., t = 10: 7. harf
 * - Yani t ≥ 4 ise n = t - 3, maks 7
 *
 * @param elapsedSeconds Bonus başlangıcından geçen süre (saniye)
 */
export function bonusRevealedAtTime(elapsedSeconds: number): number {
  if (elapsedSeconds < 4) return 0
  return Math.min(Math.floor(elapsedSeconds) - 3, 7)
}

/**
 * Belirli bir zamanda bonus puanı.
 * @param elapsedSeconds Bonus başlangıcından geçen süre
 */
export function bonusScoreAtTime(elapsedSeconds: number): number {
  return bonusScore(bonusRevealedAtTime(elapsedSeconds))
}

/** Bonus toplam süresi (saniye): 3 sn okuma + 7 sn harf açılma */
export const BONUS_TOTAL_TIME = 10

/** Bonus yazma süresi (BİL basıldıktan sonra) */
export const BONUS_WRITE_TIME = 10

// ─── 4. Tur Kazanç Tablosu ──────────────────────────────────────

/**
 * 4. tur final skorunu hesaplar.
 * SPEC Bölüm 4.8 kazanç tablosu:
 * - Hiçbiri → 0
 * - 4 harfli → K / 2
 * - 5 harfli → K
 * - 6 harfli → K × 2
 * - 7 harfli → 250.000 + (K × 2)
 *
 * Kasanın yerine geçer (eklenmez).
 * Math.floor uygulanır (K her zaman 200'ün katı olduğundan K/2 zaten tam sayı).
 *
 * @param treasury 1–3. turlardan gelen kasa (K)
 * @param completedStage Tamamlanan son etabın harf sayısı (4/5/6/7) veya null
 */
export function round4FinalScore(treasury: number, completedStage: number | null): number {
  if (completedStage === null) return 0
  switch (completedStage) {
    case 4: return Math.floor(treasury / 2)
    case 5: return treasury
    case 6: return treasury * 2
    case 7: return 250_000 + treasury * 2
    default: return 0
  }
}

// ─── Kelime Seçici ──────────────────────────────────────────────

/**
 * Havuzdan rastgele bir kelime seçer, daha önce kullanılanları hariç tutar.
 * SPEC Bölüm 2.1-6: Aynı oyun içinde bir kelime ikinci kez çıkmaz.
 *
 * @param pool Kelime havuzu (string dizisi)
 * @param usedWords Bu oyunda kullanılmış kelimeler
 * @returns Seçilen kelime veya null (havuz tükendiyse)
 */
export function pickWord(pool: string[], usedWords: Set<string>): string | null {
  const available = pool.filter(w => !usedWords.has(w))
  if (available.length === 0) return null
  const idx = Math.floor(Math.random() * available.length)
  return available[idx]
}

/**
 * Bonus kelimesi seçer (8 harfli + tanımlı).
 *
 * @param pool Bonus havuzu ({ w: string, d: string }[])
 * @param usedWords Kullanılmış kelimeler
 * @returns { word, definition } veya null
 */
export function pickBonusWord(
  pool: { w: string; d: string }[],
  usedWords: Set<string>,
): { word: string; definition: string } | null {
  const available = pool.filter(item => !usedWords.has(item.w))
  if (available.length === 0) return null
  const idx = Math.floor(Math.random() * available.length)
  const item = available[idx]
  return { word: item.w, definition: item.d }
}

/**
 * Bonus sorusu için açılacak harflerin sırasını rastgele belirler.
 * İlk harf (index 0) zaten açık ve kilitli, geri kalan 7 harfin
 * indekslerini karışık sırada döndürür.
 *
 * @param wordLength Kelime uzunluğu (8)
 * @returns Karıştırılmış indeks dizisi (1–7)
 */
export function shuffleRevealOrder(wordLength: number): number[] {
  const indices = Array.from({ length: wordLength - 1 }, (_, i) => i + 1)
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices
}
