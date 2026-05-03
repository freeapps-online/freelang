import { describe, expect, it } from 'vitest'
import { evaluateVoiceAttempt, isSpeechMatch, normalizeSpeech } from './flashcardsVoice.ts'

describe('flashcards voice helpers', () => {
  it('normalizes case, punctuation, and accents', () => {
    expect(normalizeSpeech(' Héllo,   World! ')).toBe('hello world')
  })

  it('matches equivalent spoken phrases', () => {
    expect(isSpeechMatch('Privet!', 'privet')).toBe(true)
    expect(isSpeechMatch('ice cream', 'ice   cream')).toBe(true)
  })

  it('evaluates repeat and answer separately', () => {
    expect(evaluateVoiceAttempt('привет', 'привет', 'hello', 'yellow')).toEqual({
      repeatMatched: true,
      answerMatched: false,
    })
  })
})
