/**
 * LİNGO v2 — Veri Kalitesi Kabul Testi
 * SPEC-v2 Bölüm 4.7 — M4 Veri Düzeltmesi Kabul Kriterleri
 *
 * Bu test, üretilen levels-N.json dosyalarını doğrudan okuyarak
 * belirli kelimelerin beklenen seviyede olduğunu doğrular.
 * Testler başarısız olursa veri yeniden üretilmeli.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// levels-N.json dosyalarını oku
function loadLevels(n: number): { kolay: string[]; orta: string[] } {
  const p = resolve(__dirname, `../../public/data/levels-${n}.json`)
  return JSON.parse(readFileSync(p, 'utf-8'))
}

function getLevel(word: string): 'kolay' | 'orta' | 'zor' {
  const len = [...word].length // Unicode-safe
  if (len < 4 || len > 8) return 'zor'
  const data = loadLevels(len)
  if (data.kolay.includes(word)) return 'kolay'
  if (data.orta.includes(word)) return 'orta'
  return 'zor'
}

describe('Veri Kalitesi Kabul Testi (M4)', () => {
  describe('KOLAY olması gereken kelimeler', () => {
    const MUST_BE_KOLAY = [
      'ayak',      // 4h - temel organ, yüksek frekans
      'bilmek',    // 6h - temel fiil
      'üzüm',      // 4h - meyve, A1
      'omuz',      // 4h - temel organ, is_technical hatası düzeltildi
      'sıfır',     // 5h - sayı, is_technical hatası düzeltildi
      'tarak',     // 5h - günlük eşya
      'anahtar',   // 7h - günlük eşya, is_technical hatası düzeltildi
      'şapka',     // 5h - giysi
      'sandalye',  // 8h - mobilya
      'merdiven',  // 7h - günlük nesne
      'bile',      // 4h - bağlaç, yüksek frekans
      'hayvan',    // 6h - temel kavram
      'geçmek',    // 6h - temel fiil
      'açmak',     // 6h - temel fiil
      'bilek',     // 5h - temel organ, is_technical hatası düzeltildi
    ]

    for (const word of MUST_BE_KOLAY) {
      it(`"${word}" kolay seviyesinde olmalı`, () => {
        expect(getLevel(word)).toBe('kolay')
      })
    }
  })

  describe('EN AZ ORTA olması gereken kelimeler', () => {
    const MUST_BE_AT_LEAST_ORTA = [
      'motor',     // 5h - teknik ama yaygın
      'makine',    // 6h - teknik ama yaygın
      'millet',    // 6h - soyut ama yaygın
      'mesele',    // 6h - soyut kelime
      'mahkeme',   // 7h - kurum
      'hemşire',   // 7h - meslek
      'vücut',     // 5h - beden
      'posta',     // 5h - hizmet
      'benzin',    // 6h - günlük
      'ameliyat',  // 7h - tıp
      'hakim',     // 5h - hâkim (yaşayan madde)
      'bağlı',     // 5h - sıfat
      'görüntü',   // 7h - medya
      'efendi',    // 6h - unvan
      // M4 veri düzeltmesi ekleri (yaşayan modern anlam)
      'şahane',    // 6h - modern yaşayan anlam
      'nihai',     // 5h - modern yaşayan anlam
      'sıska',     // 5h - modern yaşayan anlam
      'şerif',     // 5h - modern yaşayan anlam
      'erimek',    // 6h - temel fiil lemmalı
      'doruk',     // 5h - modern yaşayan anlam
      'buzul',     // 5h - coğrafya, modern
      'bisiklet',  // 8h - modern günlük araç
    ]

    for (const word of MUST_BE_AT_LEAST_ORTA) {
      it(`"${word}" kolay veya orta seviyesinde olmalı`, () => {
        const lv = getLevel(word)
        expect(['kolay', 'orta']).toContain(lv)
      })
    }
  })

  describe('ZOR olması gereken kelimeler', () => {
    const MUST_BE_ZOR = [
      'miço',   // nadir denizcilik terimi
      'naip',   // eskimiş unvan
      'cirit',  // spor, nadir
      'habis',  // eskimiş/ağız
      'ulak',   // eskimiş haberci
      'derz',   // teknik yapı terimi
      'biat',   // nadir siyasi terim
      'akçe',   // eskimiş para birimi
      'nüve',   // teknik/bilimsel
      'rint',   // eskimiş tip adı
      'gres',   // teknik yağlayıcı
      // M4 veri düzeltmesi ekleri (kişi, yer, boy adları ve çekimli homonimler)
      'tolga',
      'kerem',
      'kazım',
      'nazım',
      'özden',
      'ilhan',
      'irfan',
      'izzet',
      'erkan',
      'yavuz',
      'burhan',
      'coşkun',
      'düzce',
      'balkan',
      'arslan',
      'çelebi',
      'oğuz',
      'elif',
      'günü',
      'evin',
      'gücü',
      'bende',
    ]

    for (const word of MUST_BE_ZOR) {
      it(`"${word}" zor seviyesinde olmalı`, () => {
        expect(getLevel(word)).toBe('zor')
      })
    }
  })
})
