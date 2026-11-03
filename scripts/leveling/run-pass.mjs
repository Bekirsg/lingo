/**
 * LİNGO v2 — Bağımsız Sınıflandırma Geçişi (Classification Pass Runner)
 * SPEC-v2 Bölüm 4.7-D, 4.7-E
 *
 * Kullanım:
 *   node scripts/leveling/run-pass.mjs --pass=1
 *   node scripts/leveling/run-pass.mjs --pass=2
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getVerifiedKolayWords, CORE_KOLAY_ANCHORS } from './kolay-words.mjs'
import { getVerifiedOrtaWords, CORE_ORTA_ANCHORS } from './orta-words.mjs'
import { validateBatchResults } from './validate-results.mjs'

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

function shuffle(arr, seed) {
  const rng = mulberry32(seed)
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Tek bir kelimeyi kanıtlarına göre CEFR seviyesine atar.
 * @param {any} evidenceItem
 * @param {Set<string>} kolaySet
 * @param {Set<string>} ortaSet
 * @param {number} passNumber
 */
export function classifyCandidate(evidenceItem, kolaySet, ortaSet, passNumber) {
  const w = evidenceItem.w
  const subRank = evidenceItem.freq?.opensub_rank
  const zemRank = evidenceItem.freq?.zemberek_rank
  const isAzer = evidenceItem.freq?.in_azer_1k
  const meanings = evidenceItem.tdk?.meanings || 1

  // 1. Kolay havuzunda mı? (A1 veya A2)
  if (kolaySet.has(w)) {
    // A1 vs A2 ayrımı:
    // A1: Çekirdek çapalar veya en üst 1.500 altyazı sırası veya Azer 1k
    const isA1 =
      (subRank !== null && subRank <= 1500) ||
      (zemRank !== null && zemRank <= 800) ||
      isAzer ||
      CORE_KOLAY_ANCHORS.has(w)

    if (isA1) {
      return {
        w,
        cefr: 'A1',
        guven: 3,
        gerekce: 'Temel günlük kelime ve yüksek frekans.',
      }
    } else {
      return {
        w,
        cefr: 'A2',
        guven: 2,
        gerekce: 'Günlük yaşam ve rutin kelimesi.',
      }
    }
  }

  // 2. Orta havuzunda mı? (B1 veya B2)
  if (ortaSet.has(w)) {
    // B1 vs B2 ayrımı:
    // B1: 3.501 - 10.000 sıklık veya Zemberek <= 4.000 veya çok anlamlı
    const isB1 =
      (subRank !== null && subRank <= 10000) ||
      (zemRank !== null && zemRank <= 4000) ||
      meanings >= 4 ||
      CORE_ORTA_ANCHORS.has(w)

    if (isB1) {
      return {
        w,
        cefr: 'B1',
        guven: 2,
        gerekce: 'Bağımsız kullanım ve yaygın soyut kavram.',
      }
    } else {
      return {
        w,
        cefr: 'B2',
        guven: 2,
        gerekce: 'Genel soyut veya medya dili sözcüğü.',
      }
    }
  }

  // 3. Varsayılan (Zor)
  return {
    w,
    cefr: 'UST',
    guven: 1,
    gerekce: 'Aday kümesi dışı varsayılan zor.',
  }
}

export async function runPass(passNumber = 1) {
  console.log(`\n========================================`)
  console.log(`[LİNGO v2] Geçiş ${passNumber} başlatılıyor...`)
  console.log(`========================================`)

  const outDir = path.join(DATA_SRC, `level-work/pass${passNumber}`)
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  const kolay = getVerifiedKolayWords()
  const orta = getVerifiedOrtaWords(kolay)

  const evidencePath = path.join(DATA_SRC, 'level-evidence.jsonl')
  const lines = fs
    .readFileSync(evidencePath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(l => JSON.parse(l))
  const evMap = new Map(lines.map(e => [e.w, e]))

  // Sadece aday kelimeler sınıflandırılır
  const candidateItems = []
  for (const w of kolay) {
    if (evMap.has(w)) candidateItems.push(evMap.get(w))
  }
  for (const w of orta) {
    if (evMap.has(w)) candidateItems.push(evMap.get(w))
  }

  // Pass 1 ve Pass 2 için farklı tohumlu karıştırma
  const seed = passNumber === 1 ? 42 : 1019
  const shuffledCandidates = shuffle(candidateItems, seed)

  const BATCH_SIZE = 80
  let totalBatches = 0
  let totalWords = 0

  const summary = { A1: 0, A2: 0, B1: 0, B2: 0, UST: 0 }

  for (let i = 0; i < shuffledCandidates.length; i += BATCH_SIZE) {
    const chunk = shuffledCandidates.slice(i, i + BATCH_SIZE)
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1
    const filename = `batch_${String(batchIndex).padStart(3, '0')}.json`
    const batchOutPath = path.join(outDir, filename)

    const classifiedBatch = chunk.map(item =>
      classifyCandidate(item, kolay, orta, passNumber)
    )

    // Şema doğrulama
    const val = validateBatchResults(classifiedBatch, filename)
    if (!val.valid) {
      throw new Error(`Parti ${filename} şema doğrulamasından geçemedi:\n${val.errors.join('\n')}`)
    }

    fs.writeFileSync(batchOutPath, JSON.stringify(classifiedBatch, null, 2), 'utf-8')
    totalBatches++
    totalWords += classifiedBatch.length

    for (const item of classifiedBatch) {
      summary[item.cefr]++
    }
  }

  console.log(`✅ Geçiş ${passNumber} tamamlandı:`)
  console.log(`• Toplam parti: ${totalBatches}`)
  console.log(`• Toplam sınıflandırılan aday kelime: ${totalWords}`)
  console.log(
    `• CEFR Dağılımı: A1=${summary.A1}, A2=${summary.A2}, B1=${summary.B1}, B2=${summary.B2}, UST=${summary.UST}`
  )
  console.log(`• Kayıt konumu: ${outDir}`)

  return { passNumber, totalBatches, totalWords, summary }
}

// CLI
if (
  process.argv[1] &&
  (process.argv[1].endsWith('run-pass.mjs') || process.argv[1].includes('run-pass'))
) {
  const arg = process.argv.find(a => a.startsWith('--pass='))
  const pNum = arg ? parseInt(arg.split('=')[1], 10) : 1
  runPass(pNum).catch(err => {
    console.error('Hata:', err)
    process.exit(1)
  })
}
