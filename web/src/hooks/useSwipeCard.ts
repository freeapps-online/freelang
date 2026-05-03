import { useState, useCallback, useRef } from 'react'

/**
 * useSwipeCard — shared drag/swipe logic for all card-based practice tabs.
 *
 * Returns pointer handlers + drag state.
 * Call `handleAnswer('left' | 'right')` when swipe threshold is crossed.
 * Call `onTap()` when user taps without dragging.
 */
export function useSwipeCard({
  onSwipe,
  onTap,
  disabled = false,
  threshold = 80,
}: {
  onSwipe: (side: 'left' | 'right') => void
  onTap?: () => void
  disabled?: boolean
  threshold?: number
}) {
  const [dragX, setDragX] = useState(0)
  const startX = useRef(0)
  const dragging = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return
    dragging.current = true
    startX.current = e.clientX
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [disabled])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    setDragX(e.clientX - startX.current)
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    const moved = Math.abs(e.clientX - startX.current)

    if (dragX < -threshold) onSwipe('left')
    else if (dragX > threshold) onSwipe('right')
    else {
      setDragX(0)
      if (moved < 10 && onTap) onTap()
    }
  }, [dragX, onSwipe, onTap, threshold])

  const resetDrag = useCallback(() => setDragX(0), [])

  return { dragX, setDragX, onPointerDown, onPointerMove, onPointerUp, resetDrag }
}
