import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCardAudio } from './useCardAudio.ts'

vi.mock('../services/speech.ts', () => ({
  speech: {
    speak: vi.fn().mockResolvedValue(undefined),
    stopSpeaking: vi.fn(),
    stopListening: vi.fn(),
  },
}))

describe('useCardAudio', () => {
  let mockSpeak: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    const { speech } = await import('../services/speech.ts')
    mockSpeak = speech.speak as ReturnType<typeof vi.fn>
  })

  it('speaks the word on initial render when enabled', () => {
    renderHook(() => useCardAudio('hello', 'en', true, false))
    expect(mockSpeak).toHaveBeenCalledWith('hello', 'en')
  })

  it('does not speak when disabled', () => {
    renderHook(() => useCardAudio('hello', 'en', false, false))
    expect(mockSpeak).not.toHaveBeenCalled()
  })

  it('does not speak when transitioning', () => {
    renderHook(() => useCardAudio('hello', 'en', true, true))
    expect(mockSpeak).not.toHaveBeenCalled()
  })

  it('does not speak when word is empty', () => {
    renderHook(() => useCardAudio('', 'en', true, false))
    expect(mockSpeak).not.toHaveBeenCalled()
  })

  it('speaks again when word changes', () => {
    const { rerender } = renderHook(
      ({ word }) => useCardAudio(word, 'en', true, false),
      { initialProps: { word: 'hello' } },
    )
    expect(mockSpeak).toHaveBeenCalledTimes(1)

    rerender({ word: 'world' })
    expect(mockSpeak).toHaveBeenCalledTimes(2)
    expect(mockSpeak).toHaveBeenLastCalledWith('world', 'en')
  })

  it('speaks when transitioning goes from true to false with a word', () => {
    const { rerender } = renderHook(
      ({ transitioning }) => useCardAudio('hello', 'en', true, transitioning),
      { initialProps: { transitioning: true } },
    )
    expect(mockSpeak).not.toHaveBeenCalled()

    rerender({ transitioning: false })
    expect(mockSpeak).toHaveBeenCalledWith('hello', 'en')
  })
})
