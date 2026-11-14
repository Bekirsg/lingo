/**
 * LİNGO v2 — Güvenli Morfolojik Lemma Birleştirme ve Tematik Çapalar
 * SPEC-v2 Bölüm 4.7 & Rev. 4 Güncellemesi
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const RAW_DIR = path.join(ROOT, 'scripts/raw-data')

function normalize(s) {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
    .trim()
}

// (a) KÜFÜR, CİNSEL, AŞAĞILAYICI SÖZCÜKLER (Kolay ve Orta'dan kesin dışlananlar)
export const BLOCKLIST_HARSH = new Set([
  'boktan', 'boklu', 'ibne', 'puşt', 'göt', 'kahpe', 'ulan', 'cünüp', 'zina',
  'orospu', 'fahişe', 'kaltak', 'manyak', 'pezevenk', 'sıçmak', 'taşak', 'porno',
  'erotik', 'orgazm', 'vajina', 'penis', 'meme', 'meni', 'bakir', 'bakire', 'nonoş',
  'boynuzlu', 'kaka', 'kamış'
])

// (b) İNANÇ / ALKOL / ŞİDDET / DİĞER (Dışlanmayan, normal seviyelendirmeye dönenler)
export const BLOCKLIST_RELEASED = [
  'allah', 'tanrı', 'cehennem', 'bira', 'şarap', 'rakı', 'esrar',
  'cinayet', 'ceset', 'tecavüz', 'lanet', 'ahmak', 'aptal', 'aptalca',
  'ahbap', 'yahu', 'şişko', 'haç'
]

// (c) KİŞİ ADI, YER ADI, BOY ADI KÖKENLİ MADDELER (Kolay ve Orta'dan kesin dışlanıp Zor'a aktarılanlar)
export const PROPER_NAMES = new Set([
  // Kullanıcı zorunlu listesi (18)
  'tolga', 'kerem', 'kazım', 'nazım', 'özden', 'ilhan', 'irfan', 'izzet', 'erkan', 'yavuz',
  'burhan', 'coşkun', 'düzce', 'balkan', 'arslan', 'çelebi', 'oğuz', 'elif',
  // Madde 1 ek kişi / yer / boy adları
  'hülya', 'ihsan', 'hikmet', 'levent', 'serhat', 'turgay', 'hidayet', 'topbaş', 'denktaş',
  'çubukçu', 'samsun', 'karaman', 'menderes', 'muharrem', 'bozkurt', 'adem', 'selim', 'acar',
  'murat', 'hakan'
])

// (d) YAŞAYAN MODERN ANLAMI OLAN VE ORTA'YA ÇIKABİLEN KELİMELER (SPEC-v2 4.7 Madde 2)
export const MODERN_MEANING_EXCEPTIONS = new Set([
  'şahane', 'nihai', 'sıska', 'şerif', 'erimek', 'doruk', 'buzul'
])

// 4-8 harfli, havuzda bulunan onaylanmış tematik çapa kelimeleri (2-3 harfliler ayıklanmıştır)
export const VALID_THEMATIC_ANCHORS = new Set([
  // Vücut Organları (17)
  'ağız', 'ayak', 'bacak', 'bilek', 'boyun', 'burun', 'çene', 'dudak', 'göğüs',
  'karın', 'kulak', 'omuz', 'parmak', 'sırt', 'topuk', 'yanak', 'yürek',
  // Yiyecek & İçecek (30)
  'armut', 'biber', 'çilek', 'domates', 'ekmek', 'elma', 'havuç', 'ıspanak', 'kabak',
  'karpuz', 'kavun', 'kiraz', 'limon', 'makarna', 'marul', 'patates', 'peynir',
  'pirinç', 'portakal', 'reçel', 'salata', 'soğan', 'tavuk', 'üzüm', 'yoğurt',
  'yumurta', 'zeytin', 'çorba', 'balık', 'şeker',
  // Giyim & Eşya (16)
  'atkı', 'ayakkabı', 'ceket', 'çanta', 'çorap', 'eldiven', 'etek', 'gömlek',
  'kaban', 'kazak', 'kemer', 'kravat', 'pantolon', 'şapka', 'şort', 'terlik',
  // Ev, Mobilya & Mutfak (28)
  'anahtar', 'ayna', 'bardak', 'bıçak', 'çatal', 'çarşaf', 'dolap', 'fırın',
  'halı', 'havlu', 'kaşık', 'kapı', 'koltuk', 'lamba', 'masa', 'merdiven',
  'ocak', 'perde', 'sabun', 'sandalye', 'sehpa', 'tabak', 'tarak', 'tava',
  'tencere', 'yastık', 'yatak', 'yorgan',
  // Sayılar & Zaman (26)
  'sıfır', 'altı', 'yedi', 'sekiz', 'dokuz', 'yirmi', 'otuz', 'kırk', 'elli',
  'altmış', 'yetmiş', 'seksen', 'doksan', 'milyon', 'sabah', 'öğle', 'akşam',
  'gece', 'bugün', 'yarın', 'hafta', 'mevsim', 'bahar', 'saat', 'dakika', 'saniye',
  // Temel Fiiller (66)
  'açmak', 'almak', 'anlamak', 'aramak', 'atmak', 'bakmak', 'basmak', 'başlamak',
  'beklemek', 'bilmek', 'bitmek', 'bulmak', 'çalışmak', 'çıkmak', 'dinlemek',
  'doğmak', 'doymak', 'durmak', 'duymak', 'düşmek', 'düşünmek', 'geçmek',
  'gelmek', 'getirmek', 'girmek', 'gitmek', 'görmek', 'gülmek', 'içmek',
  'istemek', 'izlemek', 'kaçmak', 'kalmak', 'kapatmak', 'kesmek', 'korkmak',
  'koşmak', 'koymak', 'konuşmak', 'okumak', 'olmak', 'oturmak', 'oynamak',
  'öğrenmek', 'öğretmek', 'ölmek', 'pişirmek', 'satmak', 'sevmek', 'sormak',
  'söylemek', 'susmak', 'taşımak', 'tutmak', 'uyumak', 'uzanmak', 'vermek',
  'vurmak', 'yakmak', 'yapmak', 'yaşamak', 'yatmak', 'yazmak', 'yemek',
  'yıkamak', 'yürümek', 'yüzmek'
])

// Homonim İsim Kökleri (fiil kökü olarak taranırken isim çekimleriyle çarpışma riski taşıyanlar)
const NOUN_HOMONYMS = new Set([
  'yar', 'ha', 'kat', 'don', 'koy', 'saç', 'yaz', 'güz', 'yüz', 'kaz', 'ben', 'diz', 'göz', 'kol', 'kır', 'sol', 'sağ', 'boy', 'çay', 'yağ', 'dal', 'can', 'el', 'dil', 'bel', 'yol', 'baş', 'ay', 'ak', 'kara', 'al'
])

// Fiil masdarları için katı çekim regex'i
function createVerbPattern(root, isMek) {
  let softRoot = root
  if (root === 'git') softRoot = 'gid'
  else if (root === 'et') softRoot = 'ed'
  else if (root === 'tat') softRoot = 'tad'
  else if (root === 'dit') softRoot = 'did'

  if (NOUN_HOMONYMS.has(root)) {
    const r = root === softRoot ? root : `(?:${root}|${softRoot})`
    return new RegExp(`^${r}(?:iyor|ıyor|uyor|üyor|ece[kğ]|aca[kğ]|d[ıiduü][kmn]?|t[ıiduü][kmn]?|m[ıiuü]ş(?:t[ıiuü])?|en|an|erek|arak)$`)
  } else {
    const r = root === softRoot ? root : `(?:${root}|${softRoot})`
    return new RegExp(`^${r}(?:[iıuü]yor|[iıuü]yordu|[iıuü]yormuş|d[ıiduü][kmn]?|t[ıiduü][kmn]?|m[ıiuü]ş|[ea]ce[kğ]|[ea]r|[iıuü]r|[ea]n|[ea]rek|[iıuü]p|[ea]lim|sin|sinler)$`)
  }
}

let cachedLemmaCounts = null

/**
 * Fiil masdarlarının yüzey biçim frekanslarını köke toplayarak döndürür.
 * @returns {Map<string, number>} word -> totalEffectiveCount
 */
export function getVerbLemmaCounts() {
  if (cachedLemmaCounts) return cachedLemmaCounts

  const openSubPath = path.join(RAW_DIR, 'opensubtitles-50k.txt')
  if (!fs.existsSync(openSubPath)) return new Map()

  const subLines = fs.readFileSync(openSubPath, 'utf-8').split(/\r?\n/)
  const subMap = new Map()
  for (const line of subLines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split(' ')
    const w = normalize(parts[0])
    const count = parseInt(parts[1], 10) || 0
    if (!subMap.has(w)) {
      subMap.set(w, count)
    }
  }

  const result = new Map()

  // Sadece TDK'da masdar olan (-mek / -mak) kelimeler için
  for (const [w, count] of subMap.entries()) {
    result.set(w, count)
  }

  // Havuzdaki kelimeleri tara
  const words4 = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/words-4.json'), 'utf-8'))
  const words5 = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/words-5.json'), 'utf-8'))
  const words6 = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/words-6.json'), 'utf-8'))
  const words7 = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/words-7.json'), 'utf-8'))
  const bonusPath = fs.existsSync(path.join(ROOT, 'public/data/bonus.json'))
    ? path.join(ROOT, 'public/data/bonus.json')
    : path.join(ROOT, 'public/data/bonus-8.json')
  const words8 = JSON.parse(fs.readFileSync(bonusPath, 'utf-8')).map(b => b.w)
  const allPool = [...words4, ...words5, ...words6, ...words7, ...words8]

  for (const w of allPool) {
    if ((w.endsWith('mek') || w.endsWith('mak')) && w !== 'hamak' && w !== 'tarak' && w !== 'börek' && w !== 'çelenk') {
      const isMek = w.endsWith('mek')
      const root = w.slice(0, -3)
      if (root.length < 2) continue

      const pat = createVerbPattern(root, isMek)
      let baseCount = subMap.get(w) || 0
      let conjCount = 0

      for (const [subW, count] of subMap.entries()) {
        if (subW === w) continue
        if (root === 'yar' && (subW === 'yardım' || subW === 'yardim')) continue
        if (root === 'kaz' && (subW === 'kazan' || subW === 'kaza')) continue
        if (pat.test(subW)) {
          conjCount += count
        }
      }

      result.set(w, baseCount + conjCount)
    }
  }

  cachedLemmaCounts = result
  return result
}
