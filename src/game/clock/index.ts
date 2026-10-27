/**
 * LİNGO Zaman Servisi (Clock Service)
 *
 * SPEC Bölüm 2.1-3, 2.1-4:
 * - Tüm geri sayımlar performance.now() zaman damgasına dayanır (setInterval drift olmaz).
 * - Duraklat/devam destekler (zaman kaybı/kazancı olmaz).
 * - Sekme gizlenince / arka plana atılınca otomatik duraklama desteği sunar.
 * - Testlerde tam determinizm için sahte saat (nowFn enjeksiyonu) destekler.
 */

export interface ClockOptions {
  /** Süre (saniye) */
  durationSeconds?: number
  /** Zaman kaynağı (varsayılan: performance.now) */
  nowFn?: () => number
  /** Süre bittiğinde tetiklenecek fonksiyon */
  onExpire?: () => void
  /** Her tick'te (veya sorguda) kalan süreyi bildiren callback */
  onTick?: (remainingSeconds: number) => void
  /** Otomatik tarayıcı arka plan olaylarını dinle (varsayılan: true) */
  autoBackgroundPause?: boolean
}

export type ClockState = 'idle' | 'running' | 'paused' | 'expired'

export class Clock {
  private durationMs: number = 0
  private startTimestamp: number = 0
  private pauseTimestamp: number = 0
  private totalPausedMs: number = 0
  private state: ClockState = 'idle'
  private nowFn: () => number
  private onExpire?: () => void
  private onTick?: (remainingSeconds: number) => void
  private timerId: ReturnType<typeof setTimeout> | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  private cleanupListeners?: () => void

  constructor(options?: ClockOptions) {
    this.nowFn = options?.nowFn ?? (() => {
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now()
      }
      return Date.now()
    })
    this.onExpire = options?.onExpire
    this.onTick = options?.onTick

    if (options?.durationSeconds !== undefined) {
      this.durationMs = options.durationSeconds * 1000
    }

    if (options?.autoBackgroundPause && typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.attachBackgroundListeners()
    }
  }

  /**
   * Sayacı başlatır.
   * @param durationSeconds Süre (saniye). Eğer verilmezse constructor'daki süre kullanılır.
   * @param onExpire Opsiyonel süre bitiş callback'i.
   */
  start(durationSeconds?: number, onExpire?: () => void): void {
    this.stop()
    if (durationSeconds !== undefined) {
      this.durationMs = durationSeconds * 1000
    }
    if (onExpire !== undefined) {
      this.onExpire = onExpire
    }

    this.totalPausedMs = 0
    this.pauseTimestamp = 0
    this.startTimestamp = this.nowFn()
    this.state = 'running'

    this.scheduleExpire()
    this.startTicker()
  }

  /**
   * Sayacı duraklatır (tüm süre donar).
   */
  pause(): void {
    if (this.state !== 'running') return

    this.pauseTimestamp = this.nowFn()
    this.state = 'paused'
    this.clearTimers()
  }

  /**
   * Duraklatılmış sayacı kaldığı yerden devam ettirir.
   */
  resume(): void {
    if (this.state !== 'paused') return

    const pauseDuration = this.nowFn() - this.pauseTimestamp
    this.totalPausedMs += Math.max(0, pauseDuration)
    this.pauseTimestamp = 0
    this.state = 'running'

    // Kalan süreyi kontrol et
    if (this.getRemainingMs() <= 0) {
      this.handleExpire()
      return
    }

    this.scheduleExpire()
    this.startTicker()
  }

  /**
   * Sayacı tamamen durdurur ve sıfırlar.
   */
  stop(): void {
    this.clearTimers()
    this.state = 'idle'
    this.durationMs = 0
    this.startTimestamp = 0
    this.pauseTimestamp = 0
    this.totalPausedMs = 0
  }

  /**
   * Testler veya simülasyon için zamanı sahte olarak ileri sarar.
   * Eğer harici sahte nowFn kullanılıyorsa, o fonksiyon zamanı artırmalıdır;
   * bu metod ise süre bitimi tetiklenmesini ve tick'leri anında denetler.
   */
  check(): void {
    if (this.state === 'running') {
      if (this.getRemainingMs() <= 0) {
        this.handleExpire()
      } else {
        this.onTick?.(this.getRemainingSeconds())
      }
    }
  }

  /**
   * Geçen süreyi milisaniye cinsinden döner (duraklatma süreleri hariç).
   */
  getElapsedMs(): number {
    if (this.state === 'idle') return 0

    const currentNow = this.state === 'paused' ? this.pauseTimestamp : this.nowFn()
    const rawElapsed = currentNow - this.startTimestamp - this.totalPausedMs
    return Math.max(0, Math.min(rawElapsed, this.durationMs))
  }

  /**
   * Geçen süreyi saniye cinsinden döner.
   */
  getElapsedSeconds(): number {
    return this.getElapsedMs() / 1000
  }

  /**
   * Kalan süreyi milisaniye cinsinden döner.
   */
  getRemainingMs(): number {
    if (this.state === 'idle') return this.durationMs
    if (this.state === 'expired') return 0

    const remaining = this.durationMs - this.getElapsedMs()
    return Math.max(0, remaining)
  }

  /**
   * Kalan süreyi saniye cinsinden döner.
   */
  getRemainingSeconds(): number {
    return this.getRemainingMs() / 1000
  }

  getState(): ClockState {
    return this.state
  }

  isRunning(): boolean {
    return this.state === 'running'
  }

  isPaused(): boolean {
    return this.state === 'paused'
  }

  isExpired(): boolean {
    return this.state === 'expired'
  }

  private scheduleExpire(): void {
    this.clearTimers()
    const remainingMs = this.getRemainingMs()
    if (remainingMs <= 0) {
      this.handleExpire()
      return
    }

    // Gerçek zamanlı ortamlarda setTimeout ile süre sonu tetikle
    if (typeof setTimeout !== 'undefined') {
      this.timerId = setTimeout(() => {
        this.check()
      }, remainingMs)
    }
  }

  private startTicker(): void {
    if (typeof setInterval !== 'undefined' && this.onTick) {
      this.intervalId = setInterval(() => {
        if (this.state === 'running') {
          this.onTick?.(this.getRemainingSeconds())
        }
      }, 100)
    }
  }

  private clearTimers(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private handleExpire(): void {
    this.clearTimers()
    this.state = 'expired'
    this.onTick?.(0)
    this.onExpire?.()
  }

  /**
   * Tarayıcı visibilitychange, pagehide ve blur dinleyicilerini bağlar.
   */
  private attachBackgroundListeners(): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        this.pause()
      }
    }

    const handlePageHide = () => {
      this.pause()
    }

    const handleBlur = () => {
      this.pause()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('blur', handleBlur)

    this.cleanupListeners = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('blur', handleBlur)
    }
  }

  /**
   * Dinleyicileri temizler.
   */
  destroy(): void {
    this.stop()
    this.cleanupListeners?.()
  }
}
