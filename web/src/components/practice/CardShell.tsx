import type { ReactNode } from 'react'

/**
 * CardShell — the swipeable card container shared by all practice tabs.
 * Handles the visual appearance (gradient, border, shadow, rounded corners).
 * Drag/swipe logic is handled by the parent via props.
 */
export function CardShell({
  children,
  dragX = 0,
  transitioning = false,
  swipeable = true,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClick,
}: {
  children: ReactNode
  dragX?: number
  transitioning?: boolean
  swipeable?: boolean
  onPointerDown?: (e: React.PointerEvent) => void
  onPointerMove?: (e: React.PointerEvent) => void
  onPointerUp?: (e: React.PointerEvent) => void
  onClick?: () => void
}) {
  return (
    <div
      className={`relative flex w-full max-w-[24rem] flex-col items-center justify-center gap-2 rounded-[1.25rem] border border-[var(--line-strong)] px-3 py-4 text-center shadow-[var(--shadow-soft)] select-none touch-none sm:gap-3 sm:rounded-[2rem] sm:px-5 sm:py-8 ${
        swipeable ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      style={{
        background: 'var(--card-gradient)',
        transform: swipeable ? `translateX(${dragX}px) rotate(${dragX * 0.08}deg)` : 'none',
        transition: transitioning ? 'transform 0.35s ease-out, opacity 0.35s ease-out' : 'none',
        opacity: transitioning ? 0 : 1,
      }}
      onPointerDown={swipeable ? onPointerDown : undefined}
      onPointerMove={swipeable ? onPointerMove : undefined}
      onPointerUp={swipeable ? onPointerUp : undefined}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
