/**
 * LİNGO v2 — Seviye Listesi İçe Aktarma Betiği (JSON Üretici)
 * SPEC-v2 Bölüm 4.5
 *
 * `data-src/kelime-listesi.csv` ve varsa `data-src/seviye-duzeltmeleri.csv`
 * dosyalarını okuyarak `public/data/levels-4..8.json` dosyalarını üretir.
 *
 * Kurallar:
 * - Seviye değerleri: kolay (k), orta (o), zor (z). Boş = zor.
 * - Çakışan seviyeler: Hata fırlatılır.
 * - Düzeltmeler: `seviye-duzeltmeleri.csv` en üst önceliğe sahiptir.
 * - Çıktı formatı: { "kolay": [...], "orta": [...] }
 * - Doğrulama: words-N / bonus-8 içinde olmayan kelimeler listelenir (uyarı).
 * - Minimum havuz uyarısı: 4–7 harflide < 30, bonusta < 10 ise uyarı verilir.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

/**
 * Seviye metnini normalize eder ('kolay', 'orta', 'zor').
 * Boş veya eşleşmeyen 'zor' kabul edilir.
 */
export function normalizeLevelValue(raw) {
  if (!raw) return 'zor'
  const s = raw.trim().toLocaleLowerCase('tr-TR')
  if (s === 'k' || s === 'kolay') return 'kolay'
  if (s === 'o' || s === 'orta') return 'orta'
  if (s === 'z' || s === 'zor') return 'zor'
  return 'zor'
}

/**
 * CSV metnini satırlara ve alanlara ayırır (BOM ve \r\n temizlenir).
 */
export function parseCsvRows(csvText) {
  let text = csvText
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1)
  }
  const lines = text.split(/\r?\n/)
  const rows = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const parts = line.split(';').map(p => p.trim())
    rows.push(parts)
  }
  return rows
}

/**
 * Seviye verisini derler ve doğrular.
 */
export function buildLevelsData(options = {}) {
  const dataSrcDir = options.dataSrcDir || path.join(ROOT_DIR, 'data-src')
  const publicDir = options.publicDir || path.join(ROOT_DIR, 'public', 'data')
  const outDir = options.outDir || path.join(ROOT_DIR, 'public', 'data')

  const listPath = path.join(dataSrcDir, 'kelime-listesi.csv')
  const overridePath = path.join(dataSrcDir, 'seviye-duzeltmeleri.csv')

  if (!fs.existsSync(listPath)) {
    throw new Error(`Girdi dosyası bulunamadı: ${listPath}`)
  }

  // Resmi kelime listelerini yükle (doğrulama için)
  const officialWords = {
    4: new Set(JSON.parse(fs.readFileSync(path.join(publicDir, 'words-4.json'), 'utf-8'))),
    5: new Set(JSON.parse(fs.readFileSync(path.join(publicDir, 'words-5.json'), 'utf-8'))),
    6: new Set(JSON.parse(fs.readFileSync(path.join(publicDir, 'words-6.json'), 'utf-8'))),
    7: new Set(JSON.parse(fs.readFileSync(path.join(publicDir, 'words-7.json'), 'utf-8'))),
    8: new Set(
      JSON.parse(fs.readFileSync(path.join(publicDir, 'bonus-8.json'), 'utf-8')).map(b => b.w)
    ),
  }

  const listContent = fs.readFileSync(listPath, 'utf-8')
  const rows = parseCsvRows(listContent)

  // İlk satır başlık mı? (kelime;harf;seviye)
  let startIdx = 0
  if (rows.length > 0 && rows[0][0]?.toLocaleLowerCase('tr-TR') === 'kelime') {
    startIdx = 1
  }

  // Kelimeleri oku ve çakışma kontrolü yap
  // word -> { level: 'kolay'|'orta'|'zor', length: number }
  const wordEntries = new Map()

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i]
    if (row.length < 2) continue
    const word = row[0].toLocaleLowerCase('tr-TR')
    if (!word) continue
    const len = parseInt(row[1], 10) || Array.from(word).length
    const level = normalizeLevelValue(row[2])

    if (wordEntries.has(word)) {
      const existing = wordEntries.get(word)
      if (existing.level !== level) {
        throw new Error(
          `Çakışan seviye hatası: "${word}" için kelime-listesi.csv içinde çakışan seviyeler bulundu: "${existing.level}" vs "${level}" (satır ${i + 1})`
        )
      }
    } else {
      wordEntries.set(word, { word, length: len, level })
    }
  }

  // Düzeltmeler dosyasını (seviye-duzeltmeleri.csv) uygula (en yüksek öncelik)
  let overrideCount = 0
  if (fs.existsSync(overridePath)) {
    const overrideContent = fs.readFileSync(overridePath, 'utf-8')
    const overrideRows = parseCsvRows(overrideContent)
    let oStart = 0
    if (overrideRows.length > 0 && overrideRows[0][0]?.toLocaleLowerCase('tr-TR') === 'kelime') {
      oStart = 1
    }
    for (let i = oStart; i < overrideRows.length; i++) {
      const row = overrideRows[i]
      if (row.length < 2) continue
      const word = row[0].toLocaleLowerCase('tr-TR')
      if (!word) continue
      const level = normalizeLevelValue(row[1])
      if (wordEntries.has(word)) {
        const entry = wordEntries.get(word)
        entry.level = level
        overrideCount++
      } else {
        const len = Array.from(word).length
        wordEntries.set(word, { word, length: len, level })
        overrideCount++
      }
    }
  }

  // Grupla ve doğrula
  const unknownWords = []
  const grouped = {
    4: { kolay: [], orta: [], zor: [] },
    5: { kolay: [], orta: [], zor: [] },
    6: { kolay: [], orta: [], zor: [] },
    7: { kolay: [], orta: [], zor: [] },
    8: { kolay: [], orta: [], zor: [] },
  }

  for (const [word, entry] of wordEntries) {
    const len = entry.length
    if (!grouped[len]) {
      unknownWords.push(`${word} (${len} harfli geçersiz uzunluk)`)
      continue
    }

    // Resmi sözlükte var mı?
    if (!officialWords[len]?.has(word)) {
      unknownWords.push(`${word} (${len} harfli listede bulunamadı)`)
    }

    grouped[len][entry.level].push(word)
  }

  // Her harf sayısı için sırala ve uyarıları topla
  const warnings = []
  const stats = {}

  if (unknownWords.length > 0) {
    warnings.push(`Sözlükte bulunamayan ${unknownWords.length} kelime CSV içinde yer alıyor.`)
  }

  const lengths = [4, 5, 6, 7, 8]
  for (const len of lengths) {
    const g = grouped[len]
    g.kolay.sort((a, b) => a.localeCompare(b, 'tr-TR'))
    g.orta.sort((a, b) => a.localeCompare(b, 'tr-TR'))
    g.zor.sort((a, b) => a.localeCompare(b, 'tr-TR'))

    stats[len] = {
      kolay: g.kolay.length,
      orta: g.orta.length,
      zor: g.zor.length,
      total: g.kolay.length + g.orta.length + g.zor.length,
    }

    // Minimum havuz kontrolü
    const minThreshold = len === 8 ? 10 : 30
    if (g.kolay.length < minThreshold) {
      warnings.push(
        `${len} harfli Kolay havuzu önerilen minimumun (${minThreshold}) altında: ${g.kolay.length} kelime. (Yedek kural devreye girecektir)`
      )
    }
    if (g.orta.length < minThreshold) {
      warnings.push(
        `${len} harfli Orta havuzu önerilen minimumun (${minThreshold}) altında: ${g.orta.length} kelime. (Yedek kural devreye girecektir)`
      )
    }
  }

  // JSON dosyalarını yaz (levels-4..8.json)
  if (options.writeFiles !== false) {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }

    for (const len of lengths) {
      const g = grouped[len]
      const fileData = {
        kolay: g.kolay,
        orta: g.orta,
      }
      const outPath = path.join(outDir, `levels-${len}.json`)
      fs.writeFileSync(outPath, JSON.stringify(fileData), 'utf-8')
    }
  }

  return {
    stats,
    warnings,
    unknownWords,
    overrideCount,
    grouped,
  }
}

// CLI olarak çalıştırıldığında
if (
  process.argv[1] &&
  (path.resolve(process.argv[1]).toLowerCase() === __filename.toLowerCase() ||
    path.basename(process.argv[1]) === 'build-levels.mjs')
) {
  try {
    console.log('[LİNGO v2] Seviye listeleri işleniyor (build-levels)...')
    const res = buildLevelsData()
    console.log('✅ Seviye JSON dosyaları oluşturuldu.')
    console.log('--- İstatistikler ---')
    for (const [len, s] of Object.entries(res.stats)) {
      console.log(
        `• ${len} harfli: Kolay=${s.kolay}, Orta=${s.orta}, Zor=${s.zor} (Toplam: ${s.total})`
      )
    }
    if (res.overrideCount > 0) {
      console.log(`• Uygulanan düzeltme sayısı: ${res.overrideCount}`)
    }
    if (res.warnings.length > 0) {
      console.log('--- Uyarılar ---')
      for (const w of res.warnings) {
        console.warn(`⚠️  ${w}`)
      }
    }
  } catch (err) {
    console.error('❌ Hata:', err.message)
    process.exit(1)
  }
}
