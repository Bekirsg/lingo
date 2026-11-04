/**
 * LİNGO v2 — Klavye Girdi Doğrulama ve Filtreleme (Input Sanitizer)
 *
 * SPEC-v2 Bölüm 9 & Kullanıcı Gereksinimleri:
 * - Türkçe küçük harfe çevirme (I→ı, İ→i, toLocaleLowerCase('tr-TR'))
 * - Şapkalı harf normalizasyonu (â→a, î→i, û→u)
 * - Geçersiz harfleri eleme: q, w, x ve alfabe dışı (rakam, noktalama, boşluk, sembol)
 * - İsteğe bağlı maksimum uzunluk (maxLen) kırpması
 */

import { normalize } from '../game/engine'

// 29 harfli Türkçe alfabe (q, w, x YOKTUR)
export const TURKISH_ALPHABET_CHARS = 'abcçdefgğhıijklmnoöprsştuüvyz'
const TURKISH_CHAR_SET = new Set(TURKISH_ALPHABET_CHARS.split(''))

/**
 * Tek bir karakterin geçerli bir Türkçe oyun harfi olup olmadığını döner.
 * q, w, x ve alfabe dışı karakterler false döner.
 */
export function isTurkishLetter(char: string): boolean {
  if (!char || char.length === 0) return false
  const lower = char.toLocaleLowerCase('tr-TR')
  if (lower === 'q' || lower === 'w' || lower === 'x') return false
  const norm = normalize(lower)
  return norm.length === 1 && TURKISH_CHAR_SET.has(norm)
}

/**
 * Ham metin girdisini temizler ve geçerli Türkçe küçük harflerden oluşan dizi döner.
 * @param raw Kullanıcıdan gelen ham metin (klavye, yapıştırma vb.)
 * @param maxLen İsteğe bağlı maksimum harf sınırı
 */
export function sanitizeInput(raw: string, maxLen?: number): string[] {
  if (!raw) return []

  const result: string[] = []
  const chars = Array.from(raw)

  for (const c of chars) {
    const lower = c.toLocaleLowerCase('tr-TR')
    // Q, W, X açıkça elenir
    if (lower === 'q' || lower === 'w' || lower === 'x') {
      continue
    }

    const norm = normalize(lower)
    if (norm.length === 1 && TURKISH_CHAR_SET.has(norm)) {
      result.push(norm)
      if (maxLen !== undefined && result.length >= maxLen) {
        break
      }
    }
  }

  return result
}
