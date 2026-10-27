import { describe, it, expect } from 'vitest'
import {
  turkishLower,
  normalizeHat,
  normalize,
  letterCount,
  isValidWord,
  evaluateGuess,
  ROUND_CONFIGS,
  maxRoundPoints,
  MAX_TREASURY,
  GUESS_TIME_LIMIT,
  ROUND4_TIME_LIMIT,
  MAX_GUESSES,
  bonusScore,
  bonusRevealedAtTime,
  bonusScoreAtTime,
  BONUS_TOTAL_TIME,
  BONUS_WRITE_TIME,
  round4FinalScore,
  pickWord,
  pickBonusWord,
  shuffleRevealOrder,
} from './index'

// ─── 1. evaluateGuess: SPEC 4.3 + 9.1-1 ────────────────────────

describe('evaluateGuess', () => {
  it('SPEC zorunlu örnek: cevap "kale", tahmin "elle" → [red, red, green, green]', () => {
    // SPEC Bölüm 4.3 zorunlu test örneği
    const result = evaluateGuess('kale', 'elle')
    expect(result).toEqual(['red', 'red', 'green', 'green'])
  })

  it('SPEC ek örnek: cevap "kale", tahmin "küpe" → [green, red, red, green]', () => {
    // SPEC Bölüm 4.3 ek örnek
    const result = evaluateGuess('kale', 'küpe')
    expect(result).toEqual(['green', 'red', 'red', 'green'])
  })

  it('tümü yeşil: cevap === tahmin', () => {
    const result = evaluateGuess('kale', 'kale')
    expect(result).toEqual(['green', 'green', 'green', 'green'])
  })

  it('tümü kırmızı: hiçbir harf uymuyor', () => {
    const result = evaluateGuess('kale', 'bıçı')
    expect(result).toEqual(['red', 'red', 'red', 'red'])
  })

  it('sarı harf: doğru harf yanlış yer', () => {
    const result = evaluateGuess('kale', 'elak')
    // e: cevapta var (pozisyon 3 değil 0) → sarı
    // l: cevapta var (pozisyon 2 değil 1) → sarı
    // a: cevapta var (pozisyon 1 değil 2) → sarı
    // k: cevapta var (pozisyon 0 değil 3) → sarı
    expect(result).toEqual(['yellow', 'yellow', 'yellow', 'yellow'])
  })

  it('çift harf senaryosu: cevapta 1 adet harf, tahminde 2 kez → sadece biri renklenir', () => {
    // cevap: "kale" — 'a' 1 kez var
    // tahmin: "aaba" — 'a' 3 kez var
    // pos 0: a vs k → a cevapta var, remaining a=1 → sarı, remaining a=0
    // pos 1: a vs a → green (1. geçiş)
    // Düzeltme: 1. geçiş: pos1 a==a → green. remaining: k=1,l=1,e=1 (a eşleşti, remaining'e eklenmedi)
    // 2. geçiş: pos0 a → remaining'de a yok → red
    // pos2: b → remaining'de b yok → red
    // pos3: a → remaining'de a yok → red
    const result = evaluateGuess('kale', 'aaba')
    expect(result).toEqual(['red', 'green', 'red', 'red'])
  })

  it('çift harf senaryosu 2: cevapta 2 adet harf, tahminde 2 kez → ikisi de sarı olabilir', () => {
    // cevap: "alla" — 'l' 2 kez, 'a' 2 kez
    // tahmin: "lala"
    // 1. geçiş: pos0 l≠a, pos1 a≠l, pos2 l=l → green, pos3 a=a → green
    // remaining: a=1, l=1
    // 2. geçiş: pos0 l → remaining l=1 → yellow, l=0; pos1 a → remaining a=1 → yellow, a=0
    const result = evaluateGuess('alla', 'lala')
    expect(result).toEqual(['yellow', 'yellow', 'green', 'green'])
  })

  it('çift harf senaryosu 3: cevapta 1 kez olan harf tahminde 2 kez, biri doğru yerde', () => {
    // cevap: "abcd"  tahmin: "aaxd"
    // 1. geçiş: pos0 a=a → green, pos3 d=d → green. remaining: b=1, c=1
    // 2. geçiş: pos1 a → remaining a yok → red. pos2 x → yok → red
    const result = evaluateGuess('abcd', 'aaxd')
    expect(result).toEqual(['green', 'red', 'red', 'green'])
  })

  it('5 harfli kelimede doğru çalışır', () => {
    const result = evaluateGuess('kitap', 'kazak')
    // k=k → green, a≠i, z≠t, a≠a? hayır poz farklı. Let me recalculate:
    // cevap: k i t a p
    // tahmin: k a z a k
    // 1. geçiş: pos0 k=k → green. pos1 a≠i. pos2 z≠t. pos3 a=a → green. pos4 k≠p.
    // remaining: i=1, t=1, p=1
    // 2. geçiş: pos1 a → remaining a yok → red. pos2 z → yok → red. pos4 k → yok → red.
    expect(result).toEqual(['green', 'red', 'red', 'green', 'red'])
  })

  it('6 harfli kelimede doğru çalışır', () => {
    const result = evaluateGuess('ankara', 'aralar')
    // cevap: a n k a r a
    // tahmin: a r a l a r
    // 1. geçiş: pos0 a=a → green. pos1 r≠n. pos2 a≠k. pos3 l≠a. pos4 a≠r. pos5 r≠a.
    // remaining: n=1, k=1, a=2, r=1
    // 2. geçiş: pos1 r → remaining r=1 → yellow, r=0. pos2 a → remaining a=2 → yellow, a=1.
    // pos3 l → yok → red. pos4 a → remaining a=1 → yellow, a=0. pos5 r → remaining r=0 → red.
    expect(result).toEqual(['green', 'yellow', 'yellow', 'red', 'yellow', 'red'])
  })

  it('7 harfli kelime: tümü yeşil', () => {
    const result = evaluateGuess('istanbul', 'istanbul')
    expect(result).toEqual(Array(8).fill('green'))
  })
})

// ─── 2. Türkçe Normalizasyon: SPEC 9.1-2 ────────────────────────

describe('Türkçe normalizasyon', () => {
  describe('turkishLower', () => {
    it('I → ı (Türkçe kuralı)', () => {
      expect(turkishLower('I')).toBe('ı')
    })

    it('İ → i (Türkçe kuralı)', () => {
      expect(turkishLower('İ')).toBe('i')
    })

    it('standart büyük harfler doğru çevrilir', () => {
      expect(turkishLower('KALE')).toBe('kale')
    })

    it('Ş, Ç, Ö, Ü, Ğ doğru çevrilir', () => {
      expect(turkishLower('ŞÇÖÜĞ')).toBe('şçöüğ')
    })

    it('zaten küçük harf ise değişmez', () => {
      expect(turkishLower('kale')).toBe('kale')
    })
  })

  describe('normalizeHat (şapkalı harfler)', () => {
    it('â → a', () => {
      expect(normalizeHat('kâr')).toBe('kar')
    })

    it('î → i', () => {
      expect(normalizeHat('îlan')).toBe('ilan')
    })

    it('û → u', () => {
      expect(normalizeHat('rûya')).toBe('ruya')
    })

    it('birden fazla şapkalı harf', () => {
      // î → i (Latin i), â → a — SPEC: şapka kaldırma
      expect(normalizeHat('kâğît')).toBe('kağit')
    })
  })

  describe('normalize (tam)', () => {
    it('büyük harf + şapka birlikte', () => {
      expect(normalize('KÂR')).toBe('kar')
    })

    it('İ ile başlayan şapkalı kelime', () => {
      expect(normalize('ÎLAN')).toBe('ilan')
    })
  })

  describe('letterCount', () => {
    it('ASCII kelime', () => {
      expect(letterCount('kale')).toBe(4)
    })

    it('Türkçe özel harfli kelime', () => {
      expect(letterCount('şçöüğı')).toBe(6)
    })

    it('boş string', () => {
      expect(letterCount('')).toBe(0)
    })
  })

  describe('isValidWord', () => {
    it('geçerli Türkçe kelime', () => {
      expect(isValidWord('kale')).toBe(true)
    })

    it('Türkçe özel harfler geçerli', () => {
      expect(isValidWord('şçöüğı')).toBe(true)
    })

    it('büyük harf normalize edildikten sonra geçerli', () => {
      expect(isValidWord('KALE')).toBe(true)
    })

    it('şapkalı harf normalize edildikten sonra geçerli', () => {
      expect(isValidWord('kâr')).toBe(true)
    })

    it('boşluk içeren geçersiz', () => {
      expect(isValidWord('iki kelime')).toBe(false)
    })

    it('tire içeren geçersiz', () => {
      expect(isValidWord('alt-üst')).toBe(false)
    })

    it('rakam içeren geçersiz', () => {
      expect(isValidWord('test1')).toBe(false)
    })

    it('boş string geçersiz', () => {
      expect(isValidWord('')).toBe(false)
    })
  })

  describe('i ve ı farklı harflerdir', () => {
    it('evaluateGuess: "i" ve "ı" farklı', () => {
      // cevap: "ilik", tahmin: "ılık"
      // pos0: ı≠i, pos1: l=l → green, pos2: ı≠i, pos3: k=k → green
      // remaining: i=2 (poz 0 ve 2)
      // 2. geçiş: pos0 ı → remaining ı yok → red, pos2 ı → red
      const result = evaluateGuess('ilik', 'ılık')
      expect(result).toEqual(['red', 'green', 'red', 'green'])
    })

    it('evaluateGuess: "ö" ve "o" farklı', () => {
      const result = evaluateGuess('göle', 'gole')
      // pos0 g=g → green, pos1 o≠ö → red, pos2 l=l → green, pos3 e=e → green
      expect(result).toEqual(['green', 'red', 'green', 'green'])
    })

    it('normalize: i ve ı ayrı normalize edilir', () => {
      expect(normalize('i')).toBe('i')
      expect(normalize('ı')).toBe('ı')
      expect(normalize('i')).not.toBe(normalize('ı'))
    })

    it('normalize: büyük I → ı, büyük İ → i', () => {
      expect(normalize('I')).toBe('ı')
      expect(normalize('İ')).toBe('i')
    })
  })
})

// ─── 3. Bonus Puan Zaman Çizelgesi: SPEC 9.1-3 ─────────────────

describe('Bonus puan zaman çizelgesi', () => {
  describe('bonusScore', () => {
    it('0 harf açılmış → 3000', () => {
      expect(bonusScore(0)).toBe(3000)
    })

    it('1 harf → 2800', () => {
      expect(bonusScore(1)).toBe(2800)
    })

    it('2 harf → 2600', () => {
      expect(bonusScore(2)).toBe(2600)
    })

    it('3 harf → 2400', () => {
      expect(bonusScore(3)).toBe(2400)
    })

    it('4 harf → 2200', () => {
      expect(bonusScore(4)).toBe(2200)
    })

    it('5 harf → 2000', () => {
      expect(bonusScore(5)).toBe(2000)
    })

    it('6 harf → 1800', () => {
      expect(bonusScore(6)).toBe(1800)
    })

    it('7 harf → 0 (doğrudan, 1600 değil)', () => {
      // SPEC: 7. harf açıldığında puan doğrudan 0'a iner
      expect(bonusScore(7)).toBe(0)
    })
  })

  describe('bonusRevealedAtTime', () => {
    it('t=0 → 0 harf (okuma süresi)', () => {
      expect(bonusRevealedAtTime(0)).toBe(0)
    })

    it('t=2.9 → 0 harf (hâlâ okuma süresi)', () => {
      expect(bonusRevealedAtTime(2.9)).toBe(0)
    })

    it('t=3 → 0 harf (3 sn okuma bitti ama 1. harf henüz açılmadı)', () => {
      // SPEC: t=4'te ilk harf açılır
      expect(bonusRevealedAtTime(3)).toBe(0)
    })

    it('t=3.9 → 0 harf', () => {
      expect(bonusRevealedAtTime(3.9)).toBe(0)
    })

    it('t=4 → 1 harf', () => {
      expect(bonusRevealedAtTime(4)).toBe(1)
    })

    it('t=5 → 2 harf', () => {
      expect(bonusRevealedAtTime(5)).toBe(2)
    })

    it('t=9 → 6 harf', () => {
      expect(bonusRevealedAtTime(9)).toBe(6)
    })

    it('t=10 → 7 harf (tüm kelime açılmış)', () => {
      expect(bonusRevealedAtTime(10)).toBe(7)
    })

    it('t=15 → 7 harf (üst sınır)', () => {
      expect(bonusRevealedAtTime(15)).toBe(7)
    })
  })

  describe('bonusScoreAtTime', () => {
    it('t=0 → 3000', () => {
      expect(bonusScoreAtTime(0)).toBe(3000)
    })

    it('t=3.9 → 3000 (okuma süresi, harf açılmamış)', () => {
      expect(bonusScoreAtTime(3.9)).toBe(3000)
    })

    it('t=4 → 2800 (1. harf açılmış)', () => {
      expect(bonusScoreAtTime(4)).toBe(2800)
    })

    it('t=9 → 1800 (6. harf açılmış)', () => {
      expect(bonusScoreAtTime(9)).toBe(1800)
    })

    it('t=10 → 0 (7. harf açılmış, hak bitti)', () => {
      expect(bonusScoreAtTime(10)).toBe(0)
    })
  })

  describe('Bonus BİL ile donma mantığı', () => {
    it('okuma süresinde BİL basılırsa puan 3000', () => {
      // t=1 → harf açılmamış → n=0 → bonusScore(0) = 3000
      const scoreAtPress = bonusScoreAtTime(1)
      expect(scoreAtPress).toBe(3000)
    })

    it('t=6 da BİL basılırsa puan 2400', () => {
      // t=6 → n=3 → 3000-600 = 2400
      const scoreAtPress = bonusScoreAtTime(6)
      expect(scoreAtPress).toBe(2400)
    })
  })

  describe('Bonus sabitleri', () => {
    it('toplam süre 10 saniye', () => {
      expect(BONUS_TOTAL_TIME).toBe(10)
    })

    it('yazma süresi 5 saniye', () => {
      expect(BONUS_WRITE_TIME).toBe(5)
    })
  })
})

// ─── 4. 4. Tur Kazanç Tablosu: SPEC 9.1-4 ──────────────────────

describe('4. tur kazanç tablosu (round4FinalScore)', () => {
  const K = 20_000 // Örnek kasa

  it('hiçbir etap tamamlanmadı → 0', () => {
    expect(round4FinalScore(K, null)).toBe(0)
  })

  it('4 harfli etap → K / 2', () => {
    expect(round4FinalScore(K, 4)).toBe(10_000)
  })

  it('5 harfli etap → K', () => {
    expect(round4FinalScore(K, 5)).toBe(20_000)
  })

  it('6 harfli etap → K × 2', () => {
    expect(round4FinalScore(K, 6)).toBe(40_000)
  })

  it('7 harfli etap → 250.000 + K × 2', () => {
    expect(round4FinalScore(K, 7)).toBe(290_000)
  })

  it('K = 0 ise 7 harfli → 250.000', () => {
    expect(round4FinalScore(0, 7)).toBe(250_000)
  })

  it('K = 39000 (max kasa) ve 7 harfli → 250.000 + 78.000 = 328.000', () => {
    expect(round4FinalScore(39_000, 7)).toBe(328_000)
  })

  it('K = 39000 ve 4 harfli → 19.500', () => {
    expect(round4FinalScore(39_000, 4)).toBe(19_500)
  })

  it('geçersiz etap → 0', () => {
    expect(round4FinalScore(K, 3)).toBe(0)
    expect(round4FinalScore(K, 8)).toBe(0)
  })

  it('Math.floor uygulanır (tek sayı kasa)', () => {
    // K=1001, etap 4 → 1001/2 = 500.5 → 500
    expect(round4FinalScore(1001, 4)).toBe(500)
  })
})

// ─── 5. Kasa Hesabı: SPEC 9.1-5 ─────────────────────────────────

describe('Kasa hesabı', () => {
  it('maksimum kasa 39.000', () => {
    expect(MAX_TREASURY).toBe(39_000)
  })

  it('maxRoundPoints hesaplaması doğru', () => {
    // 1. tur: 5×1000 + 3000 = 8000
    expect(maxRoundPoints(1)).toBe(8_000)
    // 2. tur: 5×2000 + 3000 = 13000
    expect(maxRoundPoints(2)).toBe(13_000)
    // 3. tur: 5×3000 + 3000 = 18000
    expect(maxRoundPoints(3)).toBe(18_000)
  })

  it('tüm turların toplamı 39.000', () => {
    const total = maxRoundPoints(1) + maxRoundPoints(2) + maxRoundPoints(3)
    expect(total).toBe(39_000)
  })
})

// ─── 6. Tur Yapılandırması ───────────────────────────────────────

describe('Tur yapılandırması (ROUND_CONFIGS)', () => {
  it('4 tur tanımlı', () => {
    expect(ROUND_CONFIGS).toHaveLength(4)
  })

  it('1. tur: 5 adet 4 harfli, 1000 puan, bonus var', () => {
    const r = ROUND_CONFIGS[0]
    expect(r.round).toBe(1)
    expect(r.wordCount).toBe(5)
    expect(r.letterCount).toBe(4)
    expect(r.pointsPerWord).toBe(1000)
    expect(r.hasBonus).toBe(true)
  })

  it('2. tur: 5 adet 5 harfli, 2000 puan, bonus var', () => {
    const r = ROUND_CONFIGS[1]
    expect(r.round).toBe(2)
    expect(r.wordCount).toBe(5)
    expect(r.letterCount).toBe(5)
    expect(r.pointsPerWord).toBe(2000)
    expect(r.hasBonus).toBe(true)
  })

  it('3. tur: 5 adet 6 harfli, 3000 puan, bonus var', () => {
    const r = ROUND_CONFIGS[2]
    expect(r.round).toBe(3)
    expect(r.wordCount).toBe(5)
    expect(r.letterCount).toBe(6)
    expect(r.pointsPerWord).toBe(3000)
    expect(r.hasBonus).toBe(true)
  })

  it('4. tur: bonus yok, etaplar [4,5,6,7]', () => {
    const r = ROUND_CONFIGS[3]
    expect(r.round).toBe(4)
    expect(r.hasBonus).toBe(false)
    expect(r.stages).toEqual([4, 5, 6, 7])
  })

  it('sabitleri doğru', () => {
    expect(GUESS_TIME_LIMIT).toBe(10)
    expect(ROUND4_TIME_LIMIT).toBe(120)
    expect(MAX_GUESSES).toBe(5)
  })
})

// ─── 7. Kelime Seçici: SPEC 9.1-6 ───────────────────────────────

describe('Kelime seçici (pickWord)', () => {
  const pool = ['araba', 'kitap', 'kale', 'masa', 'kapı']

  it('havuzdan bir kelime seçer', () => {
    const word = pickWord(pool, new Set())
    expect(word).not.toBeNull()
    expect(pool).toContain(word)
  })

  it('kullanılmış kelimeyi seçmez', () => {
    const used = new Set(['araba', 'kitap', 'kale', 'masa'])
    const word = pickWord(pool, used)
    expect(word).toBe('kapı')
  })

  it('havuz tükendiyse null döner', () => {
    const used = new Set(pool)
    const word = pickWord(pool, used)
    expect(word).toBeNull()
  })

  it('100 seçimde tekrar yok', () => {
    const bigPool = Array.from({ length: 200 }, (_, i) => `kelime${i}`)
    const used = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const word = pickWord(bigPool, used)
      expect(word).not.toBeNull()
      expect(used.has(word!)).toBe(false)
      used.add(word!)
    }
    expect(used.size).toBe(100)
  })
})

describe('Bonus kelime seçici (pickBonusWord)', () => {
  const pool = [
    { w: 'bilgisay', d: 'Elektronik cihaz' },
    { w: 'çalışmak', d: 'Emek vermek' },
  ]

  it('bonus kelimesi ve tanımı döner', () => {
    const result = pickBonusWord(pool, new Set())
    expect(result).not.toBeNull()
    expect(result!.word).toBeTruthy()
    expect(result!.definition).toBeTruthy()
  })

  it('kullanılmış bonus kelimesini seçmez', () => {
    const used = new Set(['bilgisay'])
    const result = pickBonusWord(pool, used)
    expect(result).not.toBeNull()
    expect(result!.word).toBe('çalışmak')
  })

  it('havuz tükendiyse null döner', () => {
    const used = new Set(['bilgisay', 'çalışmak'])
    const result = pickBonusWord(pool, used)
    expect(result).toBeNull()
  })
})

describe('shuffleRevealOrder', () => {
  it('8 harfli kelime için 7 indeks döner (0 hariç)', () => {
    const order = shuffleRevealOrder(8)
    expect(order).toHaveLength(7)
    expect(order).not.toContain(0)
    // 1-7 arası tüm indeksler mevcut
    expect(order.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('rastgele sıralama üretir (çoğunlukla farklı)', () => {
    // 100 deneme; en az birinin orijinal sıradan farklı olması gerekir
    const original = [1, 2, 3, 4, 5, 6, 7]
    let differentCount = 0
    for (let i = 0; i < 100; i++) {
      const order = shuffleRevealOrder(8)
      if (JSON.stringify(order) !== JSON.stringify(original)) {
        differentCount++
      }
    }
    expect(differentCount).toBeGreaterThan(90) // çok büyük ihtimalle hepsi farklı
  })
})
