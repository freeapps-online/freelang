import { describe, expect, it, vi } from 'vitest'
import { createClozeRound } from './cloze.ts'
import type { Sentence } from '../types.ts'

const sentences: Sentence[] = [
  { id: '1', emoji: '🍎', text: { en: 'I eat an apple', es: 'Yo como una manzana', ja: '私はりんごを食べる' } },
  { id: '2', emoji: '☕', text: { en: 'She drinks coffee', es: 'Ella bebe cafe', ja: '彼女はコーヒーを飲む' } },
  { id: '3', emoji: '📚', text: { en: 'We read books', es: 'Nosotros leemos libros', ja: '私たちは本を読む' } },
]

describe('cloze rounds', () => {
  it('creates a masked sentence with a distractor from outside the active sentence', () => {
    const randomSpy = vi.spyOn(Math, 'random')
    randomSpy
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.8)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.2)

    const round = createClozeRound({
      sentences,
      targetLang: 'es',
      prePickedSentence: sentences[0],
    })

    expect(round.fullText).toBe('Yo como una manzana')
    expect(round.maskedText).toContain('▢▢▢')
    expect([round.leftOption, round.rightOption]).toContain(round.missingWord)
    expect(round.maskedText.includes(round.missingWord)).toBe(false)
    const distractor = round.leftOption === round.missingWord ? round.rightOption : round.leftOption
    expect(['Yo', 'como', 'una', 'manzana']).not.toContain(distractor)

    randomSpy.mockRestore()
  })

  it('supports segmented non-latin sentences', () => {
    const randomSpy = vi.spyOn(Math, 'random')
    randomSpy
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.8)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.8)

    const round = createClozeRound({
      sentences,
      targetLang: 'ja',
      prePickedSentence: sentences[0],
    })

    expect(round.fullText).toBe('私はりんごを食べる')
    expect(round.maskedText).toContain('▢▢▢')
    expect(round.missingWord.length).toBeGreaterThan(0)

    randomSpy.mockRestore()
  })
})
