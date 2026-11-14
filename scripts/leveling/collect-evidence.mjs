/**
 * LİNGO v2 — Kanıt Toplama Betiği (Evidence Collector)
 * SPEC-v2 Bölüm 4.7-B
 *
 * Tüm 23.717 kelime için çoklu derlem frekanslarını, TDK GTS v12 tanımlarını
 * (birincil ve tüm anlamlar ayrılarak) ve etiketlerini `data-src/level-evidence.jsonl` dosyasına yazar.
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

      const anlamlar = entry.anlamlarListe || []
      const firstAnlam = anlamlar[0] || {}
      const firstTags = new Set(
        (firstAnlam.ozelliklerListe || []).map(o => o.tam_adi).filter(Boolean)
      )

      const allTags = new Set()
      for (const a of anlamlar) {
        if (a.ozelliklerListe) {
          for (const o of a.ozelliklerListe) {
            if (o.tam_adi) allTags.add(o.tam_adi)
          }
        }
      }

      const firstTagArr = Array.from(firstTags)
      const allTagArr = Array.from(allTags)

      // BİRİNCİL ANLAM BAYRAKLARI
      const isPrimaryArchaic = firstTagArr.some(t => t.includes('eskimiş') || t === 'eski')
      const isPrimaryDialect = firstTagArr.some(t => t.includes('ağız') || t.includes('halk'))
      const isPrimaryTechnical = firstTagArr.some(t => TECHNICAL_TAGS.has(t))

      // TÜM ANLAMLAR BAYRAKLARI
      const hasAnyArchaic = allTagArr.some(t => t.includes('eskimiş') || t === 'eski')
      const hasAnyDialect = allTagArr.some(t => t.includes('ağız') || t.includes('halk'))
      const hasAnyTechnical = allTagArr.some(t => TECHNICAL_TAGS.has(t))

      // TDK normalizasyonunda yaşayan / zengin madde başını tercih et
      if (tdkMap.has(norm)) {
        const existing = tdkMap.get(norm)
        if (existing.is_archaic && !isPrimaryArchaic) {
          // Yeni yaşayan maddeyi tercih et
        } else if (existing.meanings >= parseInt(entry.anlam_say, 10)) {
          continue
        }
      }

      tdkMap.set(norm, {
        anlam: (firstAnlam.anlam || '').split(';')[0].trim().slice(0, 150),
        tags: allTagArr,
        primary_tags: firstTagArr,
        meanings: parseInt(entry.anlam_say, 10) || 1,
        is_primary_archaic: isPrimaryArchaic,
        is_primary_dialect: isPrimaryDialect,
        is_primary_technical: isPrimaryTechnical,
        has_any_archaic: hasAnyArchaic,
        has_any_dialect: hasAnyDialect,
        has_any_technical: hasAnyTechnical,
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
  const matches = content.match(/"([^"]+)"/g)
  if (matches) {
    for (const m of matches) {
      set.add(normalize(m.replace(/"/g, '')))
    }
  }
  console.log(`  ✅ ${set.size} temel kelime indekslendi.`)
  return set
}

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

    const tdk = tdkMap.get(word) || {
      anlam: '',
      tags: [],
      primary_tags: [],
      meanings: 0,
      is_primary_archaic: false,
      is_primary_dialect: false,
      is_primary_technical: false,
      has_any_archaic: false,
      has_any_dialect: false,
      has_any_technical: false,
    }
    const sub = openSubMap.get(word)
    const zemRank = zemberekMap.get(word) || null
    const inAzer = azerSet.has(word)

    const record = {
      w: word,
      harf,
      tdk: {
        anlam: tdk.anlam,
        tags: tdk.tags,
        primary_tags: tdk.primary_tags,
        meanings: tdk.meanings,
      },
      freq: {
        opensub_rank: sub ? sub.rank : null,
        opensub_count: sub ? sub.count : null,
        zemberek_rank: zemRank,
        in_azer_1k: inAzer,
      },
      flags: {
        // G.2 / G.3 gereği birincil anlama bağlı bayraklar:
        is_archaic: tdk.is_primary_archaic,
        is_dialect: tdk.is_primary_dialect,
        is_technical: tdk.is_primary_technical,
        // Bilgi amaçlı tüm anlam bayrakları:
        has_any_archaic: tdk.has_any_archaic,
        has_any_dialect: tdk.has_any_dialect,
        has_any_technical: tdk.has_any_technical,
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
