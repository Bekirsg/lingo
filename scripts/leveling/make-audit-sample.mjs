/**
 * LİNGO v2 — Denetim Örneği Üretici (Audit Sample Generator)
 * SPEC-v2 Bölüm 4.8-6
 *
 * 150 kelimelik tabakalı örnek üretir:
 * - 50 Kolay (A1-A2)
 * - 50 Orta (B1-B2)
 * - 50 Zor (25'i sınıra yakın / aday eşiğine yakın, 25'i standart)
 *
 * Sütunlar: kelime;harf;seviye;cefr;gerekce;benim_gorusum
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const DATA_SRC = path.join(ROOT, 'data-src')

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function sample(arr, n, seed) {
  const rng = mulberry32(seed)
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

export function generateAuditSample(seed = 42) {
  const decisionsPath = path.join(DATA_SRC, 'level-decisions.csv')
  const content = fs.readFileSync(decisionsPath, 'utf-8').replace(/^\uFEFF/, '')
  const lines = content.split(/\r?\n/).filter(Boolean)

  const rows = lines.slice(1).map(l => {
    const [kelime, harf, cefr, seviye, guven, kaynak, gerekce] = l.split(';')
    return { kelime, harf: parseInt(harf, 10), cefr, seviye, guven, kaynak, gerekce }
  })

  // Evidence dosyasından sınır bilgisi (sıklık sırası) al
  const evPath = path.join(DATA_SRC, 'level-evidence.jsonl')
  const evMap = new Map(
    fs
      .readFileSync(evPath, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map(l => {
        const item = JSON.parse(l)
        return [item.w, item]
      })
  )

  const kolayWords = rows.filter(r => r.seviye === 'kolay')
  const ortaWords = rows.filter(r => r.seviye === 'orta')
  const zorWords = rows.filter(r => r.seviye === 'zor')

  // Zor kelimeler: 25 sınırda (altyazı sırası 16000-35000 arası olanlar), 25 standart
  const borderlineZor = zorWords.filter(r => {
    const ev = evMap.get(r.kelime)
    const rank = ev?.freq?.opensub_rank
    return rank !== null && rank > 16000 && rank <= 35000
  })

  const standardZor = zorWords.filter(r => {
    const ev = evMap.get(r.kelime)
    const rank = ev?.freq?.opensub_rank
    return rank === null || rank > 35000
  })

  const sampleKolay = sample(kolayWords, 50, seed)
  const sampleOrta = sample(ortaWords, 50, seed + 1)
  const sampleBorderlineZor = sample(borderlineZor, 25, seed + 2)
  const sampleStandardZor = sample(standardZor, 25, seed + 3)

  const fullSample = [
    ...sampleKolay,
    ...sampleOrta,
    ...sampleBorderlineZor,
    ...sampleStandardZor,
  ]

  // Türkçe alfabetik sırala
  fullSample.sort((a, b) => a.kelime.localeCompare(b.kelime, 'tr-TR'))

  const header = 'kelime;harf;seviye;cefr;gerekce;benim_gorusum'
  const outRows = fullSample.map(
    s => `${s.kelime};${s.harf};${s.seviye};${s.cefr};${s.gerekce};`
  )

  const outPath = path.join(DATA_SRC, 'denetim-ornegi.csv')
  fs.writeFileSync(outPath, '\uFEFF' + [header, ...outRows].join('\n'), 'utf-8')

  console.log(`✅ 150 kelimelik denetim örneği üretildi: ${outPath}`)
  console.log(
    `• 50 Kolay, 50 Orta, 50 Zor (${sampleBorderlineZor.length} sınıra yakın, ${sampleStandardZor.length} standart)`
  )

  return fullSample
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith('make-audit-sample.mjs') ||
    process.argv[1].includes('make-audit-sample'))
) {
  generateAuditSample()
}
