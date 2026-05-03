import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadScores, loadWordStats, pickWeightedCard, recordAnswer, recordWordAnswer } from './scores.ts'

describe('scores service', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tracks streaks and persists flashcard scores', () => {
    const start = { correct: 0, total: 0, streak: 0, bestStreak: 0 }

    const first = recordAnswer(start, true)
    const second = recordAnswer(first, true)
    const third = recordAnswer(second, false)

    expect(third).toEqual({
      correct: 2,
      total: 3,
      streak: 0,
      bestStreak: 2,
    })
    expect(loadScores()).toEqual(third)
  })

  it('tracks per-word correctness and last seen time', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const first = recordWordAnswer({}, 'hola', true)
    const second = recordWordAnswer(first, 'hola', false)

    expect(second).toEqual({
      hola: {
        correct: 1,
        wrong: 1,
        lastSeen: 1_700_000_000_000,
      },
    })
    expect(loadWordStats()).toEqual(second)
  })

  it('does not return an excluded card when alternatives exist', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const cards = [{ word: 'one' }, { word: 'two' }, { word: 'three' }]

    expect(pickWeightedCard(cards, {}, cards[0])).toEqual({ word: 'two' })
  })
})
