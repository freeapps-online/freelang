import { describe, expect, it, vi } from 'vitest'
import { createMissingLetterRound } from './missingLetters.ts'
import type { FlashCard } from '../types.ts'

const cards: FlashCard[] = [
  { word: 'hello', emoji: '👋', translations: { en: 'hello', es: 'hola', ja: 'ねこ' } },
  { word: 'happy', emoji: '🙂', translations: { en: 'happy', es: 'feliz', ja: 'いぬ' } },
  { word: 'cat', emoji: '🐈', translations: { en: 'cat', es: 'gato', ja: 'さかな' } },
]

describe('missing letter rounds', () => {
  it('creates a masked word with a valid missing letter option', () => {
    const randomSpy = vi.spyOn(Math, 'random')
    randomSpy
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.6)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)

    const round = createMissingLetterRound({
      words: cards,
      targetLang: 'es',
      prePickedCard: cards[0],
    })

    expect(round.displayText).toBe('hola')
    expect(round.maskedText).toContain('▢')
    expect(round.leftOption === round.missingLetter || round.rightOption === round.missingLetter).toBe(true)
    expect(round.maskedText.replace('▢', round.missingLetter)).toBe(round.displayText)

    randomSpy.mockRestore()
  })

  it('supports non-latin grapheme choices', () => {
    const randomSpy = vi.spyOn(Math, 'random')
    randomSpy
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.9)

    const round = createMissingLetterRound({
      words: cards,
      targetLang: 'ja',
      prePickedCard: cards[0],
    })

    expect(round.displayText).toBe('ねこ')
    expect(round.missingLetter.length).toBeGreaterThan(0)
    expect(round.maskedText.replace('▢', round.missingLetter)).toBe('ねこ')

    randomSpy.mockRestore()
  })
})
