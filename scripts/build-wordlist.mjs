/**
 * TDK GTS v12 verisinden kelime listesi üretir + çapraz doğrulama yapar.
 *
 * Kaynak 1 (Ana):  ogun/guncel-turkce-sozluk v12 — scripts/raw-data/gts.json
 * Kaynak 2 (Doğr): emrahcom/turkce_kelimeler — scripts/raw-data/imla-kilavuzu.txt
 *
 * Kullanım: node scripts/build-wordlist.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAW_PATH = resolve(__dirname, 'raw-data/gts.json')
const IMLA_PATH = resolve(__dirname, 'raw-data/imla-kilavuzu.txt')
const OUT_DIR = resolve(__dirname, '../public/data')

// ─── Türkçe normalizasyon ───────────────────────────────────────

function turkishLower(s) {
  return s.toLocaleLowerCase('tr-TR')
}

function normalizeHat(s) {
  return s.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
}

function normalize(s) {
  return normalizeHat(turkishLower(s))
}

const VALID_CHARS = /^[a-zçğıöşü]+$/

function isValidWord(s) {
  return VALID_CHARS.test(s)
}

function letterCount(s) {
  return Array.from(s).length
}

// ─── Kaynak 1: TDK GTS v12 ─────────────────────────────────────

console.log('📖 Kaynak 1: TDK GTS v12 verisi okunuyor...')
const rawText = readFileSync(RAW_PATH, 'utf8')

let entries
try {
  entries = JSON.parse(rawText)
  if (!Array.isArray(entries)) throw new Error('not array')
} catch {
  entries = rawText
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line))
}

console.log(`  ✅ ${entries.length} madde okundu`)

// ─── Kaynak 2: İmla Kılavuzu (çapraz doğrulama) ────────────────

console.log('📖 Kaynak 2: TDK İmla Kılavuzu okunuyor...')
const imlaRaw = readFileSync(IMLA_PATH, 'utf8')
const imlaWords = new Set()

for (const line of imlaRaw.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed) continue

  // İmla kılavuzunda ek bilgiler var: "abacılık,-ğı" gibi — virgülden önce al
  const base = trimmed.split(',')[0].trim()

  // Boşluk/tire içerenler birleşik — atla
  if (/[\s\-]/.test(base)) continue

  const norm = normalize(base)
  if (isValidWord(norm)) {
    imlaWords.add(norm)
  }
}

console.log(`  ✅ ${imlaWords.size} geçerli tekil kelime`)

// ─── Filtreleme ────────────────────────────────────────────────

const wordsByLength = { 4: new Set(), 5: new Set(), 6: new Set(), 7: new Set(), 8: new Set() }
const bonus8 = []

let stats = {
  total: entries.length,
  ozelIsim: 0,
  invalid: 0,
  birlesik: 0,
  accepted: 0,
  duplicateAfterNorm: 0,
}

for (const entry of entries) {
  const madde = entry.madde
  if (!madde) continue

  // Özel isimler hariç
  if (entry.ozel_mi === '1' || entry.ozel_mi === 1) {
    stats.ozelIsim++
    continue
  }

  // Birleşik/deyim maddeleri hariç
  if (/[\s\-''`'0-9]/.test(madde)) {
    stats.birlesik++
    continue
  }

  const normalized = normalize(madde)

  if (!isValidWord(normalized)) {
    stats.invalid++
    continue
  }

  const len = letterCount(normalized)

  if (len >= 4 && len <= 8 && wordsByLength[len]) {
    if (wordsByLength[len].has(normalized)) {
      stats.duplicateAfterNorm++
    } else {
      wordsByLength[len].add(normalized)
      stats.accepted++

      if (len === 8) {
        const definition = extractDefinition(entry, normalized)
        if (definition) {
          bonus8.push({ w: normalized, d: definition })
        }
      }
    }
  }
}

// ─── Tanım çıkarma (SPEC 5.3) ──────────────────────────────────

function extractDefinition(entry, normalizedWord) {
  const anlamlar = entry.anlamlarListe
  if (!anlamlar || !Array.isArray(anlamlar) || anlamlar.length === 0) return null

  for (const anlam of anlamlar) {
    let def = anlam.anlam
    if (!def) continue
    def = def.trim()

    // "Bkz." yönlendirmelerini atla
    if (/^bkz\b/i.test(def)) continue

    // "►" ile başlayan kısa yönlendirmeleri atla (bunlar da bkz. niteliğinde)
    if (def.startsWith('►')) continue

    // Çok kısa tanımları atla
    if (def.length < 5) continue

    // Cevabı sızdıran tanım kontrolü
    const defLower = turkishLower(def)
    const wordLower = normalizedWord

    // Tanım cevabın kendisini içeriyor mu?
    if (defLower.includes(wordLower)) continue

    // Tanım cevabın kökünü (ilk 5 harfi) paylaşan bir sözcük içeriyor mu?
    if (wordLower.length >= 5) {
      const root = wordLower.substring(0, 5)
      const defTokens = defLower.split(/[^a-zçğıöşü]+/)
      if (defTokens.some(t => t.startsWith(root))) continue
    }

    return def
  }

  return null
}

// ─── Çıktıları yaz ─────────────────────────────────────────────

console.log('\n📊 Kelime sayıları (Kaynak 1 — GTS v12, filtre sonrası):')
for (const len of [4, 5, 6, 7, 8]) {
  console.log(`  ${len} harfli: ${wordsByLength[len].size}`)
}
console.log(`  8 harfli (tanımlı bonus): ${bonus8.length}`)

console.log('\n📊 Filtreleme istatistikleri:')
console.log(`  Toplam madde: ${stats.total}`)
console.log(`  Özel isim (elendi): ${stats.ozelIsim}`)
console.log(`  Birleşik/deyim (elendi): ${stats.birlesik}`)
console.log(`  Geçersiz karakter (elendi): ${stats.invalid}`)
console.log(`  Normalizasyon sonrası tekrar: ${stats.duplicateAfterNorm}`)
console.log(`  Kabul edilen (4-8 harf): ${stats.accepted}`)

// JSON dosyalarını yaz
for (const len of [4, 5, 6, 7]) {
  const sorted = [...wordsByLength[len]].sort((a, b) => a.localeCompare(b, 'tr-TR'))
  writeFileSync(resolve(OUT_DIR, `words-${len}.json`), JSON.stringify(sorted))
  console.log(`\n✅ words-${len}.json yazıldı (${sorted.length} kelime)`)
}

const bonusSorted = bonus8.sort((a, b) => a.w.localeCompare(b.w, 'tr-TR'))
writeFileSync(resolve(OUT_DIR, 'bonus-8.json'), JSON.stringify(bonusSorted))
console.log(`✅ bonus-8.json yazıldı (${bonusSorted.length} kelime+tanım)`)

// ─── Çapraz doğrulama ──────────────────────────────────────────

console.log('\n\n═══════════════════════════════════════════════')
console.log('🔄 ÇAPRAZ DOĞRULAMA: GTS v12 vs İmla Kılavuzu')
console.log('═══════════════════════════════════════════════')

for (const len of [4, 5, 6, 7]) {
  const gtsSet = wordsByLength[len]
  let inBoth = 0
  let onlyGts = 0
  let onlyImla = 0

  for (const w of gtsSet) {
    if (imlaWords.has(w)) inBoth++
    else onlyGts++
  }

  // İmla kılavuzunda olup GTS'de olmayan (aynı uzunluktaki)
  for (const w of imlaWords) {
    if (letterCount(w) === len && !gtsSet.has(w)) onlyImla++
  }

  const overlap = gtsSet.size > 0 ? ((inBoth / gtsSet.size) * 100).toFixed(1) : '0'
  console.log(`\n  ${len} harfli:`)
  console.log(`    GTS: ${gtsSet.size} | İmla: (${len} harfli filtreli)`)
  console.log(`    Her ikisinde: ${inBoth} | Sadece GTS: ${onlyGts} | Sadece İmla: ${onlyImla}`)
  console.log(`    Örtüşme oranı: %${overlap}`)
}

// Rastgele 20 kelimeyi TDK İmla'da kontrol
console.log('\n\n🔍 Rastgele 20 kelime × İmla Kılavuzu doğrulaması:')
const allWords4to7 = []
for (const len of [4, 5, 6, 7]) {
  for (const w of wordsByLength[len]) allWords4to7.push(w)
}
const sampleCheck = []
const sampledIdx = new Set()
while (sampleCheck.length < 20 && sampleCheck.length < allWords4to7.length) {
  const idx = Math.floor(Math.random() * allWords4to7.length)
  if (!sampledIdx.has(idx)) {
    sampledIdx.add(idx)
    sampleCheck.push(allWords4to7[idx])
  }
}
let foundInImla = 0
for (const w of sampleCheck) {
  const found = imlaWords.has(w)
  if (found) foundInImla++
  console.log(`  "${w}" → İmla'da ${found ? '✅ VAR' : '⚠️ YOK (GTS\'ye özgü olabilir)'}`)
}
console.log(`  Sonuç: ${foundInImla}/20 kelime (%${((foundInImla / 20) * 100).toFixed(0)}) İmla Kılavuzu'nda da mevcut`)

// ─── Duman testi ────────────────────────────────────────────────

console.log('\n\n═════════════════════')
console.log('🔍 DUMAN TESTİ')
console.log('═════════════════════')

const smokeIn = ['kale', 'küpe', 'araba', 'kitap']
const smokeOut = ['kalemi', 'xyzq']

let smokePass = true
for (const w of smokeIn) {
  const len = letterCount(w)
  const found = wordsByLength[len]?.has(w) ?? false
  const ok = found
  if (!ok) smokePass = false
  console.log(`  "${w}" (${len} harf) listede VAR mı? ${ok ? '✅ EVET' : '❌ HAYIR — SORUN!'}`)
}

for (const w of smokeOut) {
  const len = letterCount(w)
  const pool = wordsByLength[len]
  const found = pool ? pool.has(w) : false
  const ok = !found
  if (!ok) smokePass = false
  console.log(`  "${w}" (${len} harf) listede YOK mu? ${ok ? '✅ DOĞRU (YOK)' : '❌ SORUN — OLMAMALI!'}`)
}

console.log(`\n  Duman testi: ${smokePass ? '✅ GEÇTİ' : '❌ BAŞARISIZ'}`)

// ─── Her uzunluktan 20 rastgele kelime ──────────────────────────

console.log('\n\n📝 Rastgele örnekler:')
for (const len of [4, 5, 6, 7]) {
  const arr = [...wordsByLength[len]]
  const sample = []
  const usedIdx = new Set()
  while (sample.length < 20 && sample.length < arr.length) {
    const idx = Math.floor(Math.random() * arr.length)
    if (!usedIdx.has(idx)) {
      usedIdx.add(idx)
      sample.push(arr[idx])
    }
  }
  console.log(`  ${len} harfli: ${sample.join(', ')}`)
}

console.log('\n📝 Bonus 8 harfli örnekler (kelime + tanım):')
const bonusSample = []
const usedBonusIdx = new Set()
while (bonusSample.length < 10 && bonusSample.length < bonusSorted.length) {
  const idx = Math.floor(Math.random() * bonusSorted.length)
  if (!usedBonusIdx.has(idx)) {
    usedBonusIdx.add(idx)
    bonusSample.push(bonusSorted[idx])
  }
}
for (const { w, d } of bonusSample) {
  console.log(`  "${w}" → "${d}"`)
}

console.log('\n✅ Kelime listesi üretimi ve doğrulama tamamlandı!')
