/**
 * build-wordlist.mjs — TDK Güncel Türkçe Sözlük verilerinden
 * oyun için kelime listesi ve bonus dosyaları üretir.
 * 
 * Kaynak: ogun/guncel-turkce-sozluk (v12, 99.236 madde)
 * SPEC Bölüm 5'e göre filtreler uygulanır.
 * 
 * Kullanım: node scripts/build-wordlist.mjs
 */

import Database from 'better-sqlite3';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ─── Ayarlar ─────────────────────────────────────────────────────

const DB_PATH = join(process.env.TEMP, 'gts.sqlite3.db');
const OUT_DIR = resolve('public/data');
const VALID_CHARS = /^[a-zçğıöşü]+$/;

// ─── Türkçe normalizasyon (SPEC 5.2) ────────────────────────────

function turkishLower(s) {
  return s.toLocaleLowerCase('tr-TR');
}

function normalizeHat(s) {
  return s.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');
}

function normalize(s) {
  return normalizeHat(turkishLower(s));
}

function letterCount(s) {
  return Array.from(s).length;
}

// ─── Veritabanı sorgusu ──────────────────────────────────────────

if (!existsSync(DB_PATH)) {
  console.error(`HATA: SQLite veritabanı bulunamadı: ${DB_PATH}`);
  console.error('Önce "Invoke-WebRequest" ile indirin (bkz. build-wordlist.mjs dosya başı).');
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

// Tüm maddebaşlarını al (özel isimler hariç)
// ozel_mi = 1 özel isimdir, hariç tut
// madde: kelimenin kendisi, madde_duz: şapkasız hali (ama biz kendi normalize ederiz)
const allEntries = db.prepare(`
  SELECT m.madde_id, m.madde, m.ozel_mi
  FROM madde m
  WHERE m.ozel_mi = 0
`).all();

console.log(`Veritabanından ${allEntries.length} madde alındı (özel isimler hariç).`);

// ─── SPEC 5.2: Temiz havuz oluştur ─────────────────────────────

const stats = {
  total: allEntries.length,
  skippedSpecialChars: 0,
  skippedMultiWord: 0,
  skippedInvalid: 0,
  afterNormalize: 0,
  duplicatesRemoved: 0,
};

/** @type {Map<number, Map<string, string>>} harf sayısı → { normalized → original madde } */
const wordsByLength = new Map();

for (const entry of allEntries) {
  const raw = entry.madde;

  // SPEC 5.2-3: Boşluk, tire, kesme işareti, rakam içerenleri hariç tut
  if (/[\s\-'0-9]/.test(raw)) {
    stats.skippedMultiWord++;
    continue;
  }

  // Normalize
  const norm = normalize(raw);

  // SPEC 5.2-3: Sadece geçerli Türkçe harflerden oluşmalı
  if (!VALID_CHARS.test(norm)) {
    stats.skippedInvalid++;
    continue;
  }

  const len = letterCount(norm);
  if (len < 4 || len > 8) continue; // Sadece 4-8 harfli kelimeler

  if (!wordsByLength.has(len)) {
    wordsByLength.set(len, new Map());
  }
  
  const bucket = wordsByLength.get(len);
  if (!bucket.has(norm)) {
    bucket.set(norm, raw);
  } else {
    stats.duplicatesRemoved++;
  }
}

stats.afterNormalize = Array.from(wordsByLength.values()).reduce((sum, m) => sum + m.size, 0);

// ─── 4-7 harfli kelime listeleri (words-N.json) ─────────────────

mkdirSync(OUT_DIR, { recursive: true });

const counts = {};
for (let len = 4; len <= 7; len++) {
  const bucket = wordsByLength.get(len) || new Map();
  const words = Array.from(bucket.keys()).sort((a, b) => a.localeCompare(b, 'tr-TR'));
  counts[len] = words.length;
  
  const outPath = join(OUT_DIR, `words-${len}.json`);
  writeFileSync(outPath, JSON.stringify(words), 'utf-8');
  console.log(`words-${len}.json: ${words.length} kelime (${(JSON.stringify(words).length / 1024).toFixed(1)} KB)`);
}

// ─── 8 harfli bonus kelimeler (bonus-8.json) ────────────────────

// 8 harfli kelimelerin tanımlarını al
const bonus8Words = wordsByLength.get(8) || new Map();
const bonusEntries = [];
const bonusSkipped = { noDefinition: 0, leakedAnswer: 0, bkz: 0 };

for (const [norm, originalMadde] of bonus8Words) {
  // madde_id bul — orijinal madde üzerinden
  const maddeRow = db.prepare(
    `SELECT madde_id FROM madde WHERE madde = ? AND ozel_mi = 0 LIMIT 1`
  ).get(originalMadde);
  
  if (!maddeRow) continue;
  
  // İlk anlamı al (anlam_sira = 1)
  const meanings = db.prepare(
    `SELECT anlam, gos FROM anlam WHERE madde_id = ? ORDER BY anlam_sira ASC`
  ).all(maddeRow.madde_id);
  
  if (meanings.length === 0) {
    bonusSkipped.noDefinition++;
    continue;
  }
  
  // SPEC 5.3: Tanım seçimi
  let selectedDef = null;
  for (const m of meanings) {
    let def = m.anlam.trim();
    
    // "Bkz." yönlendirmesi varsa atla
    if (/^[Bb]kz\./.test(def) || /^[Bb]akınız/.test(def)) {
      bonusSkipped.bkz++;
      continue;
    }
    
    // Çok kısa tanımları atla (2 karakter ve altı)
    if (def.length <= 2) continue;
    
    // SPEC 5.3: Cevabı sızdıran tanım kontrolü
    // Tanım, kelimenin kendisini veya kökünü (ilk 5 harfini paylaşan sözcüğü) içeriyorsa atla
    const root = norm.slice(0, 5);
    const defLower = turkishLower(def);
    if (defLower.includes(norm) || defLower.includes(root)) {
      bonusSkipped.leakedAnswer++;
      continue;
    }
    
    selectedDef = def;
    break;
  }
  
  if (!selectedDef) {
    bonusSkipped.noDefinition++;
    continue;
  }
  
  bonusEntries.push({ w: norm, d: selectedDef });
}

// Alfabetik sırala
bonusEntries.sort((a, b) => a.w.localeCompare(b.w, 'tr-TR'));
counts[8] = bonusEntries.length;

const bonusOutPath = join(OUT_DIR, 'bonus-8.json');
writeFileSync(bonusOutPath, JSON.stringify(bonusEntries), 'utf-8');
console.log(`bonus-8.json: ${bonusEntries.length} kelime+tanım (${(JSON.stringify(bonusEntries).length / 1024).toFixed(1)} KB)`);

db.close();

// ─── Duman testi (SPEC 5.4-4) ───────────────────────────────────

console.log('\n── Duman Testi ──');

function smokeTest(len) {
  const path = join(OUT_DIR, `words-${len}.json`);
  const data = JSON.parse(require('fs').readFileSync(path, 'utf-8'));
  const set = new Set(data);
  return set;
}

const sets = {};
for (let len = 4; len <= 7; len++) {
  sets[len] = new Set(JSON.parse(require('fs').readFileSync(join(OUT_DIR, `words-${len}.json`), 'utf-8')));
}

// Olması gereken kelimeler
const mustExist = [
  { word: 'kale', len: 4 },
  { word: 'küpe', len: 4 },
  { word: 'elle', len: 4 },
  { word: 'araba', len: 5 },
  { word: 'kitap', len: 5 },
  { word: 'kalem', len: 5 },
  { word: 'masa', len: 4 },
  { word: 'güzel', len: 5 },
  { word: 'türkçe', len: 6 },
];

// Olmaması gereken kelimeler
const mustNotExist = [
  { word: 'kalemi', len: 6, reason: 'çekimli hal' },
  { word: 'xyzq', len: 4, reason: 'uydurma' },
  { word: 'asdf', len: 4, reason: 'uydurma' },
];

let smokePass = true;
for (const { word, len } of mustExist) {
  const exists = sets[len]?.has(word);
  const status = exists ? '✅' : '❌';
  if (!exists) smokePass = false;
  console.log(`  ${status} "${word}" (${len} harf) → ${exists ? 'BULUNDU' : 'BULUNAMADI!'}`);
}

for (const { word, len, reason } of mustNotExist) {
  const exists = sets[len]?.has(word);
  const status = !exists ? '✅' : '❌';
  if (exists) smokePass = false;
  console.log(`  ${status} "${word}" (${reason}) → ${!exists ? 'YOK (doğru)' : 'VAR (hata!)'}`);
}

console.log(`\nDuman testi: ${smokePass ? '✅ GEÇTİ' : '❌ BAŞARISIZ'}`);

// ─── Özet istatistikler ─────────────────────────────────────────

console.log('\n── Özet ──');
console.log(`Veritabanı toplam madde: ${stats.total}`);
console.log(`Atlanan (boşluk/tire/kesme): ${stats.skippedMultiWord}`);
console.log(`Atlanan (geçersiz karakter): ${stats.skippedInvalid}`);
console.log(`Normalizasyon sonrası tekrar: ${stats.duplicatesRemoved}`);
console.log(`Temiz havuz toplam: ${stats.afterNormalize}`);
console.log(`\nHarf sayılarına göre:`);
for (let len = 4; len <= 8; len++) {
  console.log(`  ${len} harfli: ${counts[len] || 0}`);
}
console.log(`\nBonus 8 harfli atlanan:`);
console.log(`  Tanım yok: ${bonusSkipped.noDefinition}`);
console.log(`  Bkz. yönlendirme: ${bonusSkipped.bkz}`);
console.log(`  Cevap sızdırma: ${bonusSkipped.leakedAnswer}`);
