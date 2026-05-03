import { describe, it, expect } from 'vitest'
import { tokensMatch, getNumberEquivalents } from './numberWords.ts'

describe('tokensMatch', () => {
  it('matches identical tokens', () => {
    expect(tokensMatch('hello', 'hello')).toBe(true)
  })

  it('matches case-insensitively', () => {
    expect(tokensMatch('Hello', 'hello')).toBe(true)
  })

  it('matches digit to English word', () => {
    expect(tokensMatch('6', 'six')).toBe(true)
    expect(tokensMatch('six', '6')).toBe(true)
  })

  it('matches digit to Spanish word', () => {
    expect(tokensMatch('6', 'seis')).toBe(true)
    expect(tokensMatch('seis', '6')).toBe(true)
  })

  it('matches digit to Russian word', () => {
    expect(tokensMatch('6', 'шесть')).toBe(true)
    expect(tokensMatch('шесть', '6')).toBe(true)
  })

  it('matches digit to French word', () => {
    expect(tokensMatch('5', 'cinq')).toBe(true)
  })

  it('matches digit to German word', () => {
    expect(tokensMatch('3', 'drei')).toBe(true)
  })

  it('does not match unrelated words', () => {
    expect(tokensMatch('six', 'seven')).toBe(false)
    expect(tokensMatch('6', 'seven')).toBe(false)
  })

  it('handles multi-digit numbers', () => {
    expect(tokensMatch('10', 'ten')).toBe(true)
    expect(tokensMatch('20', 'twenty')).toBe(true)
    expect(tokensMatch('100', 'hundred')).toBe(true)
  })
})

describe('getNumberEquivalents', () => {
  it('returns digit + all word forms for a digit', () => {
    const equivs = getNumberEquivalents('6')
    expect(equivs).toContain('6')
    expect(equivs).toContain('six')
    expect(equivs).toContain('seis')
    expect(equivs).toContain('шесть')
  })

  it('returns word + digit for a number word', () => {
    const equivs = getNumberEquivalents('six')
    expect(equivs).toContain('six')
    expect(equivs).toContain('6')
  })

  it('returns just the token for non-number words', () => {
    expect(getNumberEquivalents('hello')).toEqual(['hello'])
  })
})
