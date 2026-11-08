/**
 * LİNGO v2 — Uzlaştırma ve Karar Betiği (Reconciliation & Decisions Generator)
 * SPEC-v2 Bölüm 4.7-F, 4.7-G, 4.9
 *
 * Pass 1 ve Pass 2 çıktılarını birleştirir, otomatik tutarlılık kurallarını (4.7-G) uygular,
 * tüm 23.717 kelime için:
 * 1. `data-src/level-decisions.csv` (kelime;harf;cefr;seviye;guven;kaynak;gerekce)
 * 2. `data-src/kelime-listesi.csv` (kelime;harf;seviye)
 * dosyalarını üretir.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CORE_KOLAY_ANCHORS } from './kolay-words.mjs'
import { PROPER_NAMES, MODERN_MEANING_EXCEPTIONS } from './lemma-utils.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const DATA_SRC = path.join(ROOT, 'data-src')

function cefrToGameLevel(cefr) {
  if (cefr === 'A1' || cefr === 'A2') return 'kolay'
  if (cefr === 'B1' || cefr === 'B2') return 'orta'
  return 'zor'
}

export function reconcileLevels() {
  console.log('\n========================================')
  console.log('[LİNGO v2] Uzlaştırma ve Karar Üretimi...')
  console.log('========================================')

  const pass1Dir = path.join(DATA_SRC, 'level-work/pass1')
  const pass2Dir = path.join(DATA_SRC, 'level-work/pass2')

  if (!fs.existsSync(pass1Dir) || !fs.existsSync(pass2Dir)) {
    throw new Error('Pass 1 veya Pass 2 dizinleri bulunamadı! Önce run-pass.mjs çalıştırılmalı.')
  }

  // Pass 1 yükle
  const pass1Map = new Map()
  for (const file of fs.readdirSync(pass1Dir).filter(f => f.endsWith('.json'))) {
    const items = JSON.parse(fs.readFileSync(path.join(pass1Dir, file), 'utf-8'))
    for (const item of items) pass1Map.set(item.w, item)
  }

  // Pass 2 yükle
  const pass2Map = new Map()
  for (const file of fs.readdirSync(pass2Dir).filter(f => f.endsWith('.json'))) {
    const items = JSON.parse(fs.readFileSync(path.join(pass2Dir, file), 'utf-8'))
    for (const item of items) pass2Map.set(item.w, item)
  }

  // Uyum kontrolü (Quality Gate 4)
  let agreementCount = 0
  let totalCompared = 0
  for (const [w, p1] of pass1Map) {
    const p2 = pass2Map.get(w)
    if (p2) {
      totalCompared++
      const level1 = cefrToGameLevel(p1.cefr)
      const level2 = cefrToGameLevel(p2.cefr)
      if (level1 === level2) agreementCount++
    }
  }

  const agreementRate = totalCompared > 0 ? (agreementCount / totalCompared) * 100 : 100
  console.log(`• Geçişler arası uyum (3 sınıf: kolay/orta/zor): %${agreementRate.toFixed(2)}`)
  if (agreementRate < 90) {
    console.warn(`⚠️  UYARI: Kalite Kapısı 4 gereksinimi (%90) altında!`)
  } else {
    console.log(`  ✅ Kalite Kapısı 4 GEÇTİ (≥ %90 uyum).`)
  }

  // Kanıt dosyasını yükle (tüm 23.717 kelime)
  const evidencePath = path.join(DATA_SRC, 'level-evidence.jsonl')
  const lines = fs
    .readFileSync(evidencePath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(l => JSON.parse(l))

  const decisions = []
  const countsByLevel = { kolay: 0, orta: 0, zor: 0 }
  const countsByLen = {
    4: { kolay: 0, orta: 0, zor: 0 },
    5: { kolay: 0, orta: 0, zor: 0 },
    6: { kolay: 0, orta: 0, zor: 0 },
    7: { kolay: 0, orta: 0, zor: 0 },
    8: { kolay: 0, orta: 0, zor: 0 },
  }

  let consistencyViolationsResolved = 0

  for (const ev of lines) {
    const w = ev.w
    const harf = ev.harf
    const p1 = pass1Map.get(w)
    const p2 = pass2Map.get(w)

    let finalCefr = 'UST'
    let finalLevel = 'zor'
    let guven = 1
    let kaynak = 'cikarim'
    let gerekce = 'Listede yok, varsayılan zor'

    if (p1 && p2) {
      const l1 = cefrToGameLevel(p1.cefr)
      const l2 = cefrToGameLevel(p2.cefr)

      if (l1 === l2) {
        finalCefr = p1.cefr
        finalLevel = l1
        guven = p1.guven
        kaynak = CORE_KOLAY_ANCHORS.has(w) ? 'kaynakli' : 'cikarim'
        gerekce = p1.gerekce
      } else {
        // İki geçiş farklıysa: daha zor olanı seç (SPEC-v2 4.7-F)
        finalLevel = l1 === 'zor' || l2 === 'zor' ? 'zor' : 'orta'
        finalCefr = finalLevel === 'zor' ? 'UST' : 'B1'
        guven = 1
        kaynak = 'cikarim'
        gerekce = 'İki geçiş uzlaştırmasında güvenli üst seviye.'
      }
    }

    // ============================================================
    // Otomatik Tutarlılık Kuralları (SPEC-v2 Bölüm 4.7-G)
    // ============================================================

    // G.1: Resmi listede A1/A2 etiketli kelime kolaydan düşürülemez
    if (CORE_KOLAY_ANCHORS.has(w) && !PROPER_NAMES.has(w) && finalLevel !== 'kolay') {
      finalLevel = 'kolay'
      finalCefr = 'A1'
      guven = 3
      kaynak = 'kaynakli'
      gerekce = 'Çekirdek CEFR A1 çapa kuralı.'
      consistencyViolationsResolved++
    }

    // G.2: TDK'da "eskimiş" / "ağız" etiketli kelime, resmi listede yoksa kolay veya orta olamaz
    // İstisna: Yaşayan modern anlamı olan kelimeler (SPEC-v2 4.7 M4)
    const hasModernException = MODERN_MEANING_EXCEPTIONS.has(w)
    if (
      (ev.flags.is_archaic || ev.flags.is_dialect) &&
      !CORE_KOLAY_ANCHORS.has(w) &&
      !hasModernException &&
      finalLevel !== 'zor'
    ) {
      finalLevel = 'zor'
      finalCefr = 'UST'
      guven = 2
      kaynak = 'cikarim'
      gerekce = 'TDK eskimiş veya ağız kuralı gereği zor.'
      consistencyViolationsResolved++
    }

    if (hasModernException && finalLevel === 'zor') {
      finalLevel = 'orta'
      finalCefr = 'B1'
      guven = 2
      kaynak = 'cikarim'
      gerekce = 'Modern yaşayan anlam kuralı gereği orta seviye.'
      consistencyViolationsResolved++
    }

    // G.3: Uzmanlık terimi etiketli kelime, resmi listede yoksa kolay olamaz
    if (ev.flags.is_technical && !CORE_KOLAY_ANCHORS.has(w) && finalLevel === 'kolay') {
      finalLevel = 'orta'
      finalCefr = 'B1'
      guven = 2
      kaynak = 'cikarim'
      gerekce = 'Uzmanlık terimi kuralı gereği orta seviye.'
      consistencyViolationsResolved++
    }

    // G.4: Kişi adı, yer adı, boy adı kökenli maddeler kesin Zor seviyesine aktarılır (SPEC-v2 4.7 M4)
    if (PROPER_NAMES.has(w)) {
      if (finalLevel !== 'zor') {
        consistencyViolationsResolved++
      }
      finalLevel = 'zor'
      finalCefr = 'UST'
      guven = 2
      kaynak = 'cikarim'
      gerekce = 'Kişi/yer/boy adı kökenli madde kuralı gereği zor.'
    }

    decisions.push({
      kelime: w,
      harf,
      cefr: finalCefr,
      seviye: finalLevel,
      guven,
      kaynak,
      gerekce,
    })

    countsByLevel[finalLevel]++
    countsByLen[harf][finalLevel]++
  }

  if (consistencyViolationsResolved > 0) {
    console.log(`• Otomatik tutarlılık kurallarıyla çözülen kayıt: ${consistencyViolationsResolved}`)
  }

  // 1. `data-src/level-decisions.csv` yaz
  const decisionsPath = path.join(DATA_SRC, 'level-decisions.csv')
  const decHeader = 'kelime;harf;cefr;seviye;guven;kaynak;gerekce'
  const decRows = decisions.map(
    d => `${d.kelime};${d.harf};${d.cefr};${d.seviye};${d.guven};${d.kaynak};${d.gerekce}`
  )
  fs.writeFileSync(decisionsPath, '\uFEFF' + [decHeader, ...decRows].join('\n'), 'utf-8')
  console.log(`✅ ${decisions.length} kayıt yazıldı: ${decisionsPath}`)

  // 2. `data-src/kelime-listesi.csv` güncelle
  // Sıralama kuralı: Harf sayısı (küçükten büyüğe), ardından Türkçe alfabetik
  decisions.sort((a, b) => {
    if (a.harf !== b.harf) return a.harf - b.harf
    return a.kelime.localeCompare(b.kelime, 'tr-TR')
  })

  const listPath = path.join(DATA_SRC, 'kelime-listesi.csv')
  const listHeader = 'kelime;harf;seviye'
  const listRows = decisions.map(d => `${d.kelime};${d.harf};${d.seviye}`)
  fs.writeFileSync(listPath, '\uFEFF' + [listHeader, ...listRows].join('\n'), 'utf-8')
  console.log(`✅ ${decisions.length} kayıt güncellendi: ${listPath}`)

  console.log('\n--- Nihai Seviye Dağılımı ---')
  console.log(
    `• Kolay: ${countsByLevel.kolay} (%${((countsByLevel.kolay / decisions.length) * 100).toFixed(1)})`
  )
  console.log(
    `• Orta:  ${countsByLevel.orta} (%${((countsByLevel.orta / decisions.length) * 100).toFixed(1)})`
  )
  console.log(
    `• Zor:   ${countsByLevel.zor} (%${((countsByLevel.zor / decisions.length) * 100).toFixed(1)})`
  )

  console.log('\n--- Harf Başına Dağılım ---')
  for (const [len, c] of Object.entries(countsByLen)) {
    const total = c.kolay + c.orta + c.zor
    console.log(
      `• ${len} harfli: Kolay=${c.kolay}, Orta=${c.orta}, Zor=${c.zor} (Toplam: ${total})`
    )
  }

  return {
    agreementRate,
    countsByLevel,
    countsByLen,
    total: decisions.length,
  }
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith('reconcile.mjs') || process.argv[1].includes('reconcile'))
) {
  reconcileLevels()
}
