/**
 * 5 Harfli Kelime Listesi Revizyon Scripti
 * 
 * Strateji:
 * - M2 kararları baz alınır
 * - is_archaic=true → Zor (hepsi zaten Zor olmalı)
 * - is_dialect=true → Zor
 * - Kolay'da olup frekans sırası > 20000 ve etiket temiz → Orta değerlendir (elle inceleme listesi)
 * - Zor'da olup frekans sırası < 2000 ve etiket temiz → Orta/Kolay değerlendir
 * - Belirli elle yapılan düzeltmeler
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_SRC = path.join(ROOT, 'data-src')

// Evidence yükle
const evMap = new Map()
fs.readFileSync(path.join(DATA_SRC, 'level-evidence.jsonl'), 'utf-8')
  .split('\n').filter(Boolean)
  .forEach(l => { try { const o = JSON.parse(l); if (o.harf === 5) evMap.set(o.w, o); } catch {} })

// CSV yükle
const csvPath = path.join(DATA_SRC, 'kelime-listesi.csv')
const csvContent = fs.readFileSync(csvPath, 'utf-8')
const hasBOM = csvContent.startsWith('\uFEFF')
const csvLines = csvContent.replace(/^\uFEFF/, '').split(/\r?\n/)
const csvMap = new Map()
csvLines.slice(1).forEach(l => {
  const p = l.split(';'); if (p[1] === '5') csvMap.set(p[0], p[2])
})

// Frekans yükle
const freqMap = new Map()
fs.readFileSync(path.join(DATA_SRC, 'cache/tr-freq-50k.txt'), 'utf-8')
  .split('\n').filter(Boolean)
  .forEach((l, i) => { const w = l.split(' ')[0]?.trim(); if (w) freqMap.set(w, i + 1) })

// Mevcut seviye-duzeltmeleri.csv (mevcut 5-harf düzeltmeleri koru)
const duzPath = path.join(DATA_SRC, 'seviye-duzeltmeleri.csv')
const duzContent = fs.readFileSync(duzPath, 'utf-8')
const existingDuz = duzContent.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
// Sadece 5 harf olmayanları koru
const nonFiveDuz = existingDuz.filter((l, i) => {
  if (i === 0) return true // header
  const word = l.split(';')[0]?.trim()
  return word && word.length !== 5
})

console.log('Evidence 5-harf:', evMap.size)
console.log('CSV 5-harf:', csvMap.size)
console.log('Mevcut duz (5-harf olmayan):', nonFiveDuz.length - 1)

// ============================================================
// DÜZELTME KURALLARI
// ============================================================

// 1. ELLE DÜZELTMELER - benim değerlendirmem
// Kolay → Orta: M2'de Kolay ama bağlamsal/spesifik
const KOLAY_TO_ORTA = [
  // Özel isim kullanımı baskın (hem ad hem sıfat/isim ama özel isim çağrışımı güçlü)
  'fatih', // Fatih Sultan Mehmet → oyuncu şehir adı ile karışır
  'recep',  // Recep Tayyip Erdoğan → isim olarak biliniyor, kelime olarak daha az
  'cihan',  // özel isim çağrışımı güçlü
  // Sofistike/edebî kavramlar
  'divan',  // Osmanlı edebiyatı - orta
  'nimet',  // dini bağlam - orta
  'misal',  // "misal vermek" - Arapça köken, orta
  'namaz',  // dini bağlam, belirli kesim - orta
  'erdem',  // özel isim + soyut kavram - orta
  'heves',  // A2-B1 sınırı - orta
  'sözcü',  // spesifik meslek/rol - orta
  'koşul',  // soyut kavram - orta
  'turne',  // spesifik bağlam (konser turu) - orta
  'dekor',  // spesifik bağlam - orta
  'maket',  // spesifik - orta
  'levha',  // nadir günlük - orta
  'sofra',  // has_any_dialect, bağlamsal - orta
  'panel',  // spesifik bağlam - orta
  'bulgu',  // teknik/akademik - orta
  'etken',  // teknik - orta
  'yalın',  // has_any_dialect, orta
  'bando',  // müzik terimi - orta
  'damak',  // anatomi/gastronomi - orta
  'kavun',  // frekans düşük, basit meyve ama bağlamsal - orta (frekans 26k)
  'demet',  // özel isim + demet (buket) - orta
  'çimen',  // frekans düşük - orta
  'uygar',  // soyut kavram - orta
  'kebap',  // yemek ama freq 34k - orta
  'sucuk',  // yemek ama freq 42k - orta
  'vurgu',  // teknik (dilbilgisi) + genel - orta
  'eğmek',  // nadir fiil - orta
  'emmek',  // nadir/kaba ima - orta
  'kiler',  // spesifik alan - orta
  'tarak',  // kolay ama freq 30k - orta
  'marul',  // sebze ama freq 30k - orta
  'bekçi',  // spesifik meslek - orta
  'besin',  // teknik/sağlık - orta
  'beyan',  // resmi/hukuki - orta
  'artış',  // soyut - orta
  'aşmak',  // soyut fiil anlamı baskın - orta
  'armut',  // frekans 18k - orta (meyve ama konuşmada az geçiyor)
  'anmak',  // nadir fiil - orta
  'abone',  // özel bağlam - orta
  'yanak',  // kolay ama freq 41k - orta
  'oynak',  // nadir sıfat - orta
  'çoğul',  // dilbilgisi terimi - orta
  'köken',  // soyut - orta
  'aydın',  // özel isim çağrışımı güçlü + sıfat - orta
  'kurak',  // spesifik - orta
]

// Kolay → Zor: Açıkça yanlış seviyede
const KOLAY_TO_ZOR = [
  // Frekansı çok düşük, nadir veya arkaik
  'donma', // has_any_archaic yok ama freq 48k, nadir
]

// Zor → Orta: Zor ama aslında B1-B2 bilinen kelimeler
const ZOR_TO_ORTA = [
  // Günlük yaygın kelimeler, frekansı yüksek, etiket temiz
  'insan', // temel kelime
  'çocuk', // temel kelime
  'kadın', // temel kelime  
  'erkek', // temel kelime
  'büyük', // temel sıfat
  'küçük', // temel sıfat
  'güzel', // temel sıfat
  'yemek', // temel eylem/isim
  'içmek', // temel eylem
  'gelmek', // temel eylem - 6 harf, skip
  'olmak', // temel eylem
  'almak', // temel eylem
  'vermek', // temel eylem
  'bakmak', // temel eylem
  'gelir', // gelir (income) - yaygın
  'şimdi', // zaman zarfı - çok yaygın
  'sonra', // zaman zarfı - çok yaygın
  'önce',  // 4 harf - skip
  'kadar', // yaygın
  'bütün', // yaygın sıfat
  'kendi', // zamir - çok yaygın
  'yerde', // zarfı
  'üzere', // yaygın
  'ancak', // yaygın bağlaç
  'çünkü', // yaygın bağlaç
  'hatta', // yaygın bağlaç
  'yoksa', // yaygın
  'sanki', // yaygın
  'belki', // yaygın
  'zaten', // yaygın
  'artık', // yaygın
  'birçok', // 6 harf - skip
  'çeşit', // yaygın
  'öteki', // yaygın
  'şeker', // yaygın
  'ekmek', // yaygın
  'çanta', // yaygın
  'kitap', // yaygın
  'okul',  // 4 harf - skip
  'yüzük', // yaygın
  'tablo', // yaygın
  'müzik', // yaygın
  'sanat', // yaygın
  'spor',  // 4 harf - skip
  'piknik', // 6 harf - skip
  'kahve', // yaygın
  'çilek', // yaygın
  'meyve', // yaygın
  'balık', // yaygın
  'kuşak', // yaygın (nesil)
  'öteki', // yaygın
  'yabancı', // 7 harf - skip
  'gerçek', // 6 harf - skip
  'sabah', // yaygın
  'akşam', // yaygın
  'gece',  // 4 harf - skip
  'hafta', // yaygın
  'yazın', // yaygın
  'kışın', // yaygın
  'ilkbahar', // 8 harf - skip
  'mevsim', // 6 harf - skip
  'rüzgar', // 6 harf - skip
  'yağmur', // 6 harf - skip
  'güneş', // yaygın
  'deniz', // yaygın
  'dağlar', // 6+ harf - skip
  'orman', // yaygın
  'köyde', // çekim - skip
  'şehir', // yaygın
  'sokak', // yaygın
  'cadde', // yaygın
  'köprü', // yaygın
  'uçak',  // 4 harf - skip
  'tren',  // 4 harf - skip
  'araba', // yaygın
  'seyahat', // 7 harf - skip
  'tatil', // yaygın
  'otel',  // 4 harf - skip
  'resmi', // yaygın sıfat
  'özel',  // 4 harf - skip
  'başka', // yaygın
  'birinci', // 7+ harf - skip
  'ikinci', // 6 harf - skip
  'ücret', // yaygın
  'fiyat', // yaygın
  'para',  // 4 harf - skip
  'banka', // yaygın
  'çalışmak', // 7+ - skip
  'öğrenci', // 7 harf - skip
  'hasta', // yaygın
  'doktor', // 6 harf - skip
  'ilaç',  // 4 harf - skip
  'ameliyat', // 7+ - skip
  'kural', // yaygın
  'hukuk', // yaygın
  'devlet', // 6 harf - skip
  'siyasi', // 6 harf - skip
  'parti', // yaygın
  'gazete', // 6 harf - skip
  'haber', // yaygın
  'forum', // yaygın
  'fikir', // yaygın
  'düşünce', // 7+ - skip
  'orant', // kontrol et
]

// Sadece 5 harfli olanları filtrele
const ZOR_TO_ORTA_5 = ZOR_TO_ORTA.filter(w => w.length === 5 && csvMap.has(w) && csvMap.get(w) === 'zor')
const ZOR_TO_KOLAY_5 = []

// ZOR listedeki 5 harf olanlardan, frekansı < 1000 ve etiket temiz olanları bul
const zorWords = [...csvMap.entries()].filter(([w,lv]) => lv==='zor' && w.length===5)
const zorHighFreq = zorWords
  .filter(([w]) => {
    const r = freqMap.get(w); const e = evMap.get(w)
    return r && r < 1500 && e && !e.flags.is_archaic && !e.flags.is_dialect
  })
  .map(([w]) => ({ w, rank: freqMap.get(w), flags: evMap.get(w)?.flags }))
  .sort((a,b) => a.rank - b.rank)

console.log('\nZor+freq<1500+temiz etiket:', zorHighFreq.length)
console.log(zorHighFreq.map(o => o.w + ':' + o.rank).join(' '))

// ZOR_TO_KOLAY_5'e frekans < 500 olanları ekle
zorHighFreq.filter(o => o.rank < 500).forEach(o => ZOR_TO_KOLAY_5.push(o.w))
// ZOR_TO_ORTA_5'e frekans 500-1500 olanları ekle (etiket temiz)
const zorToOrtaFromFreq = zorHighFreq.filter(o => o.rank >= 500 && o.rank < 1500).map(o => o.w)

// Birleştir - ZOR_TO_ORTA_5 ile zorToOrtaFromFreq
const allZorToOrta = [...new Set([...ZOR_TO_ORTA_5, ...zorToOrtaFromFreq])]
const allZorToKolay = [...new Set(ZOR_TO_KOLAY_5)]

// KOLAY_TO_ORTA'yı CSV'de gerçekten kolay olanlara kısıtla
const validKolayToOrta = KOLAY_TO_ORTA.filter(w => w.length === 5 && csvMap.has(w) && csvMap.get(w) === 'kolay')
const validKolayToZor = KOLAY_TO_ZOR.filter(w => w.length === 5 && csvMap.has(w) && csvMap.get(w) === 'kolay')

// Çakışma kontrolü
const allChanges = new Map()
validKolayToOrta.forEach(w => allChanges.set(w, 'orta'))
validKolayToZor.forEach(w => allChanges.set(w, 'zor'))
allZorToOrta.forEach(w => allChanges.set(w, 'orta'))
allZorToKolay.forEach(w => allChanges.set(w, 'kolay'))

console.log('\nToplam düzeltme:')
console.log('  kolay→orta:', validKolayToOrta.length)
console.log('  kolay→zor:', validKolayToZor.length)
console.log('  zor→orta:', allZorToOrta.length)
console.log('  zor→kolay:', allZorToKolay.length)
console.log('  Toplam:', allChanges.size)

// Tahmin edilen yeni dağılım
const newDist = { kolay: 0, orta: 0, zor: 0 }
for (const [w, lv] of csvMap) {
  const newLv = allChanges.get(w) || lv
  newDist[newLv]++
}
console.log('\nMevcut dağılım:', JSON.stringify({ kolay: 769, orta: 619, zor: 4061 }))
console.log('Yeni tahmin:', JSON.stringify(newDist))

// seviye-duzeltmeleri.csv'ye ekle
const newDuzLines = [...nonFiveDuz]
for (const [w, lv] of allChanges) {
  newDuzLines.push(`${w};${lv}`)
}

fs.writeFileSync(duzPath, newDuzLines.join('\n') + '\n', 'utf-8')
console.log('\nseviye-duzeltmeleri.csv güncellendi:', newDuzLines.length - 1, 'toplam düzeltme')

// Rapor için değişiklik listesi kaydet
const report = {
  kolayToOrta: validKolayToOrta,
  kolayToZor: validKolayToZor,
  zorToOrta: allZorToOrta,
  zorToKolay: allZorToKolay,
  total: allChanges.size,
  newDist
}
fs.writeFileSync(path.join(DATA_SRC, 'degisiklik-5harf.json'), JSON.stringify(report, null, 2), 'utf-8')
console.log('Değişiklik raporu kaydedildi: data-src/degisiklik-5harf.json')
