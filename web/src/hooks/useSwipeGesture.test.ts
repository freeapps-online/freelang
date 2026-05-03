import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSwipeGesture } from './useSwipeGesture.ts'

function makePointerEvent(clientX: number, pointerId = 1) {
  return {
    clientX,
    pointerId,
    target: { setPointerCapture: vi.fn() },
  } as unknown as React.PointerEvent
}

describe('useSwipeGesture', () => {
  it('starts with dragX at 0', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipe }))
    expect(result.current.dragX).toBe(0)
  })

  it('tracks drag movement', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipe }))

    act(() => result.current.handlers.onPointerDown(makePointerEvent(100)))
    act(() => result.current.handlers.onPointerMove(makePointerEvent(150)))
    expect(result.current.dragX).toBe(50)
  })

  it('calls onSwipe("right") when threshold exceeded', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipe, threshold: 80 }))

    act(() => result.current.handlers.onPointerDown(makePointerEvent(100)))
    act(() => result.current.handlers.onPointerMove(makePointerEvent(200)))
    act(() => result.current.handlers.onPointerUp(makePointerEvent(200)))
    expect(onSwipe).toHaveBeenCalledWith('right')
  })

  it('calls onSwipe("left") when threshold exceeded negatively', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipe, threshold: 80 }))

    act(() => result.current.handlers.onPointerDown(makePointerEvent(200)))
    act(() => result.current.handlers.onPointerMove(makePointerEvent(100)))
    act(() => result.current.handlers.onPointerUp(makePointerEvent(100)))
    expect(onSwipe).toHaveBeenCalledWith('left')
  })

  it('resets dragX and calls onTap for small movements', () => {
    const onSwipe = vi.fn()
    const onTap = vi.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipe, onTap }))

    act(() => result.current.handlers.onPointerDown(makePointerEvent(100)))
    act(() => result.current.handlers.onPointerUp(makePointerEvent(105)))
    expect(onSwipe).not.toHaveBeenCalled()
    expect(onTap).toHaveBeenCalled()
    expect(result.current.dragX).toBe(0)
  })

  it('does not respond when disabled', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipe, disabled: true }))

    act(() => result.current.handlers.onPointerDown(makePointerEvent(100)))
    act(() => result.current.handlers.onPointerMove(makePointerEvent(300)))
    expect(result.current.dragX).toBe(0)
  })

  it('flyOff sets dragX to +-420', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipe }))

    act(() => result.current.flyOff('right'))
    expect(result.current.dragX).toBe(420)

    act(() => result.current.flyOff('left'))
    expect(result.current.dragX).toBe(-420)
  })

  it('resetDrag sets dragX to 0', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipe }))

    act(() => result.current.flyOff('right'))
    expect(result.current.dragX).toBe(420)

    act(() => result.current.resetDrag())
    expect(result.current.dragX).toBe(0)
  })
})
