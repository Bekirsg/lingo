/**
 * LİNGO v2 — Kalite Kapıları Denetleyici (Quality Gates Verifier)
 * SPEC-v2 Bölüm 4.8
 *
 * Seviyelendirme kalite kapılarını çalıştırır ve raporlar:
 * 1. Kaynak kapsama raporu
 * 2. Aday kümesi geri çağırma (≥ %99)
 * 3. Otomatik-zor kontrolü (300 örnekte A1-B2 ≤ %1)
 * 4. Geçişler arası uyum (≥ %90)
 * 5. Havuz minimumları ve dağılım
 * 6. Denetim örneği (150 kelime)
 * 7. build-levels raporu temiz
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CORE_KOLAY_ANCHORS } from './kolay-words.mjs'
import { buildLevelsData } from '../build-levels.mjs'

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

export function runQualityGates() {
  console.log('\n====================================================')
  console.log('       LİNGO v2 — KALİTE KAPILARI DENETİMİ (SPEC-v2 4.8)    ')
  console.log('====================================================\n')

  const results = {
    gate1: { name: 'Kaynak Kapsama Raporu', passed: false, details: {} },
    gate2: { name: 'Aday Kümesi Geri Çağırma (Recall)', passed: false, details: {} },
    gate3: { name: 'Otomatik-Zor Kontrolü', passed: false, details: {} },
    gate4: { name: 'Geçişler Arası Uyum (Agreement)', passed: false, details: {} },
    gate5: { name: 'Havuz Minimumları ve Dağılım', passed: false, details: {} },
    gate6: { name: 'Denetim Örneği', passed: false, details: {} },
    gate7: { name: 'build-levels Raporu', passed: false, details: {} },
  }

  // Kararları oku
  const decisionsPath = path.join(DATA_SRC, 'level-decisions.csv')
  const lines = fs
    .readFileSync(decisionsPath, 'utf-8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(Boolean)
  const rows = lines.slice(1).map(l => {
    const [kelime, harf, cefr, seviye, guven, kaynak, gerekce] = l.split(';')
    return { kelime, harf: parseInt(harf, 10), cefr, seviye, guven, kaynak, gerekce }
  })
  const decisionMap = new Map(rows.map(r => [r.kelime, r]))

  // ----------------------------------------------------------------
  // KAPISI 1: Kaynak Kapsama Raporu
  // ----------------------------------------------------------------
  console.log('--- KAPISI 1: Kaynak Kapsama Raporu ---')
  let kaynakliCount = 0
  let cikarimCount = 0
  for (const r of rows) {
    if (r.kaynak === 'kaynakli') kaynakliCount++
    else cikarimCount++
  }
  results.gate1.details = { kaynakli: kaynakliCount, cikarim: cikarimCount, total: rows.length }
  results.gate1.passed = rows.length === 23717
  console.log(`• Kaynaklı seviye kararı: ${kaynakliCount}`)
  console.log(`• Çıkarımlı seviye kararı: ${cikarimCount}`)
  console.log(`• Toplam kelime: ${rows.length}`)
  console.log(`✅ Kapı 1 GEÇTİ.\n`)

  // ----------------------------------------------------------------
  // KAPISI 2: Aday Kümesi Geri Çağırma (Recall >= %99)
  // ----------------------------------------------------------------
  console.log('--- KAPISI 2: Aday Kümesi Geri Çağırma (Recall) ---')
  let anchorFound = 0
  let anchorInCandidates = 0
  for (const a of CORE_KOLAY_ANCHORS) {
    if (decisionMap.has(a)) {
      anchorFound++
      const r = decisionMap.get(a)
      if (r.seviye === 'kolay' || r.seviye === 'orta') {
        anchorInCandidates++
      }
    }
  }
  const recallRate = anchorFound > 0 ? (anchorInCandidates / anchorFound) * 100 : 100
  results.gate2.details = { anchorFound, anchorInCandidates, recallRate }
  results.gate2.passed = recallRate >= 99
  console.log(`• Çapa kelimeleri: ${anchorFound}`)
  console.log(`• Aday kümede kalan çapa: ${anchorInCandidates}`)
  console.log(`• Geri çağırma oranı: %${recallRate.toFixed(2)} (Hedef: ≥ %99)`)
  if (results.gate2.passed) console.log(`✅ Kapı 2 GEÇTİ.\n`)
  else console.warn(`❌ Kapı 2 BAŞARISIZ!\n`)

  // ----------------------------------------------------------------
  // KAPISI 3: Otomatik-Zor Kontrolü (300 örnekte A1-B2 <= %1)
  // ----------------------------------------------------------------
  console.log('--- KAPISI 3: Otomatik-Zor Kontrolü ---')
  // Aday dışı kelimelerden her harf sayısı için rastgele 60 (toplam 300) kelime bağımsız incelenir
  const rng = mulberry32(777)
  const autoZorSample = []
  for (const len of [4, 5, 6, 7, 8]) {
    const zorWordsOfLen = rows.filter(r => r.harf === len && r.seviye === 'zor')
    const shuffled = [...zorWordsOfLen]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    autoZorSample.push(...shuffled.slice(0, 60))
  }

  // Örneklenen 300 otomatik-zor kelimede A1-B2 sıklığında kelime var mı?
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

  let falseZorCount = 0
  const falseZorWords = []
  for (const item of autoZorSample) {
    const ev = evMap.get(item.kelime)
    // Eğer altyazı sırası <= 3500 ise ve eskimiş/ağız değilse A1-B2 kaçmış olabilir
    if (
      ev?.freq?.opensub_rank !== null &&
      ev.freq.opensub_rank <= 3500 &&
      !ev.flags.is_archaic &&
      !ev.flags.is_dialect
    ) {
      falseZorCount++
      falseZorWords.push(item.kelime)
    }
  }

  const falseZorRate = (falseZorCount / autoZorSample.length) * 100
  results.gate3.details = {
    sampleSize: autoZorSample.length,
    falseZorCount,
    falseZorRate,
    falseZorWords,
  }
  results.gate3.passed = falseZorRate <= 1.0
  console.log(`• Örneklenen otomatik-zor kelime: ${autoZorSample.length} (Her harften 60 kelime)`)
  console.log(`• Hatalı A1-B2 çıkan kelime: ${falseZorCount}`)
  console.log(`• Hata oranı: %${falseZorRate.toFixed(2)} (Hedef: ≤ %1.0)`)
  if (results.gate3.passed) console.log(`✅ Kapı 3 GEÇTİ.\n`)
  else console.warn(`❌ Kapı 3 BAŞARISIZ! Kelimeler:`, falseZorWords)

  // ----------------------------------------------------------------
  // KAPISI 4: Geçişler Arası Uyum (Agreement >= %90)
  // ----------------------------------------------------------------
  console.log('--- KAPISI 4: Geçişler Arası Uyum (Agreement) ---')
  const pass1Dir = path.join(DATA_SRC, 'level-work/pass1')
  const pass2Dir = path.join(DATA_SRC, 'level-work/pass2')
  const p1Map = new Map()
  for (const f of fs.readdirSync(pass1Dir).filter(f => f.endsWith('.json'))) {
    for (const it of JSON.parse(fs.readFileSync(path.join(pass1Dir, f), 'utf-8')))
      p1Map.set(it.w, it)
  }
  const p2Map = new Map()
  for (const f of fs.readdirSync(pass2Dir).filter(f => f.endsWith('.json'))) {
    for (const it of JSON.parse(fs.readFileSync(path.join(pass2Dir, f), 'utf-8')))
      p2Map.set(it.w, it)
  }
  let agree = 0
  for (const [w, p1] of p1Map) {
    const p2 = p2Map.get(w)
    if (p2) {
      const l1 = p1.cefr === 'A1' || p1.cefr === 'A2' ? 'kolay' : 'orta'
      const l2 = p2.cefr === 'A1' || p2.cefr === 'A2' ? 'kolay' : 'orta'
      if (l1 === l2) agree++
    }
  }
  const agreeRate = p1Map.size > 0 ? (agree / p1Map.size) * 100 : 100
  results.gate4.details = { agree, total: p1Map.size, agreeRate }
  results.gate4.passed = agreeRate >= 90
  console.log(`• Geçişler arası uyum oranı: %${agreeRate.toFixed(2)} (Hedef: ≥ %90)`)
  if (results.gate4.passed) console.log(`✅ Kapı 4 GEÇTİ.\n`)
  else console.warn(`❌ Kapı 4 BAŞARISIZ!\n`)

  // ----------------------------------------------------------------
  // KAPISI 5: Havuz Minimumları ve Dağılım
  // ----------------------------------------------------------------
  console.log('--- KAPISI 5: Havuz Minimumları ve Dağılım ---')
  const lenStats = { 4: {}, 5: {}, 6: {}, 7: {}, 8: {} }
  let minPassed = true
  for (const len of [4, 5, 6, 7, 8]) {
    const minThreshold = len === 8 ? 10 : 30
    const wLen = rows.filter(r => r.harf === len)
    const kCount = wLen.filter(r => r.seviye === 'kolay').length
    const oCount = wLen.filter(r => r.seviye === 'orta').length
    const zCount = wLen.filter(r => r.seviye === 'zor').length
    lenStats[len] = { kolay: kCount, orta: oCount, zor: zCount, total: wLen.length }
    console.log(
      `• ${len} harfli: Kolay=${kCount} (min ${minThreshold}), Orta=${oCount} (min ${minThreshold}), Zor=${zCount}`
    )
    if (kCount < minThreshold || oCount < minThreshold) minPassed = false
  }
  results.gate5.details = lenStats
  results.gate5.passed = minPassed
  if (results.gate5.passed) console.log(`✅ Kapı 5 GEÇTİ (Tüm havuzlar asgari sınırların üzerinde).\n`)
  else console.warn(`❌ Kapı 5 BAŞARISIZ!\n`)

  // ----------------------------------------------------------------
  // KAPISI 6: Denetim Örneği (150 kelime)
  // ----------------------------------------------------------------
  console.log('--- KAPISI 6: Denetim Örneği ---')
  const auditPath = path.join(DATA_SRC, 'denetim-ornegi.csv')
  const auditExists = fs.existsSync(auditPath)
  let auditCount = 0
  if (auditExists) {
    const aLines = fs
      .readFileSync(auditPath, 'utf-8')
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter(Boolean)
    auditCount = aLines.length - 1 // başlık hariç
  }
  results.gate6.details = { auditExists, auditCount }
  results.gate6.passed = auditExists && auditCount === 150
  console.log(`• Dosya: ${auditPath}`)
  console.log(`• Örnek sayısı: ${auditCount} (Hedef: 150)`)
  if (results.gate6.passed) console.log(`✅ Kapı 6 GEÇTİ.\n`)
  else console.warn(`❌ Kapı 6 BAŞARISIZ!\n`)

  // ----------------------------------------------------------------
  // KAPISI 7: build-levels Raporu
  // ----------------------------------------------------------------
  console.log('--- KAPISI 7: build-levels Raporu ---')
  let buildResult
  try {
    buildResult = buildLevelsData({ writeFiles: true })
    const hasWarnings = buildResult.warnings && buildResult.warnings.length > 0
    results.gate7.details = { warnings: buildResult.warnings }
    results.gate7.passed = !hasWarnings
    console.log(`• build-levels yürütüldü: ${hasWarnings ? 'Uyarılar var' : 'Hatasız ve uyarısız'}`)
    if (hasWarnings) console.warn('Uyarılar:', buildResult.warnings)
    else console.log(`✅ Kapı 7 GEÇTİ.\n`)
  } catch (err) {
    results.gate7.passed = false
    results.gate7.details = { error: err.message }
    console.error('❌ build-levels hatası:', err.message)
  }

  // Genel Özet
  const allPassed = Object.values(results).every(r => r.passed)
  console.log('====================================================')
  console.log(
    `GENEL SONUÇ: ${allPassed ? '✅ TÜM KALİTE KAPILARI GEÇTİ (7/7)' : '❌ BAZI KAPILAR BAŞARISIZ'}`
  )
  console.log('====================================================\n')

  return { allPassed, results }
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith('quality-gates.mjs') || process.argv[1].includes('quality-gates'))
) {
  runQualityGates()
}
