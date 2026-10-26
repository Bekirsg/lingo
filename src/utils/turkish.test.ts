import { describe, it, expect } from 'vitest'
import { turkishUpper } from './turkish'

describe('turkishUpper — Türkçe büyük harf dönüşümü', () => {
  it('i → İ (noktalı i büyük harfi İ olmalı)', () => {
    expect(turkishUpper('i')).toBe('İ')
  })

  it('ı → I (noktasız ı büyük harfi I olmalı)', () => {
    expect(turkishUpper('ı')).toBe('I')
  })

  it('İ zaten büyük → İ kalır', () => {
    expect(turkishUpper('İ')).toBe('İ')
  })

  it('I zaten büyük → I kalır', () => {
    expect(turkishUpper('I')).toBe('I')
  })

  it('tam kelime: "kılıç" → "KILIÇ"', () => {
    expect(turkishUpper('kılıç')).toBe('KILIÇ')
  })

  it('tam kelime: "iğne" → "İĞNE" (başı İ)', () => {
    expect(turkishUpper('iğne')).toBe('İĞNE')
  })

  it('tam kelime: "şişe" → "ŞİŞE" (iki noktalı İ)', () => {
    expect(turkishUpper('şişe')).toBe('ŞİŞE')
  })

  it('karışık: "ıslık" → "ISLIK"', () => {
    expect(turkishUpper('ıslık')).toBe('ISLIK')
  })

  it('diğer Türkçe harfler: "şçöüğ" → "ŞÇÖÜĞ"', () => {
    expect(turkishUpper('şçöüğ')).toBe('ŞÇÖÜĞ')
  })

  it('boş string', () => {
    expect(turkishUpper('')).toBe('')
  })
})
