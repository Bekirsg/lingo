/**
 * seviye-duzeltmeleri.csv'yi düzelten script
 * Hatalı otomatik düzeltmeleri geri alır, kendi değerlendirmemi uygular
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_SRC = path.join(ROOT, 'data-src')

// Mevcut level-decisions (M2 kararları - temel referans)
const decs = new Map()
fs.readFileSync(path.join(DATA_SRC, 'level-decisions.csv'), 'utf-8')
  .replace(/^\uFEFF/, '').split('\n').filter(r => r.trim()).slice(1)
  .forEach(r => { const p = r.split(';'); if (parseInt(p[1]) === 4) decs.set(p[0], p[3]) })

// Mevcut seviye-duzeltmeleri.csv (orijinal — M2 öncesi manuel düzeltmeler)
// Bunlar kelime;seviye formatında
// İlk 3 (meme, meni, kaka) = M2 öncesi kullanıcı kararı, koru
const ORIGINAL_USER_CORRECTIONS_4 = new Set(['meme', 'meni', 'kaka'])

// Önceki script'in eklediği otomatik düzeltmeler - hatalı olanları kaldır
// Hatalı (zor yapılan ama kolay/orta olmalı):
const REVERT_TO_M2 = new Set([
  // Frekans var ama yanlış düzeltme
  'adet',   // çok yaygın (100 adet, 500 adet)
  'avlu',   // orta → M2 kararı ne?
  'ayva',   // meyve → kolay
  'elem',   // dert, üzüntü → orta
  'ense',   // boyun arkası → kolay
  'hece',   // dilbilgisi → orta/kolay
  'ilan',   // duyuru → kolay
  'ilim',   // bilim anlamında → orta
  'ilke',   // prensip → orta/kolay
  'imam',   // din görevlisi → orta/kolay
  'logo',   // yaygın → orta
  'omuz',   // anatomi/yaygın → kolay
  'pide',   // ekmek türü → kolay
  'tapu',   // tapu belgesi → orta
  'vaha',   // çöl vahası → orta
  'vefa',   // sadakat → orta
  'veto',   // yaygın kavram → orta
  'yani',   // bağlaç → kolay
  'zeka',   // yaygın → kolay/orta
  'küme',   // grup → orta/kolay
  'bacı',   // kardeş/M2 karar?
])

// Kesin ZOR kalacak (kendi değerlendirmem ile onaylıyorum)
const KEEP_ZOR = new Set([
  'emel',   // edebî isim - zor ✓
  'etap',   // Fransızca, teknik - zor ✓  
  'küfe',   // nadir nesne - zor ✓
  'küre',   // geometri/coğrafya terimi - orta tercih ama zor kabul
  'lobi',   // siyasi terim - orta/zor (zor kabul)
  'neon',   // kimya - zor ✓
  'obez',   // tıp terimi - zor ✓
  'site',   // eskimiş anlamı baskın - zor ✓
  'yalı',   // kıyı evi, nadir - zor ✓
  'köşk',   // nadir mimari - zor ✓
  'çizi',   // teknik - zor ✓
  'boza',   // özel içecek - orta tercih ama zor kabul
])

// Kendi ek düzeltmelerim (M2 kararından farklı olanlar)
// Kolay listesinde gördüğüm yanlışlar:
const MY_CORRECTIONS = [
  // Kolay → Orta (gereksiz kolay etiketlenenler)
  { word: 'ajan',  level: 'orta',   reason: 'İngilizce agent → ajan; günlük ama yabancı kökenli, orta düzey' },
  { word: 'düet',  level: 'zor',    reason: 'Müzik terimi, Fransızca köken, nadir' },
  { word: 'edip',  level: 'zor',    reason: 'Edebî - edip (yazar) = eskimiş/edebî' },
  { word: 'efor',  level: 'orta',   reason: 'İngilizce effort - yaygın ama yabancı' },
  { word: 'filo',  level: 'orta',   reason: 'Denizcilik/askeri, orta düzey' },
  { word: 'fuar',  level: 'orta',   reason: 'Sergi/fuar, günlük ama belirli bağlam' },
  { word: 'hacı',  level: 'orta',   reason: 'Dini bağlam, belirli kesim' },
  { word: 'hobi',  level: 'orta',   reason: 'İngilizce hobby - genç kuşak bilir ama orta' },
  { word: 'jüri',  level: 'orta',   reason: 'Yargı/yarışma terimi - orta' },
  { word: 'kene',  level: 'orta',   reason: 'Hayvan adı, nadir - orta/zor → orta' },
  { word: 'koro',  level: 'orta',   reason: 'Müzik terimi - orta' },
  { word: 'meşe',  level: 'orta',   reason: 'Ağaç türü - orta' },
  { word: 'tüyo',  level: 'zor',    reason: 'Argo - bahis dili' },
  { word: 'uslu',  level: 'orta',   reason: 'Yaygın ama has_any_archaic - orta' },
  { word: 'aziz',  level: 'orta',   reason: 'Hem özel ad hem din terimi - orta' },
  // Zor olup kolay/orta olması gerekenler (zaten kolay var ama kontrol):
  // adet - M2 zor ama ben kolay derim
  { word: 'adet',  level: 'kolay',  reason: 'Çok yaygın (adet almak, birkaç adet) - M2 hatası' },
  { word: 'ense',  level: 'kolay',  reason: 'Boyun arkası - günlük, kolay' },
  { word: 'hece',  level: 'kolay',  reason: 'He-ce: ilkokul seviye kelimesi' },
  { word: 'ilan',  level: 'kolay',  reason: 'Duyuru/ilan - çok yaygın' },
  { word: 'ilke',  level: 'orta',   reason: 'Prensip - orta düzey kavram' },
  { word: 'imam',  level: 'orta',   reason: 'Dini bağlam - orta' },
  { word: 'omuz',  level: 'kolay',  reason: 'Vücut parçası - ilkokul seviye' },
  { word: 'pide',  level: 'kolay',  reason: 'Türk yiyeceği - çok yaygın' },
  { word: 'yani',  level: 'kolay',  reason: 'Bağlaç - en sık kullanılan kelimelerden' },
  { word: 'zeka',  level: 'kolay',  reason: 'Çok yaygın kavram' },
  { word: 'logo',  level: 'orta',   reason: 'İngilizce logo - yaygın ama orta' },
  { word: 'veto',  level: 'orta',   reason: 'Siyasi terim - orta' },
  { word: 'vefa',  level: 'orta',   reason: 'Sadakat/dürüstlük - orta' },
  { word: 'ilim',  level: 'orta',   reason: 'Bilim/fen - Arapça, orta' },
  { word: 'elem',  level: 'orta',   reason: 'Üzüntü/dert - edebî bağlamda, orta' },
  { word: 'tapu',  level: 'orta',   reason: 'Hukuki belge - günlük ama teknik, orta' },
  { word: 'vaha',  level: 'orta',   reason: 'Çöl vahası - orta' },
  { word: 'ayva',  level: 'kolay',  reason: 'Meyve adı - günlük, kolay' },
  { word: 'avlu',  level: 'orta',   reason: 'İç bahçe - orta' },
  { word: 'küme',  level: 'orta',   reason: 'Grup/küme - orta' },
  { word: 'bacı',  level: 'orta',   reason: 'Kız kardeş (ağız) - orta' },
]

// Yeni düzeltmeler dosyası oluştur
// Orijinal kullanıcı düzeltmelerini koru (meme, meni, kaka + diğerleri)
const finalDuz = []
finalDuz.push('kelime;seviye')

// Orijinal M2-öncesi kullanıcı düzeltmeleri (hepsi 4-harf olmayan da var)
const originalUserDuz = [
  'orospu;zor', 'fahişe;zor', 'kaltak;zor', 'manyak;zor', 'seksi;zor',
  'pezevenk;zor', 'sıçmak;zor', 'taşak;zor', 'porno;zor', 'erotik;zor',
  'orgazm;zor', 'vajina;zor', 'penis;zor', 'meme;zor', 'meni;zor',
  'bakir;zor', 'bakire;zor', 'nonoş;zor', 'boynuzlu;zor', 'kaka;zor', 'kamış;zor'
]
finalDuz.push(...originalUserDuz)

// Kendi düzeltmelerimi ekle
MY_CORRECTIONS.forEach(c => finalDuz.push(`${c.word};${c.level}`))

// KEEP_ZOR listesindekiler (decs'e göre farklı ise düzelt)
for (const word of KEEP_ZOR) {
  const m2Level = decs.get(word)
  if (m2Level !== 'zor') {
    finalDuz.push(`${word};zor`)
  }
  // M2 zaten zor diyorsa eklemeye gerek yok
}

// Dosyaya yaz
fs.writeFileSync(path.join(DATA_SRC, 'seviye-duzeltmeleri.csv'), finalDuz.join('\n') + '\n', 'utf-8')
console.log('seviye-duzeltmeleri.csv yeniden yazıldı:', finalDuz.length - 1, 'düzeltme')

// Tahmin edilen yeni dağılım
const newDist = { kolay: 0, orta: 0, zor: 0 }
const myDuzMap = new Map()
finalDuz.slice(1).forEach(r => { const p = r.split(';'); if (p[0]?.trim()) myDuzMap.set(p[0].trim(), p[1]?.trim()) })
for (const [w, m2lv] of decs) {
  const finalLv = myDuzMap.get(w) || m2lv
  newDist[finalLv]++
}
console.log('Yeni tahmin dağılımı:', JSON.stringify(newDist))
console.log('Önceki (M2):', JSON.stringify({ kolay: 472, orta: 240, zor: 1337 }))

// Benim düzeltmelerimin M2'den farkı
const changed = MY_CORRECTIONS.filter(c => decs.get(c.word) !== c.level)
console.log('\nM2\'den farklı olan düzeltmelerim:', changed.length)
changed.forEach(c => console.log(` ${c.word}: ${decs.get(c.word)} → ${c.level} (${c.reason})`))
