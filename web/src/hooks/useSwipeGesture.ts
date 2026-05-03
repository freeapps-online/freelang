import { useState, useCallback, useRef } from 'react'

export interface SwipeHandlers {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
}

interface UseSwipeGestureOptions {
  threshold?: number
  disabled?: boolean
  onSwipe: (side: 'left' | 'right') => void
  onTap?: () => void
}

export function useSwipeGesture({
  threshold = 80,
  disabled = false,
  onSwipe,
  onTap,
}: UseSwipeGestureOptions) {
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
    const currentDragX = e.clientX - startX.current
    const moved = Math.abs(currentDragX)

    if (currentDragX < -threshold) {
      onSwipe('left')
    } else if (currentDragX > threshold) {
      onSwipe('right')
    } else {
      setDragX(0)
      if (moved < 10) onTap?.()
    }
  }, [threshold, onSwipe, onTap])

  const resetDrag = useCallback(() => setDragX(0), [])
  const flyOff = useCallback((side: 'left' | 'right') => setDragX(side === 'left' ? -420 : 420), [])

  return { dragX, handlers: { onPointerDown, onPointerMove, onPointerUp }, resetDrag, flyOff }
}
