import { useState, useCallback, useRef } from 'react'
import { getFlashCardRound, getCardDisplay } from '../services/vocabulary.ts'
import { loadScores, recordAnswer } from '../services/scores.ts'
import type { FlashCardRound, FlashCardScore } from '../types.ts'

type SwipeResult = 'correct' | 'wrong' | null

export function FlashcardsTab({ nativeLang, targetLang }: { nativeLang: string; targetLang: string }) {
  const [round, setRound] = useState<FlashCardRound>(() => getFlashCardRound(nativeLang, targetLang))
  const [scores, setScores] = useState<FlashCardScore>(loadScores)
  const [result, setResult] = useState<SwipeResult>(null)
  const [dragX, setDragX] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const startX = useRef(0)
  const dragging = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const display = getCardDisplay(round.card, nativeLang)

  const handleAnswer = useCallback((side: 'left' | 'right') => {
    if (transitioning) return
    const correct = side === round.correctSide
    setResult(correct ? 'correct' : 'wrong')
    setScores(prev => recordAnswer(prev, correct))
    setTransitioning(true)

    // Animate card off screen
    setDragX(side === 'left' ? -400 : 400)

    setTimeout(() => {
      setRound(getFlashCardRound(nativeLang, targetLang, round.card))
      setResult(null)
      setDragX(0)
      setTransitioning(false)
    }, 400)
  }, [round, nativeLang, targetLang, transitioning])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (transitioning) return
    dragging.current = true
    startX.current = e.clientX
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [transitioning])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    setDragX(e.clientX - startX.current)
  }, [])

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false

    const threshold = 80
    if (dragX < -threshold) {
      handleAnswer('left')
    } else if (dragX > threshold) {
      handleAnswer('right')
    } else {
      setDragX(0)
    }
  }, [dragX, handleAnswer])

  const pct = scores.total > 0 ? Math.round((scores.correct / scores.total) * 100) : 0

  return (
    <div className="flex flex-col items-center px-4 pt-6 gap-5 h-[calc(100dvh-7rem)]">
      {/* Score bar */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--text-muted)]">Score</span>
          <span className="font-semibold">{scores.correct}/{scores.total}</span>
          <span className="text-[var(--text-muted)]">({pct}%)</span>
        </div>
        <div className="w-px h-4 bg-[var(--border)]" />
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--text-muted)]">Streak</span>
          <span className="font-semibold" style={{ color: scores.streak >= 3 ? 'var(--success)' : 'var(--text)' }}>
            {scores.streak}
          </span>
        </div>
        <div className="w-px h-4 bg-[var(--border)]" />
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--text-muted)]">Best</span>
          <span className="font-semibold">{scores.bestStreak}</span>
        </div>
      </div>

      {/* Swipe hint */}
      <div className="flex items-center gap-6 text-xs text-[var(--text-muted)]">
        <span>&larr; {round.leftOption}</span>
        <span>swipe</span>
        <span>{round.rightOption} &rarr;</span>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div
          ref={cardRef}
          className="relative w-64 h-80 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col items-center justify-center gap-4 cursor-grab active:cursor-grabbing select-none touch-none"
          style={{
            transform: `translateX(${dragX}px) rotate(${dragX * 0.08}deg)`,
            transition: transitioning ? 'transform 0.35s ease-out, opacity 0.35s ease-out' : 'none',
            opacity: transitioning ? 0 : 1,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* Direction indicator */}
          {Math.abs(dragX) > 30 && !transitioning && (
            <div
              className="absolute top-4 px-3 py-1 rounded-full text-sm font-semibold"
              style={{
                left: dragX < 0 ? 12 : 'auto',
                right: dragX > 0 ? 12 : 'auto',
                background: dragX < 0
                  ? (round.correctSide === 'left' ? 'var(--success)' : 'var(--error)')
                  : (round.correctSide === 'right' ? 'var(--success)' : 'var(--error)'),
                color: '#000',
              }}
            >
              {dragX < 0 ? round.leftOption : round.rightOption}
            </div>
          )}

          <span className="text-6xl">{display.emoji}</span>
          <span className="text-xl font-semibold">{display.text}</span>
        </div>
      </div>

      {/* Result flash */}
      {result && (
        <div
          className="text-lg font-semibold mb-2"
          style={{ color: result === 'correct' ? 'var(--success)' : 'var(--error)' }}
        >
          {result === 'correct' ? 'Correct!' : `Wrong — it was "${round.correctSide === 'left' ? round.leftOption : round.rightOption}"`}
        </div>
      )}

      {/* Tap fallback buttons */}
      <div className="flex gap-4 pb-2">
        <button
          className="px-6 py-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-sm font-medium min-w-24"
          onClick={() => handleAnswer('left')}
          disabled={transitioning}
        >
          &larr; {round.leftOption}
        </button>
        <button
          className="px-6 py-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-sm font-medium min-w-24"
          onClick={() => handleAnswer('right')}
          disabled={transitioning}
        >
          {round.rightOption} &rarr;
        </button>
      </div>
    </div>
  )
}
