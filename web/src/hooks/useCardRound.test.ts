import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCardRound } from './useCardRound.ts'

vi.mock('../services/vocabulary.ts', () => ({
  getLoadedWords: () => [],
  loadLevel: vi.fn().mockResolvedValue([
    { word: 'cat', emoji: '🐱', translations: { en: 'cat', ru: 'кот' }, translit: {} },
    { word: 'dog', emoji: '🐶', translations: { en: 'dog', ru: 'собака' }, translit: {} },
    { word: 'bird', emoji: '🐦', translations: { en: 'bird', ru: 'птица' }, translit: {} },
  ]),
  getCardDisplay: (card: any, lang: string) => ({
    text: card.translations[lang] ?? card.word,
    emoji: card.emoji,
    translit: null,
  }),
  getFlashCardRound: (native: string, _target: string, _words: any[], _exclude: any, card: any) => ({
    card,
    correctSide: 'left' as const,
    leftOption: card.translations[native] ?? card.word,
    rightOption: 'wrong',
  }),
}))

vi.mock('../services/scores.ts', () => ({
  loadScores: () => ({ correct: 0, total: 0 }),
  recordAnswer: (prev: any, _correct: boolean) => prev,
  loadWordStats: () => ({}),
  recordWordAnswer: (prev: any) => prev,
  pickWeightedCard: (_words: any[], _stats: any, exclude?: any) => {
    const words = [
      { word: 'cat', emoji: '🐱', translations: { en: 'cat', ru: 'кот' }, translit: {} },
      { word: 'dog', emoji: '🐶', translations: { en: 'dog', ru: 'собака' }, translit: {} },
      { word: 'bird', emoji: '🐦', translations: { en: 'bird', ru: 'птица' }, translit: {} },
    ]
    return words.find(w => w.word !== exclude?.word) ?? words[0]
  },
}))

vi.mock('../services/cloud.ts', () => ({
  reportCardScore: vi.fn(),
}))

describe('useCardRound', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads words and sets initial round', async () => {
    const { result } = renderHook(() => useCardRound({
      level: 1,
      nativeLang: 'en',
      targetLang: 'ru',
    }))

    // Initially no round
    expect(result.current.round).toBeNull()

    // After async load
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.round).not.toBeNull()
    expect(result.current.words.length).toBe(3)
  })

  it('answer returns correct boolean and sets result', async () => {
    const { result } = renderHook(() => useCardRound({
      level: 1,
      nativeLang: 'en',
      targetLang: 'ru',
    }))

    await act(async () => { await vi.runAllTimersAsync() })

    // Answer correctly (correctSide is 'left' in our mock)
    let wasCorrect: boolean | undefined
    act(() => { wasCorrect = result.current.answer('left') as any })
    expect(wasCorrect).toBe(true)
    expect(result.current.result).toBe('correct')
  })

  it('correct answer transitions and advances after 400ms', async () => {
    const { result } = renderHook(() => useCardRound({
      level: 1,
      nativeLang: 'en',
      targetLang: 'ru',
    }))

    await act(async () => { await vi.runAllTimersAsync() })
    const firstCard = result.current.round!.card.word

    act(() => { result.current.answer('left') })
    expect(result.current.transitioning).toBe(true)

    // After 400ms, should advance to new card
    act(() => { vi.advanceTimersByTime(400) })
    expect(result.current.transitioning).toBe(false)
    expect(result.current.result).toBeNull()
    expect(result.current.round!.card.word).not.toBe(firstCard)
  })

  it('wrong answer stays, then transitions at 800ms and advances at 1100ms', async () => {
    const { result } = renderHook(() => useCardRound({
      level: 1,
      nativeLang: 'en',
      targetLang: 'ru',
    }))

    await act(async () => { await vi.runAllTimersAsync() })
    const firstCard = result.current.round!.card.word

    // Answer wrong (correctSide is 'left', so 'right' is wrong)
    act(() => { result.current.answer('right') })
    expect(result.current.result).toBe('wrong')
    expect(result.current.transitioning).toBe(false)

    // At 800ms, starts transitioning
    act(() => { vi.advanceTimersByTime(800) })
    expect(result.current.transitioning).toBe(true)

    // At 1100ms, advances
    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current.transitioning).toBe(false)
    expect(result.current.result).toBeNull()
    expect(result.current.round!.card.word).not.toBe(firstCard)
  })

  it('blocks double-answering while result is set', async () => {
    const { result } = renderHook(() => useCardRound({
      level: 1,
      nativeLang: 'en',
      targetLang: 'ru',
    }))

    await act(async () => { await vi.runAllTimersAsync() })

    act(() => { result.current.answer('left') })
    // Try answering again while result is set
    const secondAnswer = result.current.answer('right')
    expect(secondAnswer).toBe(false)
  })

  it('sets feedback with correct answer text', async () => {
    const { result } = renderHook(() => useCardRound({
      level: 1,
      nativeLang: 'en',
      targetLang: 'ru',
    }))

    await act(async () => { await vi.runAllTimersAsync() })

    act(() => { result.current.answer('left') })
    expect(result.current.feedback).not.toBeNull()
    expect(result.current.feedback!.correct).toBe(true)
    expect(result.current.feedback!.correctAnswer).toBeTruthy()
  })

  it('clears feedback after 3500ms', async () => {
    const { result } = renderHook(() => useCardRound({
      level: 1,
      nativeLang: 'en',
      targetLang: 'ru',
    }))

    await act(async () => { await vi.runAllTimersAsync() })

    act(() => { result.current.answer('left') })
    expect(result.current.feedback).not.toBeNull()

    act(() => { vi.advanceTimersByTime(3500) })
    expect(result.current.feedback).toBeNull()
  })

  it('cleans up timers on unmount (no state updates after unmount)', async () => {
    const { result, unmount } = renderHook(() => useCardRound({
      level: 1,
      nativeLang: 'en',
      targetLang: 'ru',
    }))

    await act(async () => { await vi.runAllTimersAsync() })

    // Answer triggers timers
    act(() => { result.current.answer('left') })

    // Unmount before timers fire
    unmount()

    // Advance past all timers — should not throw
    act(() => { vi.advanceTimersByTime(5000) })
  })

  it('calls onTransitionStart callback', async () => {
    const onTransitionStart = vi.fn()
    const { result } = renderHook(() => useCardRound({
      level: 1,
      nativeLang: 'en',
      targetLang: 'ru',
      onTransitionStart,
    }))

    await act(async () => { await vi.runAllTimersAsync() })

    act(() => { result.current.answer('left') })
    expect(onTransitionStart).toHaveBeenCalledWith(true, 'left')
  })
})
