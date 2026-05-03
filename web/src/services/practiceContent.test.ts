import { describe, expect, it } from 'vitest'
import { MAX_SENTENCE_LEVEL, SHORT_SENTENCE_WORD_LIMIT, countEnglishWords, filterSentencesByLength, loadPracticeDeck } from './practiceContent.ts'

describe('practice content', () => {
  it('filters a level into short and long sentence practice', async () => {
    const levelOne = await loadPracticeDeck(1)
    const highestLevel = await loadPracticeDeck(MAX_SENTENCE_LEVEL)

    const short = filterSentencesByLength(levelOne, 'short')
    const long = filterSentencesByLength(highestLevel, 'long')

    expect(short.length).toBeGreaterThan(0)
    expect(long.length).toBeGreaterThan(0)
    expect(short.every((sentence) => countEnglishWords(sentence.text.en) <= SHORT_SENTENCE_WORD_LIMIT)).toBe(true)
    expect(long.every((sentence) => countEnglishWords(sentence.text.en) > SHORT_SENTENCE_WORD_LIMIT)).toBe(true)
  })
})
