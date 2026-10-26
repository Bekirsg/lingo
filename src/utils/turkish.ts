/**
 * Türkçe görüntüleme yardımcı fonksiyonları.
 *
 * JavaScript'in String.toUpperCase() metodu İngilizce kural uygular:
 *   i → I  (Yanlış! Türkçe'de i → İ olmalı)
 *   ı → I  (Yanlış! Türkçe'de ı → I olmalı)
 *
 * Bu modül tüm görüntüleme yerlerinde (tahta, klavye, sonuç kartı, HUD, cevap gösterme)
 * doğru Türkçe büyük harf dönüşümü sağlar.
 */

/**
 * Türkçe kurala göre büyük harfe çevirir.
 *   i → İ
 *   ı → I
 *   ş → Ş, ç → Ç, ğ → Ğ, ö → Ö, ü → Ü
 *
 * @param s  Küçük harfli Türkçe metin
 * @returns  Büyük harfli Türkçe metin
 */
export function turkishUpper(s: string): string {
  return s.toLocaleUpperCase('tr-TR')
}
