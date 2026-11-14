/**
 * LİNGO v2 — Parti Oluşturucu (Make Batches)
 * SPEC-v2 Bölüm 4.7-C, 4.7-D
 *
 * Aday kelimeleri <= 80 kelimelik partilere böler.
 * Alfabetik yanlılığı önlemek için parti içi sıra rastgeledir (deterministik tohumla).
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getVerifiedKolayWords } from './kolay-words.mjs'
import { getVerifiedOrtaWords } from './orta-words.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const DATA_SRC = path.join(ROOT, 'data-src')
const BATCH_DIR = path.join(DATA_SRC, 'level-work/batches')

const BATCH_SIZE = 80

// Basit deterministik PRNG (Mulberry32)
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

export function generateBatches(seed = 42) {
  const kolay = getVerifiedKolayWords()
  const orta = getVerifiedOrtaWords(kolay)

  const evidencePath = path.join(DATA_SRC, 'level-evidence.jsonl')
  const lines = fs
    .readFileSync(evidencePath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(l => JSON.parse(l))
  const evMap = new Map(lines.map(e => [e.w, e]))

  // Aday kelimeler: Kolay veya Orta olarak belirlenmiş tüm kelimeler
  const candidateWords = []
  for (const w of kolay) {
    if (evMap.has(w)) candidateWords.push(evMap.get(w))
  }
  for (const w of orta) {
    if (evMap.has(w)) candidateWords.push(evMap.get(w))
  }

  // Rastgele karıştır (alfabetik yanlılık olmasın)
  const shuffled = shuffle(candidateWords, seed)

  if (!fs.existsSync(BATCH_DIR)) {
    fs.mkdirSync(BATCH_DIR, { recursive: true })
  }

  const batches = []
  for (let i = 0; i < shuffled.length; i += BATCH_SIZE) {
    const batchItems = shuffled.slice(i, i + BATCH_SIZE)
    const batchId = Math.floor(i / BATCH_SIZE) + 1
    const filename = `batch_${String(batchId).padStart(3, '0')}.json`
    const filePath = path.join(BATCH_DIR, filename)

    fs.writeFileSync(filePath, JSON.stringify(batchItems, null, 2), 'utf-8')
    batches.push({ batchId, count: batchItems.length, filename })
  }

  console.log(
    `✅ ${candidateWords.length} aday kelime ${batches.length} partiye (parti boyutu <= ${BATCH_SIZE}) bölündü.`
  )
  return batches
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith('make-batches.mjs') || process.argv[1].includes('make-batches'))
) {
  generateBatches()
}
