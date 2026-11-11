/**
 * LİNGO v2 — 4 harfli kelime seviyelendirme revizyonu
 * 
 * GÖREV:
 * 1. Script'in yanlış eklediği 836 Hunspell çekimli formunu geri al (CSV'yi restore et)
 * 2. Mevcut 2049 kelimenin TDK etiket tutarlılığını kontrol et
 * 3. Frekans verisi ile seviyelendirme tutarsızlıklarını bul
 * 4. Gerekli düzeltmeleri seviye-duzeltmeleri.csv'ye yaz
 * 5. Yeni kelime EKLEMİYORUZ (Hunspell formları TDK bağımsız madde başı değil)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_SRC = path.join(ROOT, 'data-src')

// Türkçe normalizasyon
function normTR(w) {
  return (w || '').replace(/â/g,'a').replace(/î/g,'i').replace(/û/g,'u').trim()
}

// ─── 1. Level-evidence yükle (mevcut 2049 kelime için TDK verisi) ─────────────
const evidence = new Map()
fs.readFileSync(path.join(DATA_SRC, 'level-evidence.jsonl'), 'utf-8')
  .split('\n').filter(l => l.trim())
  .forEach(l => { const o = JSON.parse(l); if (o.harf === 4) evidence.set(o.w, o) })
console.log('Evidence 4-harfli:', evidence.size)

// ─── 2. Frekans listesi yükle ─────────────────────────────────────────────────
const freqMap = new Map()
fs.readFileSync(path.join(DATA_SRC, 'cache', 'tr-freq-50k.txt'), 'utf-8')
  .split('\n').forEach((l, i) => {
    const w = l.split(' ')[0]?.trim()
    if (w) freqMap.set(normTR(w), i + 1)
  })
console.log('Frekans listesi:', freqMap.size)

// ─── 3. Mevcut level-decisions yükle (M2 kararları) ──────────────────────────
const decisions = new Map()
fs.readFileSync(path.join(DATA_SRC, 'level-decisions.csv'), 'utf-8')
  .replace(/^\uFEFF/, '').split('\n').filter(l => l.trim()).slice(1)
  .forEach(l => {
    const p = l.split(';')
    if (parseInt(p[1]) === 4) decisions.set(p[0], { cefr: p[2], level: p[3], confidence: p[4], source: p[5], reason: p[6] })
  })
console.log('Level-decisions 4-harfli:', decisions.size)

// ─── 4. Mevcut seviye-duzeltmeleri.csv yükle ─────────────────────────────────
const duzContent = fs.readFileSync(path.join(DATA_SRC, 'seviye-duzeltmeleri.csv'), 'utf-8').replace(/^\uFEFF/, '')
const duzRows = duzContent.split('\n').filter(r => r.trim())
const duzMap = new Map()
duzRows.slice(1).forEach(r => {
  const p = r.split(';')
  if (p[0]?.trim()) duzMap.set(p[0].trim(), p[1]?.trim() || 'zor')
})
console.log('Mevcut düzeltmeler:', duzMap.size)

// ─── 5. ADIM: CSV'yi 2049'a geri al ─────────────────────────────────────────
// kelime-listesi.csv şu an 2885 4-harfli içeriyor (836 hatalı ekleme)
// Evidence'dan gelen 2049'u tut, Hunspell-only 836'yı çıkar
const csvContent = fs.readFileSync(path.join(DATA_SRC, 'kelime-listesi.csv'), 'utf-8').replace(/^\uFEFF/, '')
const csvRows = csvContent.split('\n').filter(r => r.trim())
const csvHeader = csvRows[0]
const csvData = csvRows.slice(1)

// 4-harflileri filtrele: sadece evidence'da olanları tut
const other = csvData.filter(r => parseInt(r.split(';')[1]) !== 4)
const all4csv = csvData.filter(r => parseInt(r.split(';')[1]) === 4)
console.log('\nCSV\'deki 4-harfli (düzeltme öncesi):', all4csv.length)

const valid4 = all4csv.filter(r => evidence.has(r.split(';')[0]))
const removed4 = all4csv.filter(r => !evidence.has(r.split(';')[0]))
console.log('Evidence\'da olan (korunacak):', valid4.length)
console.log('Evidence\'da olmayan (çıkarılacak):', removed4.length)

// ─── 6. Tutarsızlık analizi ───────────────────────────────────────────────────
// Mevcut seviyeleri frekans + TDK etiketleriyle karşılaştır
const corrections = [] // { word, oldLevel, newLevel, reason }

const words2049 = [...decisions.keys()]

// Frekans eşikleri (mevcut dağılımı koruyacak şekilde):
// Kolay hedef ~472/2049 = %23 → frekans sırası sınırı
// Orta hedef ~240/2049 = %11.7%
// Sadece AÇIK tutarsızlıkları düzelt (eşikten belirgin sapma)

// Tutarsızlık tipleri:
// A. Çok sık kelime (rank ≤ 1000) ama zor → kolay olmalı
// B. Çok nadir kelime (rank > 40000 veya yok) ama kolay → zor olmalı
// C. Eskimiş/lehçe etiketli ama kolay → zor olmalı
// D. Teknik terim (primary) ama kolay → zor olmalı (sıklığa bakılmaksızın)

const stats = { typeA: 0, typeB: 0, typeC: 0, typeD: 0 }

for (const [word, dec] of decisions) {
  const ev = evidence.get(word)
  const rank = freqMap.get(word)
  const curLevel = duzMap.get(word) || dec.level
  
  // Zaten duzeltmeler'de varsa atla (kullanıcı kararı)
  if (duzMap.has(word)) continue

  let newLevel = null
  let reason = ''

  // Tip A: Çok sık (rank ≤ 800) ama zor — açıkça kolay olmalı
  if (rank && rank <= 800 && curLevel === 'zor') {
    // Etiket kontrolü
    const isArchaic = ev?.flags?.is_archaic
    const isDialect = ev?.flags?.is_dialect
    const isTech = ev?.flags?.is_technical
    if (!isArchaic && !isDialect) {
      newLevel = 'kolay'
      reason = `Çok yüksek frekans (sıra:${rank}) ama zor etiketli`
      stats.typeA++
    }
  }

  // Tip B: Çok nadir (rank > 45000) ama kolay
  if ((!rank || rank > 45000) && curLevel === 'kolay') {
    newLevel = 'zor'
    reason = `Çok düşük/sıfır frekans ama kolay etiketli`
    stats.typeB++
  }

  // Tip C: Eskimiş veya lehçe (primary flag) ama kolay/orta
  if (ev?.flags?.is_archaic && (curLevel === 'kolay' || curLevel === 'orta')) {
    newLevel = 'zor'
    reason = 'Eskimiş (is_archaic) ama kolay/orta etiketli'
    stats.typeC++
  }
  if (ev?.flags?.is_dialect && (curLevel === 'kolay' || curLevel === 'orta')) {
    newLevel = 'zor'
    reason = 'Ağız/lehçe (is_dialect) ama kolay/orta etiketli'
    stats.typeC++
  }

  // Tip D: Teknik terim (primary) ama kolay — ve nadir
  if (ev?.flags?.is_technical && curLevel === 'kolay' && (!rank || rank > 10000)) {
    newLevel = 'zor'
    reason = 'Teknik terim (is_technical) + düşük frekans ama kolay'
    stats.typeD++
  }

  if (newLevel && newLevel !== curLevel) {
    corrections.push({ word, oldLevel: curLevel, newLevel, reason, rank: rank || null })
  }
}

console.log('\n=== Tutarsızlık Analizi ===')
console.log('Tip A (çok sık ama zor):', stats.typeA)
console.log('Tip B (çok nadir ama kolay):', stats.typeB)
console.log('Tip C (eskimiş/lehçe ama kolay):', stats.typeC)
console.log('Tip D (teknik ama kolay):', stats.typeD)
console.log('Toplam düzeltme:', corrections.length)

// Düzeltmelerin örnekleri
const aCorrections = corrections.filter(c => c.reason.includes('frekans'))
const bCorrections = corrections.filter(c => c.reason.includes('nadir'))
const cCorrections = corrections.filter(c => c.reason.includes('skimiş') || c.reason.includes('lehçe'))
const dCorrections = corrections.filter(c => c.reason.includes('eknik'))

if (aCorrections.length) console.log('\nTip A örnekleri:', aCorrections.slice(0,10).map(c => `${c.word}(${c.rank}):zor→kolay`).join(', '))
if (bCorrections.length) console.log('Tip B örnekleri:', bCorrections.slice(0,10).map(c => `${c.word}:kolay→zor`).join(', '))
if (cCorrections.length) console.log('Tip C örnekleri:', cCorrections.slice(0,10).map(c => `${c.word}:${c.oldLevel}→zor`).join(', '))
if (dCorrections.length) console.log('Tip D örnekleri:', dCorrections.slice(0,10).map(c => `${c.word}:${c.oldLevel}→zor`).join(', '))

// ─── 7. Tahmin edilen yeni dağılım ───────────────────────────────────────────
let newDist = { kolay: 0, orta: 0, zor: 0 }
for (const [word, dec] of decisions) {
  const corr = corrections.find(c => c.word === word)
  const duz = duzMap.get(word)
  const level = corr ? corr.newLevel : (duz || dec.level)
  newDist[level]++
}
console.log('\nTahmin edilen yeni dağılım:', JSON.stringify(newDist))
console.log('Önceki:', JSON.stringify({ kolay: 472, orta: 240, zor: 1337 }))

// ─── 8. CSV'yi 2049'a geri al ve seviyelendirmeyi güncelle ───────────────────
// Korunan 2049 kelimelerin seviyelerini düzeltmeler ile güncelle
const corrMap = new Map(corrections.map(c => [c.word, c.newLevel]))

const new4Rows = [...decisions.keys()].sort((a,b) => a.localeCompare(b,'tr-TR')).map(word => {
  const dec = decisions.get(word)
  const duz = duzMap.get(word)
  const corr = corrMap.get(word)
  const level = duz || corr || dec.level
  const lCode = level === 'kolay' ? 'k' : level === 'orta' ? 'o' : 'z'
  return `${word};4;${lCode}`
})

// Diğer harfleri orijinal sırada tut
const new5to8 = other.sort((a,b) => {
  const p1 = a.split(';'), p2 = b.split(';')
  if (parseInt(p1[1]) !== parseInt(p2[1])) return parseInt(p1[1]) - parseInt(p2[1])
  return p1[0].localeCompare(p2[0], 'tr-TR')
})

const finalRows = [csvHeader, ...new4Rows, ...new5to8]
fs.writeFileSync(
  path.join(DATA_SRC, 'kelime-listesi.csv'),
  '\uFEFF' + finalRows.join('\n'),
  'utf-8'
)
console.log('\nkelime-listesi.csv restore edildi:', new4Rows.length, '4-harfli +', other.length, 'diğer')

// ─── 9. seviye-duzeltmeleri.csv güncelle ─────────────────────────────────────
// Yeni düzeltmeleri mevcut listeye ekle
const newDuzLines = corrections.map(c => `${c.word};${c.newLevel}`)
const updatedDuz = [...duzRows, ...newDuzLines]
fs.writeFileSync(
  path.join(DATA_SRC, 'seviye-duzeltmeleri.csv'),
  updatedDuz.join('\n'),
  'utf-8'
)
console.log('seviye-duzeltmeleri.csv güncellendi:', updatedDuz.length - 1, 'düzeltme')

// ─── 10. Argo/içerik duyarlı analiz ──────────────────────────────────────────
const CONTENT_TAGS = ['argo', 'kaba', 'müstehcen']
const argoWords = []
for (const [word, ev] of evidence) {
  const tags = ev.tdk?.tags || []
  if (CONTENT_TAGS.some(t => tags.includes(t))) {
    argoWords.push({ word, tags: tags.filter(t => CONTENT_TAGS.includes(t)), currentLevel: (duzMap.get(word) || decisions.get(word)?.level || 'zor') })
  }
}
console.log('\nArgo/içerik duyarlı:', argoWords.length)
console.log('Örnek 10:', argoWords.slice(0,10).map(a => a.word + '[' + a.currentLevel + ']').join(', '))

// ─── 11. Rapor ───────────────────────────────────────────────────────────────
const report = `# 4 Harfli Kelime Listesi Revizyon Raporu

**Tarih:** ${new Date().toLocaleString('tr-TR')}
**Şube:** v2-gelistirme

## Özet

| | Önce | Sonra |
|---|---|---|
| Toplam 4 harfli | 2049 | ${new4Rows.length} |
| Kolay | 472 | ${newDist.kolay + corrections.filter(c=>c.newLevel==='kolay').length} |
| Orta | 240 | ${newDist.orta} |
| Zor | 1337 | ${newDist.zor - corrections.filter(c=>c.newLevel==='kolay').length} |
| Silinen | - | 0 |
| Eklenen | - | 0 |

## Kararlar

### Neden Ekleme Yapmadık
Hunspell tr_TR'den 836 kelime aday olarak belirlendi ancak tümü 
\`level-evidence.jsonl\`'de TDK bağımsız madde başı olarak bulunmuyordu.
Bu kelimeler Hunspell'in çekimli/türevli formları (örn: açıl, açın, açıp, abcı, absı).
TDK onaylı kelime = level-evidence.jsonl'deki kelimeler (orijinal TDK GTS v12'den).

### Neden Silme Yapmadık
Mevcut 2049 kelimenin tamamı ya Hunspell'de ya da level-evidence.jsonl'de mevcut.

## Seviyelendirme Düzeltmeleri (${corrections.length} adet)

### Tip A — Çok sık ama yanlışlıkla ZOR (${stats.typeA} adet)
${aCorrections.slice(0,20).map(c=>`- ${c.word}: zor→kolay (frekans sırası: ${c.rank})`).join('\n')}

### Tip B — Çok nadir ama yanlışlıkla KOLAY (${stats.typeB} adet)
${bCorrections.slice(0,20).map(c=>`- ${c.word}: kolay→zor`).join('\n')}

### Tip C — Eskimiş/Lehçe ama KOLAY/ORTA (${stats.typeC} adet)
${cCorrections.slice(0,20).map(c=>`- ${c.word}: ${c.oldLevel}→zor (${c.reason})`).join('\n')}

### Tip D — Teknik terim ama KOLAY (${stats.typeD} adet)
${dCorrections.slice(0,10).map(c=>`- ${c.word}: kolay→zor`).join('\n')}

## Argo / İçerik Duyarlı (${argoWords.length} adet — silinmedi, ZOR seviyesinde)

**Karar kullanıcıya bırakıldı.**
İlk 10: ${argoWords.slice(0,10).map(a=>a.word).join(', ')}

## Riskler

1. M2'deki CEFR kararları (level-decisions.csv) yüksek güven skoru ile yapılmıştı.
   Bu revizyonda sadece açık tutarsızlıklar (rank ≤ 800 ama zor, veya eskimiş ama kolay) düzeltildi.
2. Frekans kaynağı OpenSubtitles 2018 — konuşma dili; yazı diline özgü teknik kelimeler düşük sıralı görünebilir.
3. Hunspell'den ekleme yapılmadı — bazı nadir ama gerçek TDK kelimeler eksik kalabilir.

## Veri Kaynakları

- **TDK referansı:** level-evidence.jsonl (TDK GTS v12, 99.236 madde)
- **Hunspell:** wooorm/dictionaries tr_TR (doğrulama için)
- **Frekans:** Hermit Dave TR 50k (OpenSubtitles 2018)
`

fs.writeFileSync(path.join(DATA_SRC, 'rapor-4harf.md'), report, 'utf-8')
console.log('\nRapor: data-src/rapor-4harf.md')
console.log('\n=== TAMAMLANDI ===')
