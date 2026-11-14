/**
 * LİNGO v2 — Bonus Kelime Havuzu Doğrulayıcı (Aşama 3A)
 * 
 * SPEC-v2 ve docs/KELIME-REVIZYON-PLANI.md standardına uygun olarak:
 * - bonus.json 8-11 harf aralığı, Türkçe 29 harf, q/w/x yok
 * - Her kelimenin geçerli bir tanımı var, 20-90 karakter ve en az 4 sözcük
 * - Sıfır sızıntı (kelimenin kendisi, ilk 4 harf, fiil ilk 3 harf, türetme kökleri)
 * - Yinelenen kelime yok
 * - Tüm kelimeler tdk-bonus.json referansında mevcut
 * - levels-bonus.json şeması, seviye ayrıklığı (kolay ∩ orta = ∅) ve MIN_HAVUZ >= 100
 * - 20 Kolay + 20 Orta + 20 Zor sağduyu (sanity) seti doğrulaması
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '../..')

// Sağduyu (Sanity) Seti (20 Kolay, 20 Orta, 20 Zor)
const SANITY_BONUS = {
  kolay: [
    'durmadan', 'düşünmek', 'düşürmek', 'düzelmek', 'düzeltme', 'düzenbaz', 'düzenlemek', 'ebediyen',
    'edebiyat', 'ahlaksız', 'akıllıca', 'aldatmak', 'aldırmak', 'eğlenmek', 'ekonomik', 'ekselans',
    'dinozorlar', 'direksiyon', 'direktör', 'disiplin'
  ],
  orta: [
    'yılanbaşı', 'yılaniğnesi', 'yılaşırı', 'yılışkan', 'katmerli', 'kavalyelik', 'kavrayışlı', 'kavuniçi',
    'kayabaşı', 'kaydırak', 'kaydırma', 'kaygısızca', 'kaynaşma', 'kaypakça', 'kazandibi', 'kazayağı',
    'kediyaladı', 'kefaletname', 'kekremsi', 'kekremsilik'
  ],
  zor: [
    'boynuzlu', 'demokrasi', 'hükümdar', 'karşılama', 'savaşmak', 'pezevenk', 'bürokrasi', 'domuzluk',
    'başsızlık', 'destekleme', 'devletli', 'mektupçu', 'yarımlık', 'kurultay', 'perakende', 'yazıcılık',
    'kaltaklık', 'müsademe', 'arızasız', 'çakmaksız'
  ]
}

// TR alfabesi: 29 harf
const TR_ALPHABET = new Set([
  'a', 'b', 'c', 'ç', 'd', 'e', 'f', 'g', 'ğ', 'h', 'ı', 'i', 'j', 'k', 'l',
  'm', 'n', 'o', 'ö', 'p', 'r', 's', 'ş', 't', 'u', 'ü', 'v', 'y', 'z'
])

function isValidTR(word: string): boolean {
  return Array.from(word).every(c => TR_ALPHABET.has(c))
}

interface BonusEntry {
  w: string
  d: string
}

interface LevelsBonusData {
  kolay: string[]
  orta: string[]
}

const bonusList: BonusEntry[] = JSON.parse(
  readFileSync(resolve(ROOT, 'public/data/bonus.json'), 'utf-8')
)

const levelsBonus: LevelsBonusData = JSON.parse(
  readFileSync(resolve(ROOT, 'public/data/levels-bonus.json'), 'utf-8')
)

const tdkBonus: { count: number; words: string[] } = JSON.parse(
  readFileSync(resolve(ROOT, 'data-src/tdk-bonus.json'), 'utf-8')
)
const tdkSet = new Set(tdkBonus.words)
const kolaySet = new Set(levelsBonus.kolay)
const ortaSet = new Set(levelsBonus.orta)

function getLevel(w: string): 'kolay' | 'orta' | 'zor' {
  if (kolaySet.has(w)) return 'kolay'
  if (ortaSet.has(w)) return 'orta'
  return 'zor'
}

describe('public/data/bonus.json Doğrulama', () => {
  it('tüm kelimeler 8 ile 11 harf aralığında', () => {
    const invalid = bonusList.filter(item => {
      const len = Array.from(item.w).length
      return len < 8 || len > 11
    })
    expect(invalid, `Geçersiz uzunluk: ${invalid.map(i => i.w).join(', ')}`).toHaveLength(0)
  })

  it('tüm kelimeler yalnızca Türkçe alfabesi harflerini içeriyor (q/w/x yok)', () => {
    const invalid = bonusList.filter(item => !isValidTR(item.w))
    expect(invalid, `Harf hatası: ${invalid.map(i => i.w).join(', ')}`).toHaveLength(0)
  })

  it('yinelenen kelime yok', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const item of bonusList) {
      if (seen.has(item.w)) dupes.push(item.w)
      seen.add(item.w)
    }
    expect(dupes, `Yinelenenler: ${dupes.join(', ')}`).toHaveLength(0)
  })

  it('tüm kelimeler TDK referansında (tdk-bonus.json) mevcut', () => {
    const notInTdk = bonusList.filter(item => !tdkSet.has(item.w))
    expect(notInTdk, `TDK dışı: ${notInTdk.map(i => i.w).join(', ')}`).toHaveLength(0)
  })

  it('toplam kelime sayısı 4.000 ile 6.000 arasında', () => {
    expect(bonusList.length).toBeGreaterThanOrEqual(4000)
    expect(bonusList.length).toBeLessThanOrEqual(6000)
  })
})

describe('Bonus Tanım Kalitesi ve Sızıntı (Leak) Denetimi', () => {
  it('her kelimenin boş olmayan bir tanımı var', () => {
    const missingDef = bonusList.filter(item => !item.d || item.d.trim().length === 0)
    expect(missingDef).toHaveLength(0)
  })

  it('tüm tanımlar 20 ile 90 karakter arasında (BONUS_TANIM_MAX uyumu)', () => {
    const invalidLen = bonusList.filter(item => item.d.length < 20 || item.d.length > 90)
    expect(invalidLen, `Tanım uzunluk hatası: ${invalidLen.map(i => `${i.w} (${i.d.length})`).slice(0, 5).join(', ')}`).toHaveLength(0)
  })

  it('tüm tanımlar en az 4 sözcükten oluşuyor', () => {
    const fewWords = bonusList.filter(item => {
      const words = item.d.split(/\s+/).filter(Boolean)
      return words.length < 4
    })
    expect(fewWords, `Az sözcüklü tanımlar: ${fewWords.map(i => i.w).join(', ')}`).toHaveLength(0)
  })

  it('hiçbir tanımda cevabın kendisi geçmiyor (tam sızıntı yok)', () => {
    const leaked = bonusList.filter(item => {
      const defLower = item.d.toLocaleLowerCase('tr-TR')
      return defLower.includes(item.w)
    })
    expect(leaked, `Cevap sızıntısı: ${leaked.map(i => i.w).join(', ')}`).toHaveLength(0)
  })

  it('hiçbir tanımda cevabın ilk 4 harfiyle başlayan sözcük yok (önek sızıntısı yok)', () => {
    const leaked = bonusList.filter(item => {
      const root4 = item.w.substring(0, 4)
      const defLower = item.d.toLocaleLowerCase('tr-TR')
      const tokens = defLower.split(/[^a-zçğıöşü]+/).filter(Boolean)
      return tokens.some(t => t.length >= 4 && t.startsWith(root4))
    })
    expect(leaked, `4-harf önek sızıntısı: ${leaked.map(i => i.w).join(', ')}`).toHaveLength(0)
  })

  it('fiillerde ilk 3 harfle başlayan sözcük sızıntısı yok', () => {
    const leaked = bonusList.filter(item => {
      if (!item.w.endsWith('mek') && !item.w.endsWith('mak')) return false
      const root3 = item.w.substring(0, 3)
      const defLower = item.d.toLocaleLowerCase('tr-TR')
      const tokens = defLower.split(/[^a-zçğıöşü]+/).filter(Boolean)
      return tokens.some(t => t.length >= 3 && t.startsWith(root3))
    })
    expect(leaked, `Fiil 3-harf önek sızıntısı: ${leaked.map(i => i.w).join(', ')}`).toHaveLength(0)
  })
})

describe('public/data/levels-bonus.json Doğrulama', () => {
  it('kolay ve orta listeleri bonus.json içinde mevcut', () => {
    const bSet = new Set(bonusList.map(i => i.w))
    const missingKolay = levelsBonus.kolay.filter(w => !bSet.has(w))
    const missingOrta = levelsBonus.orta.filter(w => !bSet.has(w))
    expect(missingKolay).toHaveLength(0)
    expect(missingOrta).toHaveLength(0)
  })

  it('kolay ve orta listeleri kesişmiyor (kolay ∩ orta = ∅)', () => {
    const intersection = levelsBonus.orta.filter(w => kolaySet.has(w))
    expect(intersection, `Kolay ∩ Orta kesişimi: ${intersection.join(', ')}`).toHaveLength(0)
  })

  it('kolay listesinde yinelenen kelime yok', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const w of levelsBonus.kolay) {
      if (seen.has(w)) dupes.push(w)
      seen.add(w)
    }
    expect(dupes).toHaveLength(0)
  })

  it('orta listesinde yinelenen kelime yok', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const w of levelsBonus.orta) {
      if (seen.has(w)) dupes.push(w)
      seen.add(w)
    }
    expect(dupes).toHaveLength(0)
  })

  it('seviye havuzları asgari MIN_HAVUZ >= 100 kuralını fazlasıyla karşılıyor', () => {
    const zorCount = bonusList.length - levelsBonus.kolay.length - levelsBonus.orta.length
    expect(levelsBonus.kolay.length).toBeGreaterThanOrEqual(100)
    expect(levelsBonus.orta.length).toBeGreaterThanOrEqual(100)
    expect(zorCount).toBeGreaterThanOrEqual(100)
  })
})

describe('Sağduyu (Sanity) Seti Doğrulaması (20 Kolay, 20 Orta, 20 Zor)', () => {
  it('20 Kolay kelimenin tümü kolay seviyesinde olmalı', () => {
    expect(SANITY_BONUS.kolay).toHaveLength(20)
    for (const word of SANITY_BONUS.kolay) {
      expect(getLevel(word), `"${word}" kolay olmalı`).toBe('kolay')
    }
  })

  it('20 Orta kelimenin tümü orta seviyesinde olmalı', () => {
    expect(SANITY_BONUS.orta).toHaveLength(20)
    for (const word of SANITY_BONUS.orta) {
      expect(getLevel(word), `"${word}" orta olmalı`).toBe('orta')
    }
  })

  it('20 Zor kelimenin tümü zor seviyesinde olmalı', () => {
    expect(SANITY_BONUS.zor).toHaveLength(20)
    for (const word of SANITY_BONUS.zor) {
      expect(getLevel(word), `"${word}" zor olmalı`).toBe('zor')
    }
  })
})
