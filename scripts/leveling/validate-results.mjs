/**
 * LİNGO v2 — Parti Çıktısı Doğrulayıcı (Validate Results)
 * SPEC-v2 Bölüm 4.7-D
 *
 * Sınıflandırma parti çıktılarının katı JSON şemasına uygunluğunu doğrular:
 * - w: string (boş olmayan, Türkçe küçük harfli kelime)
 * - cefr: 'A1' | 'A2' | 'B1' | 'B2' | 'UST'
 * - guven: 1 | 2 | 3
 * - gerekce: string (en fazla 12 kelime)
 */

import fs from 'node:fs'
import path from 'node:path'

const VALID_CEFR = new Set(['A1', 'A2', 'B1', 'B2', 'UST'])
const VALID_GUVEN = new Set([1, 2, 3])

/**
 * Tek bir sınıflandırma sonucunu şemaya göre doğrular.
 * @param {any} item
 * @param {string} [context]
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateClassificationItem(item, context = '') {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: `${context}: Kayıt bir nesne olmalıdır.` }
  }

  // w kontrolü
  if (typeof item.w !== 'string' || item.w.trim().length === 0) {
    return { valid: false, error: `${context}: 'w' geçerli bir kelime dizgisi olmalıdır.` }
  }

  // cefr kontrolü
  if (!VALID_CEFR.has(item.cefr)) {
    return {
      valid: false,
      error: `${context} (${item.w}): 'cefr' değeri A1|A2|B1|B2|UST olmalıdır, alınan: '${item.cefr}'`,
    }
  }

  // guven kontrolü
  if (!VALID_GUVEN.has(item.guven)) {
    return {
      valid: false,
      error: `${context} (${item.w}): 'guven' değeri 1|2|3 olmalıdır, alınan: '${item.guven}'`,
    }
  }

  // gerekce kontrolü (en fazla 12 kelime)
  if (typeof item.gerekce !== 'string' || item.gerekce.trim().length === 0) {
    return { valid: false, error: `${context} (${item.w}): 'gerekce' boş bırakılamaz.` }
  }
  const wordCount = item.gerekce.trim().split(/\s+/).length
  if (wordCount > 12) {
    return {
      valid: false,
      error: `${context} (${item.w}): 'gerekce' en fazla 12 kelime olmalıdır (${wordCount} kelime bulundu).`,
    }
  }

  return { valid: true }
}

/**
 * Bir dosyadaki veya dizideki sonuçları topluca doğrular.
 * @param {any[]} items
 * @param {string} [sourceName]
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBatchResults(items, sourceName = 'batch') {
  if (!Array.isArray(items)) {
    return { valid: false, errors: [`${sourceName}: Sonuçlar bir dizi olmalıdır.`] }
  }

  const errors = []
  const seenWords = new Set()

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const res = validateClassificationItem(item, `${sourceName}[${i}]`)
    if (!res.valid) {
      errors.push(res.error)
    } else {
      if (seenWords.has(item.w)) {
        errors.push(`${sourceName}: '${item.w}' kelimesi aynı partide mükerrer.`)
      }
      seenWords.add(item.w)
    }
  }

  return { valid: errors.length === 0, errors }
}

// CLI
if (
  process.argv[1] &&
  (process.argv[1].endsWith('validate-results.mjs') || process.argv[1].includes('validate-results'))
) {
  const targetDir = process.argv[2]
  if (!targetDir || !fs.existsSync(targetDir)) {
    console.error('Kullanım: node validate-results.mjs <dizin-veya-dosya>')
    process.exit(1)
  }

  const stat = fs.statSync(targetDir)
  let allValid = true

  if (stat.isFile()) {
    const data = JSON.parse(fs.readFileSync(targetDir, 'utf-8'))
    const res = validateBatchResults(data, path.basename(targetDir))
    if (!res.valid) {
      console.error(`❌ Hatalar (${res.errors.length}):`, res.errors)
      allValid = false
    } else {
      console.log(`✅ ${data.length} kayıt geçerli şemaya uygun.`)
    }
  } else {
    const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'))
    console.log(`🔍 ${files.length} JSON dosyası taranıyor: ${targetDir}`)
    for (const file of files) {
      const p = path.join(targetDir, file)
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
      const res = validateBatchResults(data, file)
      if (!res.valid) {
        console.error(`❌ ${file} (${res.errors.length} hata):`, res.errors.slice(0, 5))
        allValid = false
      }
    }
    if (allValid) console.log(`✅ Tüm dosyalar şemaya uygun.`)
  }

  if (!allValid) process.exit(1)
}
