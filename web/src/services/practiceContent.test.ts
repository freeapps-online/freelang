import { describe, expect, it } from 'vitest'
import { MAX_PHRASE_LEVEL, loadPracticeDeck } from './practiceContent.ts'

function countWords(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length
}

describe('practice content', () => {
  it('builds phrase decks from short sentence content only', async () => {
    const levelOne = await loadPracticeDeck('phrases', 1)
    const levelThree = await loadPracticeDeck('phrases', MAX_PHRASE_LEVEL)

    expect(levelOne.length).toBeGreaterThan(0)
    expect(levelThree.length).toBeGreaterThan(0)
    expect([...levelOne, ...levelThree].every((sentence) => countWords(sentence.text.en) <= 3)).toBe(true)
  })
})
