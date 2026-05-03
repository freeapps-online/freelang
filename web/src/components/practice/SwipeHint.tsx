/**
 * SwipeHint — the colored pill that appears while dragging a card,
 * showing which answer you're about to select.
 */
export function SwipeHint({
  dragX,
  transitioning,
  leftOption,
  rightOption,
  correctSide,
}: {
  dragX: number
  transitioning: boolean
  leftOption: string
  rightOption: string
  correctSide: 'left' | 'right'
}) {
  if (Math.abs(dragX) <= 30 || transitioning) return null

  const side = dragX < 0 ? 'left' : 'right'
  const isCorrect = side === correctSide

  return (
    <div
      className="absolute top-4 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--paper)] sm:top-5"
      style={{
        left: side === 'left' ? 18 : 'auto',
        right: side === 'right' ? 18 : 'auto',
        background: isCorrect ? 'var(--success)' : 'var(--error)',
      }}
    >
      {side === 'left' ? leftOption : rightOption}
    </div>
  )
}
