/**
 * FeedbackToast — shows the previous answer result below the card.
 * Green for correct, red for wrong. Always reserves its vertical space.
 * Auto-hides after the parent clears the result.
 */
export function FeedbackToast({
  result,
  targetWord,
  correctAnswer,
}: {
  result: 'correct' | 'wrong' | null
  targetWord: string
  correctAnswer: string
}) {
  return (
    <div className="shrink-0 text-center text-sm font-semibold" style={{ minHeight: '1.5em' }}>
      {result && (
        <span style={{ color: result === 'correct' ? 'var(--success)' : 'var(--error)' }}>
          {targetWord} = {correctAnswer}
        </span>
      )}
    </div>
  )
}
