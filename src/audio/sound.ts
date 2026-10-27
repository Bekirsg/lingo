/**
 * LİNGO WebAudio Ses Motoru
 *
 * SPEC Bölüm 6.5:
 * - Telif/ağ/dosya sorunu olmaması için WebAudio ile kodla üretilen kısa efektler.
 * - Olaylar: tuş vuruşu, harf renk açılışı (flip), kelime bilindi, kelime kaybı/geçersiz,
 *   3-2-1 geri sayım tikleri, son 3 sn uyarısı, bonus harf açılışı, etap tamamlandı, final ve yeni rekor.
 * - AudioContext ilk kullanıcı dokunuşunda başlatılır (tarayıcı kuralı).
 * - Sekme gizliyken ses çalmaz (visibilitychange ile suspend).
 * - Hafif sentezleyici sesler — ana thread'i bloklamaz, kare düşürmez.
 */

import { getSettings } from '../data/storage'

export type SoundType =
  | 'key_press'
  | 'tile_flip'
  | 'word_won'
  | 'word_lost'
  | 'invalid_word'
  | 'countdown_tick'
  | 'countdown_go'
  | 'time_warning'
  | 'bonus_reveal'
  | 'stage_cleared'
  | 'game_over'
  | 'new_record'

let audioCtx: AudioContext | null = null
let isUnlocked = false
let masterGain: GainNode | null = null

/**
 * AudioContext örneğini oluşturur veya mevcut olanı döndürür.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext

    if (AudioContextClass) {
      try {
        audioCtx = new AudioContextClass()
        masterGain = audioCtx.createGain()
        masterGain.gain.setValueAtTime(0.3, audioCtx.currentTime)
        masterGain.connect(audioCtx.destination)
      } catch {
        audioCtx = null
      }
    }
  }

  return audioCtx
}

/**
 * İlk kullanıcı dokunuşunda (pointerdown, touchstart, keydown) AudioContext kilidini açar.
 */
export function initAudioUnlock(): void {
  if (typeof window === 'undefined' || isUnlocked) return

  const unlock = () => {
    const ctx = getAudioContext()
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }
      isUnlocked = true
    }

    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('touchstart', unlock)
    window.removeEventListener('keydown', unlock)
  }

  window.addEventListener('pointerdown', unlock, { once: true, passive: true })
  window.addEventListener('touchstart', unlock, { once: true, passive: true })
  window.addEventListener('keydown', unlock, { once: true, passive: true })
}

// Sekme arka plana atıldığında sesi otomatik duraklat
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend().catch(() => {})
    } else if (!document.hidden && audioCtx && audioCtx.state === 'suspended' && isUnlocked) {
      audioCtx.resume().catch(() => {})
    }
  })
}

/**
 * Belirtilen ses efektini çalar.
 * Ayarlardan ses kapalıysa veya sekme gizliyse çalmaz.
 */
export function playSound(type: SoundType): void {
  if (typeof document !== 'undefined' && document.hidden) return
  if (!getSettings().sound) return

  const ctx = getAudioContext()
  if (!ctx || !masterGain) return

  // AudioContext henüz başlamamışsa resume dene
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  const now = ctx.currentTime

  try {
    switch (type) {
      case 'key_press': {
        // Kısa, yumuşak tuş tıklaması (600Hz -> 0.04s)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(600, now)
        gain.gain.setValueAtTime(0.2, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
        osc.connect(gain)
        gain.connect(masterGain)
        osc.start(now)
        osc.stop(now + 0.04)
        break
      }

      case 'tile_flip': {
        // Kutu dönme sesi (ahşap/kart çevirme blip: 300Hz -> 500Hz)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(320, now)
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.05)
        gain.gain.setValueAtTime(0.25, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055)
        osc.connect(gain)
        gain.connect(masterGain)
        osc.start(now)
        osc.stop(now + 0.06)
        break
      }

      case 'word_won': {
        // Neşeli arpej (C5, E5, G5, C6)
        const freqs = [523.25, 659.25, 783.99, 1046.5]
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.06
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)
          gain.gain.setValueAtTime(0.3, startTime)
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18)
          osc.connect(gain)
          gain.connect(masterGain!)
          osc.start(startTime)
          osc.stop(startTime + 0.2)
        })
        break
      }

      case 'word_lost': {
        // İki tonlu hafif kayıp sesi (260Hz -> 160Hz)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(260, now)
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.22)
        gain.gain.setValueAtTime(0.35, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
        osc.connect(gain)
        gain.connect(masterGain)
        osc.start(now)
        osc.stop(now + 0.26)
        break
      }

      case 'invalid_word': {
        // Hata / geçersiz kelime vızıltısı (130Hz testere dişi)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(130, now)
        gain.gain.setValueAtTime(0.25, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)
        osc.connect(gain)
        gain.connect(masterGain)
        osc.start(now)
        osc.stop(now + 0.17)
        break
      }

      case 'countdown_tick': {
        // Geri sayım tiki (950Hz kısa bip)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(950, now)
        gain.gain.setValueAtTime(0.3, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
        osc.connect(gain)
        gain.connect(masterGain)
        osc.start(now)
        osc.stop(now + 0.045)
        break
      }

      case 'countdown_go': {
        // Geri sayım başlangıç çanı (1250Hz parlak ton)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(1250, now)
        gain.gain.setValueAtTime(0.35, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
        osc.connect(gain)
        gain.connect(masterGain)
        osc.start(now)
        osc.stop(now + 0.23)
        break
      }

      case 'time_warning': {
        // Son 3 saniye aciliyet uyarısı (880Hz kısa ping)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, now)
        gain.gain.setValueAtTime(0.25, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07)
        osc.connect(gain)
        gain.connect(masterGain)
        osc.start(now)
        osc.stop(now + 0.08)
        break
      }

      case 'bonus_reveal': {
        // Bonus harf açılış ışıltısı (1050Hz -> 1450Hz)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(1050, now)
        osc.frequency.exponentialRampToValueAtTime(1450, now + 0.09)
        gain.gain.setValueAtTime(0.25, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
        osc.connect(gain)
        gain.connect(masterGain)
        osc.start(now)
        osc.stop(now + 0.11)
        break
      }

      case 'stage_cleared': {
        // 4. tur etap tamamlandı zafer melodisi (G5, C6, E6)
        const freqs = [783.99, 1046.5, 1318.51]
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.07
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)
          gain.gain.setValueAtTime(0.35, startTime)
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22)
          osc.connect(gain)
          gain.connect(masterGain!)
          osc.start(startTime)
          osc.stop(startTime + 0.24)
        })
        break
      }

      case 'game_over': {
        // Oyun bitiş melodisi (G4, C5, E5)
        const freqs = [392.0, 523.25, 659.25]
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.1
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(freq, startTime)
          gain.gain.setValueAtTime(0.3, startTime)
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3)
          osc.connect(gain)
          gain.connect(masterGain!)
          osc.start(startTime)
          osc.stop(startTime + 0.32)
        })
        break
      }

      case 'new_record': {
        // Yeni rekor zafer fanfarı (C5, G5, C6, E6 + uzayan rezonans)
        const freqs = [523.25, 783.99, 1046.5, 1318.51]
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.08
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)
          gain.gain.setValueAtTime(0.4, startTime)
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45)
          osc.connect(gain)
          gain.connect(masterGain!)
          osc.start(startTime)
          osc.stop(startTime + 0.48)
        })
        break
      }
    }
  } catch {
    // Ses üretirken hata oluşursa sessizce geç
  }
}
