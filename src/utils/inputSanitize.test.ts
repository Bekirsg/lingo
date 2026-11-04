import { describe, it, expect } from 'vitest'
import { isTurkishLetter, sanitizeInput } from './inputSanitize'

describe('inputSanitize', () => {
  describe('isTurkishLetter', () => {
    it('geçerli Türkçe harfleri kabul eder', () => {
      const validLetters = ['a', 'b', 'c', 'ç', 'd', 'e', 'f', 'g', 'ğ', 'h', 'ı', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'ö', 'p', 'r', 's', 'ş', 't', 'u', 'ü', 'v', 'y', 'z']
      for (const char of validLetters) {
        expect(isTurkishLetter(char)).toBe(true)
        expect(isTurkishLetter(char.toLocaleUpperCase('tr-TR'))).toBe(true)
      }
    })

    it('Türkçe I ve İ dönüşümlerini doğru yapar', () => {
      expect(isTurkishLetter('I')).toBe(true) // 'ı' olur
      expect(isTurkishLetter('İ')).toBe(true) // 'i' olur
      expect(isTurkishLetter('ı')).toBe(true)
      expect(isTurkishLetter('i')).toBe(true)
    })

    it('şapkalı harfleri kabul eder', () => {
      expect(isTurkishLetter('â')).toBe(true)
      expect(isTurkishLetter('î')).toBe(true)
      expect(isTurkishLetter('û')).toBe(true)
      expect(isTurkishLetter('Â')).toBe(true)
    })

    it('q, w, x harflerini reddeder', () => {
      expect(isTurkishLetter('q')).toBe(false)
      expect(isTurkishLetter('Q')).toBe(false)
      expect(isTurkishLetter('w')).toBe(false)
      expect(isTurkishLetter('W')).toBe(false)
      expect(isTurkishLetter('x')).toBe(false)
      expect(isTurkishLetter('X')).toBe(false)
    })

    it('rakam, noktalama ve boşlukları reddeder', () => {
      expect(isTurkishLetter('1')).toBe(false)
      expect(isTurkishLetter(' ')).toBe(false)
      expect(isTurkishLetter('.')).toBe(false)
      expect(isTurkishLetter('-')).toBe(false)
      expect(isTurkishLetter('')).toBe(false)
      expect(isTurkishLetter('ab')).toBe(false)
    })
  })

  describe('sanitizeInput', () => {
    it('boş veya geçersiz girdide boş dizi döner', () => {
      expect(sanitizeInput('')).toEqual([])
      expect(sanitizeInput('   ')).toEqual([])
      expect(sanitizeInput('12345')).toEqual([])
      expect(sanitizeInput('!@#$%')).toEqual([])
    })

    it('büyük Türkçe harfleri küçük harfe çevirir', () => {
      expect(sanitizeInput('KALEM')).toEqual(['k', 'a', 'l', 'e', 'm'])
      expect(sanitizeInput('IŞIK')).toEqual(['ı', 'ş', 'ı', 'k'])
      expect(sanitizeInput('İĞNE')).toEqual(['i', 'ğ', 'n', 'e'])
    })

    it('şapkalı harfleri normalize eder', () => {
      expect(sanitizeInput('hâlâ')).toEqual(['h', 'a', 'l', 'a'])
      expect(sanitizeInput('millî')).toEqual(['m', 'i', 'l', 'l', 'i'])
      expect(sanitizeInput('sükût')).toEqual(['s', 'ü', 'k', 'u', 't'])
    })

    it('q, w, x ve alfabe dışı karakterleri atlar', () => {
      expect(sanitizeInput('qw-rty123')).toEqual(['r', 't', 'y'])
      expect(sanitizeInput('x-box')).toEqual(['b', 'o'])
      expect(sanitizeInput('t.e.s.t!')).toEqual(['t', 'e', 's', 't'])
    })

    it('maxLen sınırını aşarsa kırpar', () => {
      expect(sanitizeInput('merhabalar', 5)).toEqual(['m', 'e', 'r', 'h', 'a'])
      expect(sanitizeInput('lingo', 4)).toEqual(['l', 'i', 'n', 'g'])
      expect(sanitizeInput('a', 5)).toEqual(['a'])
    })
  })
})
