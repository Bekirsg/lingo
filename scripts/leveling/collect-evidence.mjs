/**
 * LİNGO v2 — Kanıt Toplama Betiği (Evidence Collector)
 * SPEC-v2 Bölüm 4.7-B
 *
 * Tüm 23.717 kelime için çoklu derlem frekanslarını, TDK tanımlarını ve etiketlerini
 * `data-src/level-evidence.jsonl` dosyasına yazar.
 */

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const RAW_DIR = path.join(ROOT, 'scripts/raw-data')
const DATA_SRC = path.join(ROOT, 'data-src')

function normalize(s) {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
    .trim()
}

async function loadGts() {
  console.log('📖 TDK GTS v12 yükleniyor...')
  const gtsPath = path.join(RAW_DIR, 'gts.json')
  const rl = readline.createInterface({
    input: fs.createReadStream(gtsPath, { encoding: 'utf-8' }),
  })

  const tdkMap = new Map()

  for await (const line of rl) {
    if (!line) continue
    try {
      const entry = JSON.parse(line)
      if (!entry.madde) continue
      const norm = normalize(entry.madde)
      if (tdkMap.has(norm)) continue // İlk/bağımsız tanım öncelikli

      const anlam = entry.anlamlarListe?.[0]?.anlam || ''
      const tags = new Set()
      if (entry.anlamlarListe && Array.isArray(entry.anlamlarListe)) {
        for (const a of entry.anlamlarListe) {
          if (a.ozelliklerListe && Array.isArray(a.ozelliklerListe)) {
            for (const o of a.ozelliklerListe) {
              if (o.tam_adi) tags.add(o.tam_adi)
            }
          }
        }
      }

      tdkMap.set(norm, {
        anlam: anlam.split(';')[0].trim().slice(0, 150),
        tags: Array.from(tags),
        meanings: parseInt(entry.anlam_say, 10) || 1,
      })
    } catch {
      // Satır hatası varsa atla
    }
  }

  console.log(`  ✅ ${tdkMap.size} TDK kelimesi indekslendi.`)
  return tdkMap
}

function loadOpenSubtitles() {
  console.log('📖 OpenSubtitles 50k sıklık listesi yükleniyor...')
  const filePath = path.join(RAW_DIR, 'opensubtitles-50k.txt')
  const content = fs.readFileSync(filePath, 'utf-8')
  const map = new Map()
  let rank = 1

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split(' ')
    const w = normalize(parts[0])
    const count = parseInt(parts[1], 10) || 0
    if (!map.has(w)) {
      map.set(w, { rank, count })
      rank++
    }
  }

  console.log(`  ✅ ${map.size} altyazı kelimesi indekslendi.`)
  return map
}

function loadZemberek() {
  console.log('📖 Zemberek 10k yazılı sıklık listesi yükleniyor...')
  const filePath = path.join(RAW_DIR, 'zemberek-10k.txt')
  const content = fs.readFileSync(filePath, 'utf-8')
  const map = new Map()
  let rank = 1

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const w = normalize(trimmed)
    if (!map.has(w)) {
      map.set(w, rank)
      rank++
    }
  }

  console.log(`  ✅ ${map.size} Zemberek kelimesi indekslendi.`)
  return map
}

function loadAzer1k() {
  console.log('📖 Azer 1k temel kelime listesi yükleniyor...')
  const filePath = path.join(RAW_DIR, 'azer-1k.js')
  const content = fs.readFileSync(filePath, 'utf-8')
  const set = new Set()
  // module.exports = ["bir", ...]
  const matches = content.match(/"([^"]+)"/g)
  if (matches) {
    for (const m of matches) {
      set.add(normalize(m.replace(/"/g, '')))
    }
  }
  console.log(`  ✅ ${set.size} temel kelime indekslendi.`)
  return set
}

const TECHNICAL_TAGS = new Set([
  'tıp',
  'biyoloji',
  'fizik',
  'kimya',
  'felsefe',
  'jeoloji',
  'zooloji',
  'botanik',
  'anatomi',
  'astronomi',
  'dil bilgisi',
  'matematik',
  'mantık',
  'ruh bilimi',
  'jeomorfoloji',
  'mineraloji',
  'meteoroloji',
  'bilişim',
  'hukuk',
  'denizcilik',
  'mimarlık',
  'ekonomi',
])

async function main() {
  const tdkMap = await loadGts()
  const openSubMap = loadOpenSubtitles()
  const zemberekMap = loadZemberek()
  const azerSet = loadAzer1k()

  console.log('📖 Oyun kelimeleri okunuyor (data-src/kelime-listesi.csv)...')
  const csvPath = path.join(DATA_SRC, 'kelime-listesi.csv')
  const csvLines = fs.readFileSync(csvPath, 'utf-8').split(/\r?\n/)

  const evidenceOutPath = path.join(DATA_SRC, 'level-evidence.jsonl')
  const outStream = fs.createWriteStream(evidenceOutPath, { encoding: 'utf-8' })

  let count = 0
  for (let i = 1; i < csvLines.length; i++) {
    const line = csvLines[i].trim()
    if (!line) continue
    const parts = line.split(';')
    const word = normalize(parts[0])
    const harf = parseInt(parts[1], 10)

    const tdk = tdkMap.get(word) || { anlam: '', tags: [], meanings: 0 }
    const sub = openSubMap.get(word)
    const zemRank = zemberekMap.get(word) || null
    const inAzer = azerSet.has(word)

    const tags = tdk.tags
    const isArchaic = tags.some(t => t.includes('eskimiş') || t === 'eski')
    const isDialect = tags.some(t => t.includes('ağız') || t.includes('halk'))
    const isTechnical = tags.some(t => TECHNICAL_TAGS.has(t))

    const record = {
      w: word,
      harf,
      tdk: {
        anlam: tdk.anlam,
        tags: tdk.tags,
        meanings: tdk.meanings,
      },
      freq: {
        opensub_rank: sub ? sub.rank : null,
        opensub_count: sub ? sub.count : null,
        zemberek_rank: zemRank,
        in_azer_1k: inAzer,
      },
      flags: {
        is_archaic: isArchaic,
        is_dialect: isDialect,
        is_technical: isTechnical,
      },
    }

    outStream.write(JSON.stringify(record) + '\n')
    count++
  }

  outStream.end()
  console.log(`✅ ${count} kelime için kanıt dosyası yazıldı: ${evidenceOutPath}`)
}

main().catch(err => {
  console.error('Hata:', err)
  process.exit(1)
})
