/**
 * LİNGO v2 — Analiz ve İstatistik Test Paketi
 * SPEC-v2 Bölüm 8, 11.1 madde 5–6, 12/V2-M6
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createEmptyAnalyticsData,
  recordQuestionToAnalytics,
  recordGameToAnalytics,
  recordSessionToAnalytics,
  pruneAnalyticsData,
  getConfusingPairKey,
} from './reducer'
import { mergeBuckets } from './merge'
import {
  loadAnalytics,
  saveAnalytics,
  resetAnalytics,
  clearAnalyticsCache,
  ANALYTICS_STORAGE_KEY,
  STUDY_STORAGE_KEY,
} from './storage'
import { generateSampleAnalyticsData, getSampleAnalyticsSizeKb } from './sampleData'
import type { QuestionResolvedEvent, GameCompletedEvent, SessionCompletedEvent } from '../game/state/types'
import { getLevelRecords } from '../data/storage'

// Node test ortamı için localStorage taklidi
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = createLocalStorageMock() as unknown as Storage
}

describe('V2-M6 Analiz Modülü ve İndirgeyici (Reducer)', () => {
  let data = createEmptyAnalyticsData()

  beforeEach(() => {
    data = createEmptyAnalyticsData()
    clearAnalyticsCache()
    localStorage.clear()
  })

  it('7 kova ve başlangıç alanları doğru şemayla başlatılmalıdır', () => {
    const keys = Object.keys(data.buckets)
    expect(keys).toEqual([
      'yarisma:kolay',
      'yarisma:orta',
      'yarisma:zor',
      'calisma:kolay',
      'calisma:orta',
      'calisma:zor',
      'hatalar',
    ])
    expect(data.version).toBe(1)
    expect(data.games).toEqual([])
    expect(data.sessions).toEqual([])
    expect(data.missedWords).toEqual({})
    expect(data.invalidWords).toEqual({})

    // round4 sadece yarisma kovalarında olmalı
    expect(data.buckets['yarisma:kolay'].round4).toBeDefined()
    expect(data.buckets['yarisma:orta'].round4).toBeDefined()
    expect(data.buckets['yarisma:zor'].round4).toBeDefined()
    expect(data.buckets['calisma:kolay'].round4).toBeUndefined()
    expect(data.buckets['calisma:orta'].round4).toBeUndefined()
    expect(data.buckets['calisma:zor'].round4).toBeUndefined()
    expect(data.buckets['hatalar'].round4).toBeUndefined()
  })

  it('Normal doğru bilinen kelimede harf, konum ve byLength sayaçları güncellenmeli, 0. indeks hariç tutulmalıdır', () => {
    // 5 harfli kelime: "kalem"
    // Tahmin 1: "kelam" -> k(g) e(y) l(g) a(y) m(g)
    // Tahmin 2: "kalem" -> k(g) a(g) l(g) e(g) m(g)
    const event: QuestionResolvedEvent = {
      mode: 'yarisma',
      level: 'kolay',
      letterCount: 5,
      result: 'won',
      attemptCount: 2,
      word: 'kalem',
      guesses: ['kelam', 'kalem'],
      guessMarks: [
        ['yellow', 'green', 'yellow', 'green'], // index 1..4
        ['green', 'green', 'green', 'green'],  // index 1..4
      ],
      guessDurationsMs: [4200, 3100],
      guessTimes: [4.2, 3.1],
      invalidWords: [],
      invalidGuesses: [],
    }

    recordQuestionToAnalytics(data, event)
    const b = data.buckets['yarisma:kolay']
    const lb = b.byLength[5]

    expect(lb.seen).toBe(1)
    expect(lb.solved).toBe(1)
    expect(lb.lost).toBe(0)
    expect(lb.guessSum).toBe(2)
    expect(lb.guessDist[2]).toBe(1)

    // Zaman sayaçları
    expect(b.timing.guessCount).toBe(2)
    expect(b.timing.guessMsSum).toBe(7300)

    // 0. indeks ('k') kaydedilmemeli!
    expect(b.letters['k']).toBeUndefined()

    // 1. indeks 'e' kelam tahmininde 'yellow'
    expect(b.letters['e'].y).toBeGreaterThanOrEqual(1)
    expect(b.positions[5][1].y).toBeGreaterThanOrEqual(1)

    // Doğru kelime missedWords'e EKLENMEMELİDİR
    expect(data.missedWords['kalem']).toBeUndefined()
  })

  it('Benzer harf karışıklığı çiftleri ("cç", "gğ", "iı", "oö", "sş", "uü") yönsüz ve sıralı kaydedilmelidir', () => {
    expect(getConfusingPairKey('i', 'ı')).toBe('iı')
    expect(getConfusingPairKey('ı', 'i')).toBe('iı')
    expect(getConfusingPairKey('s', 'ş')).toBe('sş')
    expect(getConfusingPairKey('ş', 's')).toBe('sş')
    expect(getConfusingPairKey('a', 'b')).toBeNull()

    // Hedef: "sırık", Tahmin: "sirok"
    const event: QuestionResolvedEvent = {
      mode: 'yarisma',
      level: 'orta',
      letterCount: 5,
      result: 'won',
      attemptCount: 1,
      word: 'sırık',
      guesses: ['sirok'],
      guessMarks: [['red', 'green', 'red', 'green']],
      guessDurationsMs: [5000],
      guessTimes: [5.0],
      invalidWords: [],
      invalidGuesses: [],
    }

    recordQuestionToAnalytics(data, event)
    const b = data.buckets['yarisma:orta']
    expect(b.pairs['iı']).toBe(1) // pos 1: i vs ı
    expect(b.pairs['oö']).toBeUndefined() // o vs ı karışıklık çifti değil
  })

  it('PAS bir tahmin DEĞİLDİR: harf, konum ve süre sayaçlarını ETKİLEMEZ', () => {
    const event: QuestionResolvedEvent = {
      mode: 'calisma',
      level: 'kolay',
      letterCount: 6,
      result: 'pass',
      attemptCount: 1, // daha önce 1 tahmin yapıp sonra pas demiş olsun
      lossReason: 'pass',
      word: 'örümce',
      guesses: ['ördekler'],
      guessMarks: [['red', 'red', 'red', 'red', 'red']],
      guessDurationsMs: [6000],
      guessTimes: [6.0],
      invalidWords: [],
      invalidGuesses: [],
    }

    recordQuestionToAnalytics(data, event)
    const b = data.buckets['calisma:kolay']
    const lb = b.byLength[6]

    expect(lb.seen).toBe(1)
    expect(lb.lost).toBe(1)
    expect(lb.lossReasons.pass).toBe(1)

    // PAS harf, konum ve süre sayaçlarına DOKUNMAZ!
    expect(b.timing.guessCount).toBe(0)
    expect(b.timing.guessMsSum).toBe(0)
    expect(Object.keys(b.letters).length).toBe(0)
    expect(Object.keys(b.positions[6]).length).toBe(0)

    // Ancak kaçırılan kelimelere eklenir (Çalışma modu -> c)
    expect(data.missedWords['örümce']).toBeDefined()
    expect(data.missedWords['örümce'].c).toBe(1)
    expect(data.missedWords['örümce'].y).toBe(0)
  })

  it('Sözlük dışı kelime harf ve konum sayaçlarını etkilemez, yalnızca invalidWords sayacını artırır', () => {
    const event: QuestionResolvedEvent = {
      mode: 'yarisma',
      level: 'zor',
      letterCount: 5,
      result: 'lost',
      attemptCount: 1,
      lossReason: 'invalid_word',
      word: 'ahşap',
      guesses: ['asdfg'],
      guessMarks: [['red', 'red', 'red', 'red']],
      guessDurationsMs: [3000],
      guessTimes: [3.0],
      invalidWords: ['asdfg'],
      invalidGuesses: ['asdfg'],
    }

    recordQuestionToAnalytics(data, event)
    const b = data.buckets['yarisma:zor']

    // Harf ve konum kaydedilmemeli
    expect(Object.keys(b.letters).length).toBe(0)
    expect(Object.keys(b.positions[5]).length).toBe(0)

    // invalidWords kaydedilmeli
    expect(data.invalidWords['asdfg']).toBeDefined()
    expect(data.invalidWords['asdfg'].y).toBe(1)
    expect(data.invalidWords['asdfg'].c).toBe(0)
    expect(data.invalidWords['asdfg'].h).toBe(0)

    // missedWords artmalı (Yarışma -> y: 1)
    expect(data.missedWords['ahşap'].y).toBe(1)
  })

  it('Hatalar modunda missedWords ASLA artmamalıdır', () => {
    const event: QuestionResolvedEvent = {
      mode: 'hatalar',
      letterCount: 5,
      result: 'lost',
      attemptCount: 5,
      lossReason: 'five_guesses',
      word: 'paten',
      guesses: ['pilot', 'paket', 'pamuk', 'pazar', 'petek'],
      guessMarks: [
        ['red', 'red', 'red', 'red'],
        ['green', 'red', 'green', 'red'],
        ['red', 'red', 'red', 'red'],
        ['red', 'red', 'red', 'red'],
        ['red', 'green', 'green', 'red'],
      ],
      guessDurationsMs: [2000, 3000, 4000, 5000, 6000],
      guessTimes: [2, 3, 4, 5, 6],
      invalidWords: ['pxxxx'],
      invalidGuesses: ['pxxxx'],
    }

    recordQuestionToAnalytics(data, event)
    expect(data.missedWords['paten']).toBeUndefined()
    expect(data.invalidWords['pxxxx']).toBeDefined()
    expect(data.invalidWords['pxxxx'].h).toBe(1)
  })

  it('invalidWords 500 kayıt sınırını aşarsa en az sayaçlı ve en eski kayıtlar budanmalıdır', () => {
    // 505 adet invalid word ekle
    for (let i = 0; i < 505; i++) {
      const inv = `inv_${i}`
      data.invalidWords[inv] = {
        y: i === 504 ? 100 : 1, // 504 çok sık kullanılmış olsun
        c: 0,
        h: 0,
        last: 1000 + i,
      }
    }

    const event: QuestionResolvedEvent = {
      mode: 'calisma',
      level: 'kolay',
      letterCount: 4,
      result: 'lost',
      attemptCount: 1,
      lossReason: 'invalid_word',
      word: 'kedi',
      guessTimes: [3],
      invalidWords: ['yeni_inv'],
      invalidGuesses: ['yeni_inv'],
    }

    recordQuestionToAnalytics(data, event)
    const keys = Object.keys(data.invalidWords)
    expect(keys.length).toBe(500)
    // Sık kullanılan 'inv_504' silinmemiş olmalı
    expect(data.invalidWords['inv_504']).toBeDefined()
  })

  it('Bonus soru sonuçları (correct, wrong, not_pressed, write_timeout) doğru kaydedilmelidir', () => {
    // 1) Correct
    recordQuestionToAnalytics(data, {
      mode: 'yarisma',
      level: 'kolay',
      letterCount: 8,
      result: 'won',
      attemptCount: 1,
      word: 'domatesi',
      bonusResultType: 'correct',
      bonusLettersOpened: 4,
      bonusBilSeconds: 6,
      bonusPoints: 1800,
      guessTimes: [2.5],
      invalidGuesses: [],
    })

    // 2) Wrong
    recordQuestionToAnalytics(data, {
      mode: 'yarisma',
      level: 'kolay',
      letterCount: 8,
      result: 'lost',
      attemptCount: 1,
      lossReason: 'invalid_word',
      word: 'patlıcan',
      bonusResultType: 'wrong',
      bonusLettersOpened: 3,
      bonusBilSeconds: 5,
      bonusPoints: 0,
      guessTimes: [3.0],
      invalidWords: ['patlıcam'],
      invalidGuesses: ['patlıcam'],
    })

    // 3) Not Pressed
    recordQuestionToAnalytics(data, {
      mode: 'yarisma',
      level: 'kolay',
      letterCount: 8,
      result: 'lost',
      attemptCount: 0,
      lossReason: 'timeout',
      word: 'karnabahar',
      bonusResultType: 'not_pressed',
      bonusLettersOpened: 7,
      bonusPoints: 0,
      guessTimes: [],
      invalidGuesses: [],
    })

    // 4) Write Timeout
    recordQuestionToAnalytics(data, {
      mode: 'yarisma',
      level: 'kolay',
      letterCount: 8,
      result: 'lost',
      attemptCount: 1,
      lossReason: 'timeout',
      word: 'semizotu',
      bonusResultType: 'write_timeout',
      bonusLettersOpened: 2,
      bonusBilSeconds: 4,
      bonusPoints: 0,
      guessTimes: [10],
      invalidGuesses: [],
    })

    const bb = data.buckets['yarisma:kolay'].bonus
    expect(bb.seen).toBe(4)
    expect(bb.solved).toBe(1)
    expect(bb.wrong).toBe(1)
    expect(bb.notPressed).toBe(1)
    expect(bb.writeTimeout).toBe(1)
    expect(bb.lettersOpenedSum).toBe(7) // correct (4) + wrong (3)
    expect(bb.bilSecondSum).toBe(15) // correct(6) + wrong(5) + write_timeout(4)
    expect(bb.bilCount).toBe(3)

    // Kaçırılan bonus kelimeler missedWords'e eklenmelidir
    expect(data.missedWords['domatesi']).toBeUndefined()
    expect(data.missedWords['patlıcan']).toBeDefined()
    expect(data.missedWords['karnabahar']).toBeDefined()
    expect(data.missedWords['semizotu']).toBeDefined()
  })

  it('GameCompletedEvent ve SessionCompletedEvent listeleri 50 sınırıyla yönetilmeli ve round4 güncellenmelidir', () => {
    for (let i = 0; i < 55; i++) {
      const gameEv: GameCompletedEvent = {
        timestamp: 10000 + i,
        level: 'zor',
        finalScore: 5000 + i * 10,
        treasury: 2500,
        lastCompletedStage: 6,
        solvedWordsCount: 12,
        lostWordsCount: 3,
        round4TimeLeft: 25,
      }
      recordGameToAnalytics(data, gameEv)
    }

    expect(data.games.length).toBe(50)
    // En son eklenen en başta olmalı
    expect(data.games[0].finalScore).toBe(5000 + 54 * 10)

    const r4 = data.buckets['yarisma:zor'].round4!
    expect(r4.games).toBe(55)
    expect(r4.timeLeftSum).toBe(55 * 25)

    // Oturumlar
    for (let i = 0; i < 55; i++) {
      const sessEv: SessionCompletedEvent = {
        timestamp: 20000 + i,
        mode: 'calisma',
        level: 'orta',
        totalQuestions: 10,
        wonCount: 8,
        lostCount: 2,
        passCount: 0,
        byLetter: {},
        bonusWonCount: 1,
        bonusLostCount: 0,
      }
      recordSessionToAnalytics(data, sessEv)
    }

    expect(data.sessions.length).toBe(50)
    expect(data.sessions[0].timestamp).toBe(20054)
  })

  it('mergeBuckets: Mod=all ve seviye=all tüm kovaları birleştirmeli', () => {
    // 2 farklı kovaya soru kaydet
    recordQuestionToAnalytics(data, {
      mode: 'yarisma',
      level: 'kolay',
      letterCount: 4,
      result: 'won',
      attemptCount: 1,
      word: 'elma',
      guesses: ['elma'],
      guessMarks: [['green', 'green', 'green']],
      guessDurationsMs: [3000],
      guessTimes: [3.0],
      invalidGuesses: [],
    })

    recordQuestionToAnalytics(data, {
      mode: 'calisma',
      level: 'orta',
      letterCount: 5,
      result: 'won',
      attemptCount: 2,
      word: 'armut',
      guesses: ['avrat', 'armut'],
      guessMarks: [
        ['red', 'red', 'red', 'red'],
        ['green', 'green', 'green', 'green'],
      ],
      guessDurationsMs: [4000, 4000],
      guessTimes: [4, 4],
      invalidGuesses: [],
    })

    const merged = mergeBuckets(data, { mode: 'all', level: 'all' })
    expect(merged.hasData).toBe(true)
    expect(merged.isLevelIrrelevant).toBe(false)
    expect(merged.byLength[4].seen).toBe(1)
    expect(merged.byLength[5].seen).toBe(1)
    expect(merged.timing.guessCount).toBe(3)
    expect(merged.timing.guessMsSum).toBe(11000)
    expect(merged.round4).toBeDefined()
    expect(merged.modeQuestionCount.yarisma).toBe(1)
    expect(merged.modeQuestionCount.calisma).toBe(1)
  })

  it('mergeBuckets: Mod=all ve seviye=kolay seçildiğinde yalnızca yarisma:kolay ve calisma:kolay birleşmeli, hatalar hariç tutulmalı', () => {
    // yarisma:kolay
    recordQuestionToAnalytics(data, {
      mode: 'yarisma',
      level: 'kolay',
      letterCount: 4,
      result: 'won',
      attemptCount: 1,
      word: 'masa',
      guesses: ['masa'],
      guessMarks: [['green', 'green', 'green']],
      guessDurationsMs: [2000],
      guessTimes: [2],
      invalidGuesses: [],
    })
    // calisma:kolay
    recordQuestionToAnalytics(data, {
      mode: 'calisma',
      level: 'kolay',
      letterCount: 4,
      result: 'won',
      attemptCount: 1,
      word: 'kasa',
      guesses: ['kasa'],
      guessMarks: [['green', 'green', 'green']],
      guessDurationsMs: [2000],
      guessTimes: [2],
      invalidGuesses: [],
    })
    // hatalar
    recordQuestionToAnalytics(data, {
      mode: 'hatalar',
      letterCount: 4,
      result: 'won',
      attemptCount: 1,
      word: 'yasa',
      guesses: ['yasa'],
      guessMarks: [['green', 'green', 'green']],
      guessDurationsMs: [2000],
      guessTimes: [2],
      invalidGuesses: [],
    })

    const merged = mergeBuckets(data, { mode: 'all', level: 'kolay' })
    expect(merged.byLength[4].seen).toBe(2) // yarisma:kolay + calisma:kolay (hatalar hariç!)
    expect(merged.byLength[4].solved).toBe(2)
  })

  it('mergeBuckets: Hatalar seçildiğinde seviye filtresi yok sayılmalı (isLevelIrrelevant: true)', () => {
    recordQuestionToAnalytics(data, {
      mode: 'hatalar',
      letterCount: 6,
      result: 'won',
      attemptCount: 2,
      word: 'bostan',
      guesses: ['barkod', 'bostan'],
      guessMarks: [
        ['red', 'red', 'red', 'red', 'red'],
        ['green', 'green', 'green', 'green', 'green'],
      ],
      guessDurationsMs: [3000, 3000],
      guessTimes: [3, 3],
      invalidGuesses: [],
    })

    const mergedZor = mergeBuckets(data, { mode: 'hatalar', level: 'zor' })
    expect(mergedZor.isLevelIrrelevant).toBe(true)
    expect(mergedZor.hasData).toBe(true)
    expect(mergedZor.byLength[6].seen).toBe(1)
    expect(mergedZor.round4).toBeUndefined() // hatalar modunda round4 yok

    const mergedAll = mergeBuckets(data, { mode: 'hatalar', level: 'all' })
    expect(mergedAll.isLevelIrrelevant).toBe(false)
    expect(mergedAll.hasData).toBe(true)
  })

  it('pruneAnalyticsData: Veri ~1.5 MB boyut sınırını aşarsa en eski/az kaçırılmış missedWords budanmalıdır', () => {
    // 1000 adet missed word ekle
    for (let i = 0; i < 1000; i++) {
      data.missedWords[`long_word_item_number_${i}`] = {
        y: i > 900 ? 5 : 1,
        c: 0,
        last: 10000 + i,
      }
    }

    const initialLen = JSON.stringify(data).length
    // Düşük bir sınır vererek budamayı test et (örneğin initialLen / 2)
    const targetLimit = Math.floor(initialLen / 2)
    const pruned = pruneAnalyticsData(data, targetLimit)
    const finalLen = JSON.stringify(pruned).length

    expect(finalLen).toBeLessThanOrEqual(targetLimit)
    // Sık kaçırılan son kelimeler korunmuş olmalı
    expect(pruned.missedWords['long_word_item_number_999']).toBeDefined()
  })

  it('Depolama Katmanı (Storage): Bozuk JSON okunduğunda çökmeden temiz şemaya dönmelidir', () => {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, '{ invalid_json_syntax !!')
    const loaded = loadAnalytics()
    expect(loaded).toBeDefined()
    expect(loaded.version).toBe(1)
    expect(loaded.buckets['yarisma:kolay']).toBeDefined()
  })

  it('Depolama Katmanı (Storage): resetAnalytics rekorları ve ayarları koruyarak sadece analiz verisini silmelidir', () => {
    // 1) Ayar ve rekor ayarla
    localStorage.setItem('be:v2:settings', JSON.stringify({ sound: false, haptics: false, keyboard: 'game' }))
    localStorage.setItem('be:v2:records', JSON.stringify({ kolay: 9999, orta: 8888, zor: 7777 }))

    // 2) Analiz verisi kaydet
    const sample = generateSampleAnalyticsData(123)
    saveAnalytics(sample)
    expect(localStorage.getItem(ANALYTICS_STORAGE_KEY)).not.toBeNull()

    // 3) resetAnalytics() çağır
    resetAnalytics()

    // Analiz anahtarları silinmiş olmalı
    expect(localStorage.getItem(ANALYTICS_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(STUDY_STORAGE_KEY)).toBeNull()

    // Ayarlar ve rekorlar KORUNMALIDIR!
    expect(localStorage.getItem('be:v2:settings')).not.toBeNull()
    expect(localStorage.getItem('be:v2:records')).not.toBeNull()
    const records = getLevelRecords()
    expect(records.kolay).toBe(9999)
  })

  it('DEV örnek veri üretici gerçekçi veri üretmeli ve KB boyutunu doğru hesaplamalıdır', () => {
    const sample = generateSampleAnalyticsData(2026)
    expect(sample.games.length).toBe(30)
    expect(sample.sessions.length).toBe(40)
    expect(Object.keys(sample.missedWords).length).toBe(200)
    expect(Object.keys(sample.invalidWords).length).toBe(100)

    const sizeKb = getSampleAnalyticsSizeKb(sample)
    expect(sizeKb).toBeGreaterThan(20)
    expect(sizeKb).toBeLessThan(500)
  })
})

describe('V2-M6 2 Tam Oyun + 2 Tam Oturum Elle Doğrulama Simülasyonu', () => {
  beforeEach(() => {
    clearAnalyticsCache()
    localStorage.clear()
  })

  it('2 Tam Oyun ve 2 Tam Oturum boyunca tüm sayaçlar elle hesaplanan değerlerle birebir eşleşmelidir', () => {
    let data = createEmptyAnalyticsData()

    // ─── OYUN 1: Yarışma • Kolay ──────────────────────────────────────
    // 3 normal kelime: 1 x 4h (1. tahmin doğru), 1 x 5h (2. tahmin doğru), 1 x 6h (pas geçildi)
    // 1 bonus soru: 8h doğru
    // 4. tur: 4. tura ulaşıldı, stage 5'te bitti, 15 sn kaldı
    recordQuestionToAnalytics(data, {
      mode: 'yarisma',
      level: 'kolay',
      letterCount: 4,
      result: 'won',
      attemptCount: 1,
      word: 'kare',
      guesses: ['kare'],
      guessMarks: [['green', 'green', 'green']],
      guessDurationsMs: [3500],
      guessTimes: [3.5],
      invalidGuesses: [],
    })

    recordQuestionToAnalytics(data, {
      mode: 'yarisma',
      level: 'kolay',
      letterCount: 5,
      result: 'won',
      attemptCount: 2,
      word: 'kitap',
      guesses: ['katip', 'kitap'],
      guessMarks: [
        ['yellow', 'green', 'red', 'green'],
        ['green', 'green', 'green', 'green'],
      ],
      guessDurationsMs: [4000, 3000],
      guessTimes: [4, 3],
      invalidGuesses: [],
    })

    recordQuestionToAnalytics(data, {
      mode: 'yarisma',
      level: 'kolay',
      letterCount: 6,
      result: 'pass',
      attemptCount: 1,
      lossReason: 'pass',
      word: 'mendil',
      guesses: ['market'],
      guessMarks: [['red', 'red', 'red', 'red', 'red']],
      guessDurationsMs: [5000],
      guessTimes: [5],
      invalidGuesses: [],
    })

    recordQuestionToAnalytics(data, {
      mode: 'yarisma',
      level: 'kolay',
      letterCount: 8,
      result: 'won',
      attemptCount: 1,
      word: 'papatyam',
      bonusResultType: 'correct',
      bonusLettersOpened: 3,
      bonusBilSeconds: 6,
      bonusPoints: 2100,
      guessTimes: [2],
      invalidGuesses: [],
    })

    recordGameToAnalytics(data, {
      timestamp: 1000,
      level: 'kolay',
      finalScore: 12500,
      treasury: 6000,
      lastCompletedStage: 5,
      solvedWordsCount: 3, // 4h, 5h, bonus
      lostWordsCount: 1,   // 6h pas
      round4TimeLeft: 15,
    })

    // ─── OYUN 2: Yarışma • Zor ────────────────────────────────────────
    // 1 x 4h (5 hakta bilinemedi), 1 bonus (wrong)
    // 4. tur: stage 7 tamamlandı, 45 sn kaldı
    recordQuestionToAnalytics(data, {
      mode: 'yarisma',
      level: 'zor',
      letterCount: 4,
      result: 'lost',
      attemptCount: 5,
      lossReason: 'five_guesses',
      word: 'gark',
      guesses: ['gasp', 'gazi', 'gani', 'gaip', 'gale'],
      guessMarks: [
        ['green', 'red', 'red'],
        ['green', 'red', 'red'],
        ['green', 'red', 'red'],
        ['green', 'red', 'red'],
        ['green', 'red', 'red'],
      ],
      guessDurationsMs: [3000, 3000, 3000, 3000, 3000],
      guessTimes: [3, 3, 3, 3, 3],
      invalidGuesses: [],
    })

    recordQuestionToAnalytics(data, {
      mode: 'yarisma',
      level: 'zor',
      letterCount: 8,
      result: 'lost',
      attemptCount: 1,
      lossReason: 'invalid_word',
      word: 'muhabbet',
      bonusResultType: 'wrong',
      bonusLettersOpened: 4,
      bonusBilSeconds: 7,
      bonusPoints: 0,
      guessTimes: [4],
      invalidWords: ['muhabbıt'],
      invalidGuesses: ['muhabbıt'],
    })

    recordGameToAnalytics(data, {
      timestamp: 2000,
      level: 'zor',
      finalScore: 28000,
      treasury: 14000,
      lastCompletedStage: 7,
      solvedWordsCount: 0,
      lostWordsCount: 2,
      round4TimeLeft: 45,
    })

    // ─── OTURUM 1: Çalışma • Orta ─────────────────────────────────────
    // 2 soru: 1 x 5h (won), 1 x 8h bonus (write_timeout)
    recordQuestionToAnalytics(data, {
      mode: 'calisma',
      level: 'orta',
      letterCount: 5,
      result: 'won',
      attemptCount: 1,
      word: 'sehpa',
      guesses: ['sehpa'],
      guessMarks: [['green', 'green', 'green', 'green']],
      guessDurationsMs: [3200],
      guessTimes: [3.2],
      invalidGuesses: [],
    })

    recordQuestionToAnalytics(data, {
      mode: 'calisma',
      level: 'orta',
      letterCount: 8,
      result: 'lost',
      attemptCount: 1,
      lossReason: 'timeout',
      word: 'sandviçt',
      bonusResultType: 'write_timeout',
      bonusLettersOpened: 5,
      bonusBilSeconds: 8,
      bonusPoints: 0,
      guessTimes: [10],
      invalidGuesses: [],
    })

    recordSessionToAnalytics(data, {
      timestamp: 3000,
      mode: 'calisma',
      level: 'orta',
      totalQuestions: 2,
      wonCount: 1,
      lostCount: 1,
      passCount: 0,
      byLetter: { 5: { asked: 1, won: 1 }, 8: { asked: 1, won: 0 } },
      bonusWonCount: 0,
      bonusLostCount: 1,
    })

    // ─── OTURUM 2: Çalışma • Kolay ────────────────────────────────────
    // 1 soru: 4h (pass)
    recordQuestionToAnalytics(data, {
      mode: 'calisma',
      level: 'kolay',
      letterCount: 4,
      result: 'pass',
      attemptCount: 0,
      lossReason: 'pass',
      word: 'tava',
      guesses: [],
      guessMarks: [],
      guessDurationsMs: [],
      guessTimes: [],
      invalidGuesses: [],
    })

    recordSessionToAnalytics(data, {
      timestamp: 4000,
      mode: 'calisma',
      level: 'kolay',
      totalQuestions: 1,
      wonCount: 0,
      lostCount: 0,
      passCount: 1,
      byLetter: { 4: { asked: 1, won: 0 } },
      bonusWonCount: 0,
      bonusLostCount: 0,
    })

    // ─── DOĞRULAMA (ELLE HESAPLANAN DEĞERLER) ──────────────────────────

    // 1) yarisma:kolay
    const yk = data.buckets['yarisma:kolay']
    expect(yk.byLength[4].seen).toBe(1)
    expect(yk.byLength[4].solved).toBe(1)
    expect(yk.byLength[5].seen).toBe(1)
    expect(yk.byLength[5].solved).toBe(1)
    expect(yk.byLength[6].seen).toBe(1)
    expect(yk.byLength[6].lost).toBe(1)
    expect(yk.byLength[6].lossReasons.pass).toBe(1)
    expect(yk.bonus.seen).toBe(1)
    expect(yk.bonus.solved).toBe(1)
    expect(yk.bonus.lettersOpenedSum).toBe(3)
    expect(yk.round4!.games).toBe(1)
    expect(yk.round4!.timeLeftSum).toBe(15)

    // 2) yarisma:zor
    const yz = data.buckets['yarisma:zor']
    expect(yz.byLength[4].seen).toBe(1)
    expect(yz.byLength[4].lost).toBe(1)
    expect(yz.byLength[4].lossReasons.five_guesses).toBe(1)
    expect(yz.bonus.seen).toBe(1)
    expect(yz.bonus.wrong).toBe(1)
    expect(yz.round4!.games).toBe(1)
    expect(yz.round4!.timeLeftSum).toBe(45)

    // 3) calisma:orta
    const co = data.buckets['calisma:orta']
    expect(co.byLength[5].seen).toBe(1)
    expect(co.byLength[5].solved).toBe(1)
    expect(co.bonus.seen).toBe(1)
    expect(co.bonus.writeTimeout).toBe(1)

    // 4) calisma:kolay
    const ck = data.buckets['calisma:kolay']
    expect(ck.byLength[4].seen).toBe(1)
    expect(ck.byLength[4].lossReasons.pass).toBe(1)

    // 5) missedWords listesi
    // Kaçırılanlar:
    // - mendil (yarisma kolay 6h pas) -> y: 1, c: 0
    // - gark (yarisma zor 4h lost) -> y: 1, c: 0
    // - muhabbet (yarisma zor bonus wrong) -> y: 1, c: 0
    // - sandviçt (calisma orta bonus timeout) -> y: 0, c: 1
    // - tava (calisma kolay 4h pas) -> y: 0, c: 1
    expect(data.missedWords['mendil']).toEqual(expect.objectContaining({ y: 1, c: 0 }))
    expect(data.missedWords['gark']).toEqual(expect.objectContaining({ y: 1, c: 0 }))
    expect(data.missedWords['muhabbet']).toEqual(expect.objectContaining({ y: 1, c: 0 }))
    expect(data.missedWords['sandviçt']).toEqual(expect.objectContaining({ y: 0, c: 1 }))
    expect(data.missedWords['tava']).toEqual(expect.objectContaining({ y: 0, c: 1 }))
    // Doğru bilinenler missedWords'te OLMAMALIDIR
    expect(data.missedWords['kare']).toBeUndefined()
    expect(data.missedWords['kitap']).toBeUndefined()
    expect(data.missedWords['papatyam']).toBeUndefined()
    expect(data.missedWords['sehpa']).toBeUndefined()

    // 6) games & sessions
    expect(data.games.length).toBe(2)
    expect(data.sessions.length).toBe(2)

    // 7) mergeBuckets('all', 'all')
    const allMerged = mergeBuckets(data, { mode: 'all', level: 'all' })
    expect(allMerged.byLength[4].seen).toBe(3) // yk(1) + yz(1) + ck(1)
    expect(allMerged.byLength[5].seen).toBe(2) // yk(1) + co(1)
    expect(allMerged.byLength[6].seen).toBe(1) // yk(1)
    expect(allMerged.bonus.seen).toBe(3)       // yk(1) + yz(1) + co(1)
    expect(allMerged.bonus.solved).toBe(1)
    expect(allMerged.round4!.games).toBe(2)    // yk(1) + yz(1)
    expect(allMerged.round4!.timeLeftSum).toBe(60) // 15 + 45
  })

  it('Üretim yapısında (build) DEV araçlarının kodunun budandığı doğrulanmalıdır', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const distAssetsDir = path.resolve(process.cwd(), 'dist/assets')

    if (fs.existsSync(distAssetsDir)) {
      const files = fs.readdirSync(distAssetsDir)
      const jsFiles = files.filter(f => f.endsWith('.js'))
      expect(jsFiles.length).toBeGreaterThan(0)

      for (const file of jsFiles) {
        const content = fs.readFileSync(path.join(distAssetsDir, file), 'utf-8')
        expect(content).not.toContain('Geliştirici Araçları')
        expect(content).not.toContain('Örnek analiz verisi üret')
        expect(content).not.toContain('Analiz verisini temizle')
        expect(content).not.toContain('devSimulateV1Record')
      }
    }
  })
})
