/**
 * LİNGO v2 — Yarışma Seviye Entegrasyonu Testleri (V2-M4)
 * SPEC-v2 Bölüm 4.2, 4.3, 5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GameController } from './state'
import { createWordRepository, type WordRepository } from '../data/words'
import {
  getLevelRecords,
  recordLevelGameResult,
} from '../data/storage'

function createLocalStorageMock() {
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

describe('V2-M4 Yarışma Seviye Akışı ve Havuz Entegrasyonu', () => {
  let repo: WordRepository

  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock())

    // Test için minik bir kelime deposu
    repo = createWordRepository({
      words4: ['ayak', 'elma', 'masa', 'kutu', 'baba', 'anne', 'kale', 'boru', 'kedi', 'taka'],
      words5: ['kalem', 'kitap', 'araba', 'çanta', 'ekmek', 'çorap', 'bıçak', 'kaşık', 'tabak', 'sehpa'],
      words6: ['bilmek', 'gelmek', 'gitmek', 'okumak', 'yazmak', 'sevmek', 'bakmak', 'görmek', 'kalmak', 'satmak'],
      words7: ['anahtar', 'pencere', 'çalışma', 'öğrenci', 'hastane', 'belediye', 'lokanta', 'oyuncak', 'telefon', 'merdiven'],
      bonus8: [
        { w: 'sandalye', d: 'Oturmaya yarayan eşya' },
        { w: 'portakal', d: 'Turunçgil meyvesi' },
        { w: 'tencere', d: 'Yemek pişirme kabı' },
      ],
      levels: {
        4: {
          kolay: ['ayak', 'elma', 'masa'],
          orta: ['kutu', 'baba', 'anne'],
        },
        5: {
          kolay: ['kalem', 'kitap', 'araba'],
          orta: ['çanta', 'ekmek', 'çorap'],
        },
        6: {
          kolay: ['bilmek', 'gelmek', 'gitmek'],
          orta: ['okumak', 'yazmak', 'sevmek'],
        },
        7: {
          kolay: ['anahtar', 'pencere', 'çalışma'],
          orta: ['öğrenci', 'hastane', 'belediye'],
        },
        8: {
          kolay: ['sandalye'],
          orta: ['portakal'],
        },
      },
    })
  })

  it('GameController seçilen seviyeyi doğru saklar ve state.level olarak sunar', () => {
    const game = new GameController({ words: repo, level: 'kolay' })
    expect(game.getState().level).toBe('kolay')

    game.startNewGame('orta')
    expect(game.getState().level).toBe('orta')

    game.startGame('zor')
    expect(game.getState().level).toBe('zor')
  })

  it('Kolay seviyesinde 1. tur kelimesi Kolay havuzundan seçilir', () => {
    const game = new GameController({ words: repo, level: 'kolay' })
    game.startNewGame('kolay')

    const currentWord = game.getState().roundState?.currentWord
    expect(['ayak', 'elma', 'masa']).toContain(currentWord)
  })

  it('Orta seviyesinde kelime (Kolay ∪ Orta) havuzundan seçilir', () => {
    const game = new GameController({ words: repo, level: 'orta' })
    game.startNewGame('orta')

    const currentWord = game.getState().roundState?.currentWord
    expect(['ayak', 'elma', 'masa', 'kutu', 'baba', 'anne']).toContain(currentWord)
  })

  it('Zor seviyesinde tüm kelimeler arasından seçilebilir', () => {
    const game = new GameController({ words: repo, level: 'zor' })
    game.startNewGame('zor')

    const currentWord = game.getState().roundState?.currentWord
    expect(repo.getWords(4)).toContain(currentWord)
  })

  it('Kolay havuzu tükenirse yedek kural (Orta -> Zor) devreye girer', () => {
    // 4 harfli kolay kelimeleri tüket
    const used = new Set(['ayak', 'elma', 'masa'])
    const res = repo.pickWordByLevel!(4, 'kolay', used)
    expect(res).not.toBeNull()
    // Kolay bittiği için Orta havuzundan ('kutu', 'baba', 'anne') seçilmeli
    expect(['kutu', 'baba', 'anne']).toContain(res!.word)
    expect(res!.fromLevel).toBe('orta')
  })

  it('Kolay ve Orta havuzları tükenirse Zor havuzundan seçilir', () => {
    const used = new Set(['ayak', 'elma', 'masa', 'kutu', 'baba', 'anne'])
    const res = repo.pickWordByLevel!(4, 'kolay', used)
    expect(res).not.toBeNull()
    // Hem kolay hem orta bitti, Zor havuzundan ('kale', 'boru', 'kedi', 'taka') gelmeli
    expect(['kale', 'boru', 'kedi', 'taka']).toContain(res!.word)
    expect(res!.fromLevel).toBe('zor')
  })

  it('Seviye verisi (levels) yoksa console.warn basıp sessizce Zor havuzundan seçer', () => {
    const repoWithoutLevels = createWordRepository({
      words4: ['test', 'kelm'],
      words5: ['denem'],
      words6: ['kelime'],
      words7: ['kelimel'],
    })

    const res = repoWithoutLevels.pickWordByLevel!(4, 'kolay', new Set())
    expect(res).not.toBeNull()
    expect(['test', 'kelm']).toContain(res!.word)
    expect(res!.fromLevel).toBe('zor')
  })

  it('Seviye rekorları bağımsızdır ve oyun sonu kaydı doğru seviyeye yazılır', () => {
    const resultKolay = recordLevelGameResult('kolay', 12000, 4)
    expect(resultKolay.isNewRecord).toBe(true)
    expect(getLevelRecords().kolay).toBe(12000)
    expect(getLevelRecords().orta).toBe(0)
    expect(getLevelRecords().zor).toBe(0)

    // Orta seviyede daha düşük bir skor
    const resultOrta = recordLevelGameResult('orta', 8000, 5)
    expect(resultOrta.isNewRecord).toBe(true) // Orta için ilk rekor
    expect(getLevelRecords().kolay).toBe(12000)
    expect(getLevelRecords().orta).toBe(8000)
    expect(getLevelRecords().zor).toBe(0)

    // Kolay seviyede daha düşük bir skor rekor sayılmaz
    const lowKolay = recordLevelGameResult('kolay', 5000, 4)
    expect(lowKolay.isNewRecord).toBe(false)
    expect(getLevelRecords().kolay).toBe(12000)
  })
})
