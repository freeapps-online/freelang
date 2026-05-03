import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSentenceStats, recordSentenceAttempt } from './sentenceStats.ts'

describe('sentenceStats service', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('tracks right and wrong counts per sentence', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const first = recordSentenceAttempt({}, 'sentence-1', 84)
    const second = recordSentenceAttempt(first, 'sentence-1', 40)

    expect(second).toEqual({
      'sentence-1': {
        attempts: 2,
        bestScore: 84,
        lastScore: 40,
        totalScore: 124,
        lastSeen: 1_700_000_000_000,
        right: 1,
        wrong: 1,
      },
    })
    expect(loadSentenceStats()).toEqual(second)
  })

  it('normalizes legacy stored stats without right and wrong counts', () => {
    localStorage.setItem('freelang-sentence-stats', JSON.stringify({
      old: {
        attempts: 3,
        bestScore: 90,
        lastScore: 60,
        totalScore: 210,
        lastSeen: 123,
      },
    }))

    expect(loadSentenceStats()).toEqual({
      old: {
        attempts: 3,
        bestScore: 90,
        lastScore: 60,
        totalScore: 210,
        lastSeen: 123,
        right: 0,
        wrong: 0,
      },
    })
  })
})
