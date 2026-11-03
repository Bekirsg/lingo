import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  KEYBOARD_ROW_1,
  KEYBOARD_ROW_2,
  KEYBOARD_ROW_3,
  ACTION_ROW,
  getCharForLetterKey,
  resolveKeyAtPoint,
  gestureReducer,
  createInitialGestureState,
  createDeleteRepeatSchedule,
  computeKeyStates,
  type KeyRect,
} from './keyboardLogic'

describe('Klavye Düzeni ve Karakter Kuralları', () => {
  it('29 Türkçe harf içerir, Q/W/X içermez, yinelenen harf yoktur', () => {
    const allLetters = [...KEYBOARD_ROW_1, ...KEYBOARD_ROW_2, ...KEYBOARD_ROW_3]
    expect(allLetters).toHaveLength(29)

    // Yinelenen harf kontrolü
    const unique = new Set(allLetters)
    expect(unique.size).toBe(29)

    // Q, W, X harflerinin olmadığını doğrula
    expect(allLetters).not.toContain('Q')
    expect(allLetters).not.toContain('W')
    expect(allLetters).not.toContain('X')

    // Satır sayıları
    expect(KEYBOARD_ROW_1).toHaveLength(10)
    expect(KEYBOARD_ROW_2).toHaveLength(10)
    expect(KEYBOARD_ROW_3).toHaveLength(9)
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

  it('ACTION_ROW tek sabittir ve PAS, SİL, GÖNDER içerir', () => {
    expect(ACTION_ROW).toHaveLength(3)
    expect(ACTION_ROW[0].id).toBe('PAS')
    expect(ACTION_ROW[1].id).toBe('DELETE')
    expect(ACTION_ROW[2].id).toBe('SUBMIT')
  })
})

describe('resolveKeyAtPoint', () => {
  const rects: KeyRect[] = [
    { id: 'E', x: 10, y: 10, width: 30, height: 44 },
    { id: 'R', x: 44, y: 10, width: 30, height: 44 }, // Arada 4px boşluk var (40..44)
    { id: 'PAS', x: 10, y: 100, width: 60, height: 44, isAction: true },
  ]

  it('tuşun tam içine tıklanınca o tuşu döner', () => {
    expect(resolveKeyAtPoint(rects, 15, 20)).toBe('E')
    expect(resolveKeyAtPoint(rects, 50, 25)).toBe('R')
    expect(resolveKeyAtPoint(rects, 30, 110)).toBe('PAS')
  })

  it('tuşlar arasındaki boşlukta en yakın tuşu döner (ölü alan yok)', () => {
    // x = 41 (E bitişi 40, R başlangıcı 44; x=41 E'ye 1px, R'ye 3px)
    expect(resolveKeyAtPoint(rects, 41, 20)).toBe('E')
    // x = 43 (R'ye 1px yakın)
    expect(resolveKeyAtPoint(rects, 43, 20)).toBe('R')
  })

  it('klavye alanının çok dışındaysa null döner (iptal)', () => {
    expect(resolveKeyAtPoint(rects, 300, 500, 30)).toBeNull()
    expect(resolveKeyAtPoint(rects, -100, 0, 30)).toBeNull()
  })
})

describe('gestureReducer (Pointer Hareket Mantığı)', () => {
  it('harf tuşuna basılıp aynı tuşta parmak kalkınca harfi onaylar', () => {
    let state = createInitialGestureState()
    const downRes = gestureReducer(state, {
      type: 'POINTER_DOWN',
      pointerId: 1,
      keyId: 'A',
    })
    state = downRes.nextState
    expect(downRes.action).toBeUndefined()

    const upRes = gestureReducer(state, {
      type: 'POINTER_UP',
      pointerId: 1,
    })
    expect(upRes.action).toEqual({ type: 'CHAR', char: 'a', keyId: 'A' })
    expect(upRes.nextState.pointers[1]).toBeUndefined()
  })

  it('yanlış tuşa basıp kaydırarak doğru tuşta bırakınca bırakılan harfi yazar', () => {
    let state = createInitialGestureState()
    // A'ya bastı
    state = gestureReducer(state, {
      type: 'POINTER_DOWN',
      pointerId: 1,
      keyId: 'A',
    }).nextState

    // S'ye kaydırdı
    state = gestureReducer(state, {
      type: 'POINTER_MOVE',
      pointerId: 1,
      keyId: 'S',
    }).nextState

    // S üzerinde parmağı kaldırdı
    const upRes = gestureReducer(state, {
      type: 'POINTER_UP',
      pointerId: 1,
    })
    expect(upRes.action).toEqual({ type: 'CHAR', char: 's', keyId: 'S' })
  })

  it('klavye dışına kaydırılıp bırakılırsa veya cancel olursa iptal edilir', () => {
    let state = createInitialGestureState()
    state = gestureReducer(state, {
      type: 'POINTER_DOWN',
      pointerId: 1,
      keyId: 'A',
    }).nextState

    // Dışarı çıktı (keyId: null)
    state = gestureReducer(state, {
      type: 'POINTER_MOVE',
      pointerId: 1,
      keyId: null,
    }).nextState

    const upRes = gestureReducer(state, {
      type: 'POINTER_UP',
      pointerId: 1,
    })
    expect(upRes.action).toBeUndefined()

    // cancel senaryosu
    let cancelState = gestureReducer(createInitialGestureState(), {
      type: 'POINTER_DOWN',
      pointerId: 2,
      keyId: 'B',
    }).nextState

    const cancelRes = gestureReducer(cancelState, {
      type: 'POINTER_CANCEL',
      pointerId: 2,
    })
    expect(cancelRes.action).toBeUndefined()
    expect(cancelRes.nextState.pointers[2]).toBeUndefined()
  })

  it('GÖNDER ve PAS tuşlarında kaydırma iptal koruması: yalnızca aynı tuşta up olursa tetiklenir', () => {
    // 1) GÖNDER'e basıp harfe kayarsa -> tetiklenmez!
    let state = gestureReducer(createInitialGestureState(), {
      type: 'POINTER_DOWN',
      pointerId: 1,
      keyId: 'SUBMIT',
      isAction: true,
    }).nextState

    state = gestureReducer(state, {
      type: 'POINTER_MOVE',
      pointerId: 1,
      keyId: 'L',
    }).nextState

    let upRes = gestureReducer(state, {
      type: 'POINTER_UP',
      pointerId: 1,
    })
    expect(upRes.action).toBeUndefined()

    // 2) GÖNDER'e basıp aynı tuşta up olursa -> SUBMIT tetiklenir
    state = gestureReducer(createInitialGestureState(), {
      type: 'POINTER_DOWN',
      pointerId: 1,
      keyId: 'SUBMIT',
      isAction: true,
    }).nextState

    upRes = gestureReducer(state, {
      type: 'POINTER_UP',
      pointerId: 1,
    })
    expect(upRes.action).toEqual({ type: 'SUBMIT' })

    // 3) PAS'a basıp aynı tuşta up olursa -> PASS tetiklenir
    state = gestureReducer(createInitialGestureState(), {
      type: 'POINTER_DOWN',
      pointerId: 1,
      keyId: 'PAS',
      isAction: true,
    }).nextState

    upRes = gestureReducer(state, {
      type: 'POINTER_UP',
      pointerId: 1,
    })
    expect(upRes.action).toEqual({ type: 'PASS' })
  })

  it('SİL tuşuna basıldığında DELETE_START, parmak kalkınca DELETE_STOP üretir', () => {
    const downRes = gestureReducer(createInitialGestureState(), {
      type: 'POINTER_DOWN',
      pointerId: 1,
      keyId: 'DELETE',
      isAction: true,
    })
    expect(downRes.action).toEqual({ type: 'DELETE_START' })

    const upRes = gestureReducer(downRes.nextState, {
      type: 'POINTER_UP',
      pointerId: 1,
    })
    expect(upRes.action).toEqual({ type: 'DELETE_STOP' })
  })

  it('çoklu dokunma (multi-pointer) bağımsız çalışır', () => {
    let state = createInitialGestureState()
    // Sol başparmak A'ya bastı
    state = gestureReducer(state, {
      type: 'POINTER_DOWN',
      pointerId: 10,
      keyId: 'A',
    }).nextState

    // Sağ başparmak K'ya bastı
    state = gestureReducer(state, {
      type: 'POINTER_DOWN',
      pointerId: 20,
      keyId: 'K',
    }).nextState

    expect(Object.keys(state.pointers)).toHaveLength(2)

    // Sol başparmak kalktı (A yazıldı)
    const upLeft = gestureReducer(state, {
      type: 'POINTER_UP',
      pointerId: 10,
    })
    expect(upLeft.action).toEqual({ type: 'CHAR', char: 'a', keyId: 'A' })
    state = upLeft.nextState
    expect(state.pointers[10]).toBeUndefined()
    expect(state.pointers[20]).toBeDefined()

    // Sağ başparmak kalktı (K yazıldı)
    const upRight = gestureReducer(state, {
      type: 'POINTER_UP',
      pointerId: 20,
    })
    expect(upRight.action).toEqual({ type: 'CHAR', char: 'k', keyId: 'K' })
  })
})

describe('createDeleteRepeatSchedule', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('basılı tutulunca 400ms sonra tekrarlı silme başlatır, stop ile sızıntısız durur', () => {
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

    // 399ms: henüz tetiklenmedi
    vi.advanceTimersByTime(399)
    expect(tick).not.toHaveBeenCalled()

    // 400ms: ilk tekrar vuruşu
    vi.advanceTimersByTime(1)
    expect(tick).toHaveBeenCalledTimes(1)

    // 480ms: ikinci vuruş (80ms sonra)
    vi.advanceTimersByTime(80)
    expect(tick).toHaveBeenCalledTimes(2)

    // stop çağrılınca durur
    schedule.stop()
    expect(schedule.isRunning()).toBe(false)
    vi.advanceTimersByTime(500)
    expect(tick).toHaveBeenCalledTimes(2)
  })
})

describe('computeKeyStates (Harf Renk Öncelikleri)', () => {
  it('yeşil > sarı > kırmızı önceliğini uygular', () => {
    // 1. Tahminde: 'k' sarı, 'a' kırmızı, 'l' yeşil
    // 2. Tahminde: 'k' yeşil oldu, 'a' sarı oldu
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
    expect(states['k']).toBe('green') // yellow -> green oldu
    expect(states['l']).toBe('green') // yeşil korundu
    expect(states['a']).toBe('yellow') // red -> yellow yükseldi
    expect(states['e']).toBe('red')
    expect(states['m']).toBe('red')
    expect(states['p']).toBe('red')
    expect(states['n']).toBe('red')
  })

  it('yeşil harf sonraki tahminde kırmızı veya sarı çıksa bile yeşil kalır', () => {
    const guesses = [
      {
        guess: 'tatar',
        marks: ['green', 'red', 'yellow', 'red', 'red'] as const,
      },
      {
        guess: 'tabak',
        marks: ['yellow', 'red', 'red', 'red', 'red'] as const,
      },
    ]

    const states = computeKeyStates(guesses as any)
    expect(states['t']).toBe('green') // 2. tahminde yellow çıksa da ilkinde yeşil olduğu için yeşil kalır
  })
})
