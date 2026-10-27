/**
 * BEKİR-EREN Titreşim (Haptics) Motoru
 *
 * SPEC Bölüm 6.5:
 * - navigator.vibrate ile kısa desenler (doğru, yanlış, geri sayım, rekor).
 * - iPhone (iOS Safari) navigator.vibrate API'sini desteklemez; destek yoksa sessizce atlar, hata vermez.
 * - Ayarlardan kapatılınca hiç titreşmez (be:settings haptics kontrolü).
 */

import { getSettings } from '../data/storage'

export type HapticType =
  | 'tap'         // Tuş tıklaması (15ms)
  | 'correct'     // Doğru tahmin / etap tamamlandı (hafif çift titreşim)
  | 'wrong'       // Yanlış / geçersiz kelime (hata titreşimi)
  | 'countdown'   // Geri sayım tiki (25ms)
  | 'record'      // Yeni rekor zafer deseni

/**
 * Belirtilen titreşim desenini çalıştırır.
 * Desteklenmiyorsa veya ayarlardan kapalıysa sessizce atlar.
 */
export function triggerHaptic(type: HapticType): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return
  if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') return

  if (!getSettings().haptics) return

  try {
    switch (type) {
      case 'tap':
        navigator.vibrate(15)
        break
      case 'correct':
        // Hafif çift titreşim
        navigator.vibrate([40, 50, 70])
        break
      case 'wrong':
        // Sert çift uyarı
        navigator.vibrate([80, 50, 80])
        break
      case 'countdown':
        navigator.vibrate(25)
        break
      case 'record':
        // Zafer titreşimi
        navigator.vibrate([60, 40, 60, 40, 150])
        break
    }
  } catch {
    // Tarayıcı güvenlik/iframe kısıtlamasında sessizce geç
  }
}
