import { describe, it, expect } from 'vitest'
import { Clock } from './index'

describe('Clock Service (SPEC Bölüm 2.1-3, 2.1-4)', () => {
  it('sahte saat enjeksiyonu ile çalışır', () => {
    let currentTime = 1000
    const clock = new Clock({
      nowFn: () => currentTime,
    })

    clock.start(10) // 10 saniye
    expect(clock.isRunning()).toBe(true)
    expect(clock.getRemainingSeconds()).toBe(10)
    expect(clock.getElapsedSeconds()).toBe(0)

    // 4 saniye ileri sar
    currentTime += 4000
    clock.check()
    expect(clock.getRemainingSeconds()).toBe(6)
    expect(clock.getElapsedSeconds()).toBe(4)

    // 6 saniye daha ileri sar -> süre biter
    currentTime += 6000
    clock.check()
    expect(clock.getRemainingSeconds()).toBe(0)
    expect(clock.getElapsedSeconds()).toBe(10)
    expect(clock.isExpired()).toBe(true)
  })

  it('duraklat/devam ettiğinde süre kaybı veya kazancı olmaz (SPEC 9.1-7)', () => {
    let currentTime = 0
    let expired = false

    const clock = new Clock({
      nowFn: () => currentTime,
      onExpire: () => {
        expired = true
      },
    })

    clock.start(10) // 10 saniyelik sayaç

    // 3 saniye aktı
    currentTime += 3000
    clock.check()
    expect(clock.getRemainingSeconds()).toBe(7)
    expect(clock.getElapsedSeconds()).toBe(3)

    // Oyun duraklatıldı (örneğin sekme arka plana atıldı)
    clock.pause()
    expect(clock.isPaused()).toBe(true)

    // Oyuncu 1 saat (3.600.000 ms) dışarıda kaldı
    currentTime += 3_600_000
    clock.check()

    // Duraklatılmışken kalan süre ve geçen süre kesinlikle değişmemeli!
    expect(clock.getRemainingSeconds()).toBe(7)
    expect(clock.getElapsedSeconds()).toBe(3)
    expect(expired).toBe(false)

    // Oyuncu geri döndü ve "Devam Et" dedi
    clock.resume()
    expect(clock.isRunning()).toBe(true)
    expect(clock.getRemainingSeconds()).toBe(7)
    expect(clock.getElapsedSeconds()).toBe(3)

    // 4 saniye daha oynadı
    currentTime += 4000
    clock.check()
    expect(clock.getRemainingSeconds()).toBe(3)
    expect(clock.getElapsedSeconds()).toBe(7)

    // Son 3 saniye doldu -> süre bitti
    currentTime += 3000
    clock.check()
    expect(clock.getRemainingSeconds()).toBe(0)
    expect(clock.isExpired()).toBe(true)
    expect(expired).toBe(true)
  })

  it('birden fazla kez duraklat/devam doğru çalışır', () => {
    let currentTime = 10_000
    const clock = new Clock({ nowFn: () => currentTime })

    clock.start(10)

    // 2 sn geç
    currentTime += 2000
    clock.check()
    expect(clock.getRemainingSeconds()).toBe(8)

    // 1. duraklatma (5 sn durdu)
    clock.pause()
    currentTime += 5000
    clock.resume()
    expect(clock.getRemainingSeconds()).toBe(8)

    // 3 sn geç
    currentTime += 3000
    clock.check()
    expect(clock.getRemainingSeconds()).toBe(5)

    // 2. duraklatma (10 sn durdu)
    clock.pause()
    currentTime += 10_000
    clock.resume()
    expect(clock.getRemainingSeconds()).toBe(5)

    // 5 sn geç -> bitti
    currentTime += 5000
    clock.check()
    expect(clock.getRemainingSeconds()).toBe(0)
    expect(clock.isExpired()).toBe(true)
  })

  it('stop() sayacı sıfırlar', () => {
    let currentTime = 0
    const clock = new Clock({ nowFn: () => currentTime })

    clock.start(10)
    currentTime += 3000
    clock.check()

    clock.stop()
    expect(clock.getState()).toBe('idle')
    expect(clock.getElapsedSeconds()).toBe(0)
    expect(clock.getRemainingSeconds()).toBe(0)
  })
})
