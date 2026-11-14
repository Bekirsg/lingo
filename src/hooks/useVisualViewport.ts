import { useEffect, useState } from 'react'

export interface VisualViewportState {
  height: number
  width: number
  isKeyboardVisible: boolean
}

/**
 * Mobil tarayıcılarda sistem klavyesi açıldığında visualViewport
 * yüksekliğini dinler ve CSS değişkeni ile React durumunu günceller.
 */
export function useVisualViewport(): VisualViewportState {
  const [viewport, setViewport] = useState<VisualViewportState>(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      const h = window.visualViewport.height
      const w = window.visualViewport.width
      const isKbd = window.innerHeight - h > 150
      return { height: h, width: w, isKeyboardVisible: isKbd }
    }
    const h = typeof window !== 'undefined' ? window.innerHeight : 800
    const w = typeof window !== 'undefined' ? window.innerWidth : 400
    return { height: h, width: w, isKeyboardVisible: false }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const update = () => {
      let h = window.innerHeight
      let w = window.innerWidth
      let isKbd = false

      if (window.visualViewport) {
        h = window.visualViewport.height
        w = window.visualViewport.width
        isKbd = window.innerHeight - h > 150

        // iOS viewport kaymasını engelle
        if (window.visualViewport.offsetTop > 0) {
          window.scrollTo(0, 0)
        }
      }

      document.documentElement.style.setProperty('--app-height', `${h}px`)
      document.documentElement.style.setProperty('--visual-viewport-height', `${h}px`)

      setViewport(prev => {
        if (prev.height === h && prev.width === w && prev.isKeyboardVisible === isKbd) {
          return prev
        }
        return { height: h, width: w, isKeyboardVisible: isKbd }
      })
    }

    update()

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', update)
      window.visualViewport.addEventListener('scroll', update)
    }
    window.addEventListener('resize', update)

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', update)
        window.visualViewport.removeEventListener('scroll', update)
      }
      window.removeEventListener('resize', update)
    }
  }, [])

  return viewport
}
