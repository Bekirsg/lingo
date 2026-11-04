import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  KEY_LAYOUT,
  ROW_3_ITEMS,
  COMMIT_ON,
  getCharForLetterKey,
  resolveKeyAtPoint,
  gestureReducer,
  createInitialGestureState,
  createDeleteRepeatSchedule,
  computeKeyStates,
  calculateTileSize,
  type KeyRect,
} from './keyboardLogic'

describe('Klavye Düzeni ve Karakter Kuralları (SPEC-v2 Rev. 3)', () => {
  it('COMMIT_ON varsayılan olarak "down" modundadır', () => {
    expect(COMMIT_ON).toBe('down')
  })

  it('29 Türkçe harf içerir, Q/W/X içermez, yinelenen harf yoktur', () => {
    const allLetters = [...KEY_LAYOUT.row1, ...KEY_LAYOUT.row2, ...KEY_LAYOUT.row3Letters]
    expect(allLetters).toHaveLength(29)

    const unique = new Set(allLetters)
    expect(unique.size).toBe(29)

    expect(allLetters).not.toContain('Q')
    expect(allLetters).not.toContain('W')
    expect(allLetters).not.toContain('X')
  })

  it('Satır 1: 10 harf (E R T Y U I O P Ğ Ü)', () => {
    expect(KEY_LAYOUT.row1).toEqual(['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'])
  })

  it('Satır 2: 11 harf (A S D F G H J K L Ş İ) - İ harfi ikinci satırın sonundadır', () => {
    expect(KEY_LAYOUT.row2).toEqual(['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'])
    expect(KEY_LAYOUT.row2[KEY_LAYOUT.row2.length - 1]).toBe('İ')
  })

  it('Satır 3: [GÖNDER] Z C V B N M Ö Ç [SİL] - GÖNDER başta, SİL sonda', () => {
    expect(ROW_3_ITEMS).toHaveLength(10)
    expect(ROW_3_ITEMS[0].id).toBe('SUBMIT')
    expect(ROW_3_ITEMS[0].label).toBe('GÖNDER')
    expect(ROW_3_ITEMS[ROW_3_ITEMS.length - 1].id).toBe('DELETE')
    expect(ROW_3_ITEMS[ROW_3_ITEMS.length - 1].label).toBe('SİL')

    const middleLetters = ROW_3_ITEMS.slice(1, -1).map((item) => item.id)
    expect(middleLetters).toEqual(['Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç'])
  })

  it('I tuşu "ı", İ tuşu "i" üretir', () => {
    expect(getCharForLetterKey('I')).toBe('ı')
    expect(getCharForLetterKey('İ')).toBe('i')
    expect(getCharForLetterKey('E')).toBe('e')
    expect(getCharForLetterKey('Ğ')).toBe('ğ')
    expect(getCharForLetterKey('Ü')).toBe('ü')
    expect(getCharForLetterKey('Ş')).toBe('ş')
    expect(getCharForLetterKey('Ç')).toBe('ç')
    expect(getCharForLetterKey('Ö')).toBe('ö')
  })
})

describe('resolveKeyAtPoint', () => {
  const rects: KeyRect[] = [
    { id: 'E', x: 10, y: 10, width: 30, height: 50 },
    { id: 'R', x: 45, y: 10, width: 30, height: 50 }, // Arada 5px boşluk var (40..45)
    { id: 'SUBMIT', x: 10, y: 120, width: 60, height: 50, isAction: true },
  ]

  it('tuşun tam içine tıklanınca o tuşu döner', () => {
    expect(resolveKeyAtPoint(rects, 15, 20)).toBe('E')
    expect(resolveKeyAtPoint(rects, 50, 25)).toBe('R')
    expect(resolveKeyAtPoint(rects, 30, 130)).toBe('SUBMIT')
  })

  it('tuşlar arasındaki boşlukta en yakın tuşu döner (ölü alan yok)', () => {
    // x = 41 (E bitişi 40, R başlangıcı 45; E'ye 1px, R'ye 4px)
    expect(resolveKeyAtPoint(rects, 41, 20)).toBe('E')
    // x = 44 (R'ye 1px yakın)
    expect(resolveKeyAtPoint(rects, 44, 20)).toBe('R')
  })

  it('klavye sınırlarının çok dışındaysa null döner', () => {
    expect(resolveKeyAtPoint(rects, 300, 500, 30)).toBeNull()
  })
})

describe('gestureReducer (Giriş Davranışı - COMMIT_ON = down)', () => {
  it('harf tuşuna POINTER_DOWN olunca anında CHAR aksiyonu üretir', () => {
    let state = createInitialGestureState()
    const downRes = gestureReducer(
      state,
      {
        type: 'POINTER_DOWN',
        pointerId: 1,
        keyId: 'A',
      },
      'down',
    )

    expect(downRes.action).toEqual({ type: 'CHAR', char: 'a', keyId: 'A' })
    expect(downRes.nextState.pointers[1].hasCommitted).toBe(true)

    // POINTER_UP anında tekrar yazmaz
    const upRes = gestureReducer(
      downRes.nextState,
      {
        type: 'POINTER_UP',
        pointerId: 1,
      },
      'down',
    )
    expect(upRes.action).toBeUndefined()
  })

  it('COMMIT_ON = down modunda parmak basılıyken kaydırılsa bile ek harf yazılmaz', () => {
    let state = createInitialGestureState()
    const downRes = gestureReducer(
      state,
      {
        type: 'POINTER_DOWN',
        pointerId: 1,
        keyId: 'A',
      },
      'down',
    )
    state = downRes.nextState

    // S üzerine kaydırıldı
    const moveRes = gestureReducer(
      state,
      {
        type: 'POINTER_MOVE',
        pointerId: 1,
        keyId: 'S',
      },
      'down',
    )
    expect(moveRes.action).toBeUndefined()

    // Parmak kalkınca da yeni harf girilmez
    const upRes = gestureReducer(
      moveRes.nextState,
      {
        type: 'POINTER_UP',
        pointerId: 1,
      },
      'down',
    )
    expect(upRes.action).toBeUndefined()
  })

  it('GÖNDER: parmak aynı tuştayken POINTER_UP anında SUBMIT üretir', () => {
    let state = createInitialGestureState()
    const downRes = gestureReducer(
      state,
      {
        type: 'POINTER_DOWN',
        pointerId: 1,
        keyId: 'SUBMIT',
        isAction: true,
      },
      'down',
    )
    expect(downRes.action).toBeUndefined()

    const upRes = gestureReducer(
      downRes.nextState,
      {
        type: 'POINTER_UP',
        pointerId: 1,
      },
      'down',
    )
    expect(upRes.action).toEqual({ type: 'SUBMIT' })
  })

  it('GÖNDER tuşuna basıp dışarı kaydırılırsa iptal edilir', () => {
    let state = createInitialGestureState()
    state = gestureReducer(
      state,
      {
        type: 'POINTER_DOWN',
        pointerId: 1,
        keyId: 'SUBMIT',
        isAction: true,
      },
      'down',
    ).nextState

    // Dışarı kaydırıldı
    state = gestureReducer(
      state,
      {
        type: 'POINTER_MOVE',
        pointerId: 1,
        keyId: 'Z',
      },
      'down',
    ).nextState

    const upRes = gestureReducer(
      state,
      {
        type: 'POINTER_UP',
        pointerId: 1,
      },
      'down',
    )
    expect(upRes.action).toBeUndefined()
  })

  it('SİL tuşu POINTER_DOWN anında DELETE_START, POINTER_UP anında DELETE_STOP üretir', () => {
    const downRes = gestureReducer(
      createInitialGestureState(),
      {
        type: 'POINTER_DOWN',
        pointerId: 1,
        keyId: 'DELETE',
        isAction: true,
      },
      'down',
    )
    expect(downRes.action).toEqual({ type: 'DELETE_START' })

    const upRes = gestureReducer(
      downRes.nextState,
      {
        type: 'POINTER_UP',
        pointerId: 1,
      },
      'down',
    )
    expect(upRes.action).toEqual({ type: 'DELETE_STOP' })
  })

  it('çoklu dokunma (multi-pointer) bağımsız çalışır', () => {
    let state = createInitialGestureState()
    // Sol başparmak A'ya bastı
    const p1 = gestureReducer(
      state,
      {
        type: 'POINTER_DOWN',
        pointerId: 10,
        keyId: 'A',
      },
      'down',
    )
    expect(p1.action).toEqual({ type: 'CHAR', char: 'a', keyId: 'A' })
    state = p1.nextState

    // Sağ başparmak K'ya bastı
    const p2 = gestureReducer(
      state,
      {
        type: 'POINTER_DOWN',
        pointerId: 20,
        keyId: 'K',
      },
      'down',
    )
    expect(p2.action).toEqual({ type: 'CHAR', char: 'k', keyId: 'K' })
  })
})

describe('createDeleteRepeatSchedule', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('basılı tutulunca 400ms sonra tekrarlı silme tetikler', () => {
    const tick = vi.fn()
    const schedule = createDeleteRepeatSchedule(tick, {
      initialDelayMs: 400,
      normalIntervalMs: 80,
      fastIntervalMs: 50,
      fastThresholdMs: 1000,
    })

    schedule.start()
    expect(schedule.isRunning()).toBe(true)
    expect(tick).not.toHaveBeenCalled()

    vi.advanceTimersByTime(399)
    expect(tick).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(tick).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(80)
    expect(tick).toHaveBeenCalledTimes(2)

    schedule.stop()
    expect(schedule.isRunning()).toBe(false)
  })
})

describe('computeKeyStates', () => {
  it('yeşil > sarı > kırmızı önceliğini korur', () => {
    const guesses = [
      {
        guess: 'kalem',
        marks: ['yellow', 'red', 'green', 'red', 'red'] as const,
      },
      {
        guess: 'kapan',
        marks: ['green', 'yellow', 'red', 'red', 'red'] as const,
      },
    ]

    const states = computeKeyStates(guesses as any)
    expect(states['k']).toBe('green')
    expect(states['l']).toBe('green')
    expect(states['a']).toBe('yellow')
    expect(states['e']).toBe('red')
  })
})

describe('calculateTileSize (Dinamik Tahta Kutu Boyutu Hesabı)', () => {
  it('320×568 dar ekranda (270px kullanılabilir yükseklik) 4 harfli kelime kaydırmasız sığar', () => {
    const res = calculateTileSize({
      availableWidth: 320,
      availableHeight: 270,
      letterCount: 4,
      rowCount: 5,
      maxTileSize: 64,
      minTileSize: 28,
      gapX: 6,
      gapY: 6,
      paddingX: 8,
      paddingY: 6,
    })

    // Yükseklik 270px sınırını aşmamalı
    expect(res.boardHeight).toBeLessThanOrEqual(270)
    // Kutu boyutu makul olmalı
    expect(res.tileSize).toBeGreaterThanOrEqual(44)
    expect(res.tileSize).toBeLessThanOrEqual(64)
  })

  it('320×568 dar ekranda 7 harfli kelime de sığar', () => {
    const res = calculateTileSize({
      availableWidth: 320,
      availableHeight: 270,
      letterCount: 7,
      rowCount: 5,
      maxTileSize: 64,
      minTileSize: 28,
      gapX: 4,
      gapY: 4,
      paddingX: 8,
      paddingY: 6,
    })

    expect(res.boardHeight).toBeLessThanOrEqual(270)
    expect(res.boardWidth).toBeLessThanOrEqual(320)
  })

  it('393×852 modern ekranda 4 harfli kutular üst sınıra (64px) ulaşır', () => {
    const res = calculateTileSize({
      availableWidth: 393,
      availableHeight: 480,
      letterCount: 4,
      rowCount: 5,
      maxTileSize: 64,
      minTileSize: 28,
      gapX: 6,
      gapY: 6,
      paddingX: 8,
      paddingY: 6,
    })

    expect(res.tileSize).toBe(64)
  })
})
