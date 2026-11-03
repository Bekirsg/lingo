/**
 * LİNGO v2 — Kelime Listesi Dışa Aktarma Betiği (CSV)
 * SPEC-v2 Bölüm 4.4
 *
 * `public/data/words-4..7.json` ve `bonus-8.json` dosyalarından
 * `data-src/kelime-listesi.csv` dosyasını üretir:
 * - UTF-8 BOM (\uFEFF)
 * - Ayırıcı: ';' (noktalı virgül)
 * - Sütunlar: kelime;harf;seviye
 * - Sıralama: harf sayısı (4, 5, 6, 7, 8), ardından tr-TR alfabetik
 * - `seviye` sütunu boş bırakılır.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

/**
 * Verilen harf gruplarından CSV içeriğini üretir.
 */
export function generateCsvContent(wordsByLength) {
  const BOM = '\uFEFF'
  const header = 'kelime;harf;seviye\r\n'
  const lines = [header]

  const lengths = [4, 5, 6, 7, 8]
  for (const len of lengths) {
    const list = wordsByLength[len] || []
    // Türkçe alfabetik sıralama
    const sorted = [...list].sort((a, b) => a.localeCompare(b, 'tr-TR'))
    for (const w of sorted) {
      lines.push(`${w};${len};\r\n`)
    }
  }

  return BOM + lines.join('')
}

/**
 * words JSON dosyalarından kelimeleri okuyup data-src/kelime-listesi.csv dosyasını yazar.
 */
export function exportLevelSheet(options = {}) {
  const publicDir = options.publicDir || path.join(ROOT_DIR, 'public', 'data')
  const outDir = options.outDir || path.join(ROOT_DIR, 'data-src')

  const wordsByLength = {
    4: JSON.parse(fs.readFileSync(path.join(publicDir, 'words-4.json'), 'utf-8')),
    5: JSON.parse(fs.readFileSync(path.join(publicDir, 'words-5.json'), 'utf-8')),
    6: JSON.parse(fs.readFileSync(path.join(publicDir, 'words-6.json'), 'utf-8')),
    7: JSON.parse(fs.readFileSync(path.join(publicDir, 'words-7.json'), 'utf-8')),
    8: (() => {
      const bonus = JSON.parse(fs.readFileSync(path.join(publicDir, 'bonus-8.json'), 'utf-8'))
      const set = new Set(bonus.map(b => b.w))
      return Array.from(set)
    })(),
  }

  const counts = {
    4: wordsByLength[4].length,
    5: wordsByLength[5].length,
    6: wordsByLength[6].length,
    7: wordsByLength[7].length,
    8: wordsByLength[8].length,
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  const csv = generateCsvContent(wordsByLength)
  const filePath = path.join(outDir, 'kelime-listesi.csv')
  fs.writeFileSync(filePath, csv, 'utf-8')

  return { counts, total, filePath }
}

// Doğrudan çalıştırıldığında (CLI)
if (process.argv[1] && (path.resolve(process.argv[1]).toLowerCase() === __filename.toLowerCase() || path.basename(process.argv[1]) === 'export-level-sheet.mjs')) {
  try {
    console.log('[LİNGO v2] kelime-listesi.csv üretiliyor...')
    const res = exportLevelSheet()
    console.log(`✅ Başarıyla üretildi: ${res.filePath}`)
    console.log(`• 4 harfli: ${res.counts[4]}`)
    console.log(`• 5 harfli: ${res.counts[5]}`)
    console.log(`• 6 harfli: ${res.counts[6]}`)
    console.log(`• 7 harfli: ${res.counts[7]}`)
    console.log(`• 8 harfli (bonus): ${res.counts[8]}`)
    console.log(`Toplam: ${res.total} kelime`)
  } catch (err) {
    console.error('❌ Hata:', err)
    process.exit(1)
  }
}
