import { useState, useCallback, useRef, useEffect } from 'react'
import { getFlashCardRound, getCardDisplay } from '../services/vocabulary.ts'
import { loadScores, recordAnswer } from '../services/scores.ts'
import { speech } from '../services/speech.ts'
import { useSpeech } from '../hooks.ts'
import type { FlashCardRound, FlashCardScore } from '../types.ts'

type SwipeResult = 'correct' | 'wrong' | null

export function FlashcardsTab({
  nativeLang,
  targetLang,
  audioEnabled,
  onToggleAudio,
}: {
  nativeLang: string
  targetLang: string
  audioEnabled: boolean
  onToggleAudio: () => void
}) {
  const sp = useSpeech()
  const [round, setRound] = useState<FlashCardRound>(() => getFlashCardRound(nativeLang, targetLang))
  const [scores, setScores] = useState<FlashCardScore>(loadScores)
  const [result, setResult] = useState<SwipeResult>(null)
  const [dragX, setDragX] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const startX = useRef(0)
  const dragging = useRef(false)

  const display = getCardDisplay(round.card, nativeLang)

  const handleAnswer = useCallback((side: 'left' | 'right') => {
    if (transitioning) return
    const correct = side === round.correctSide
    setResult(correct ? 'correct' : 'wrong')
    setScores((prev) => recordAnswer(prev, correct))
    setTransitioning(true)
    setDragX(side === 'left' ? -420 : 420)

    window.setTimeout(() => {
      setRound(getFlashCardRound(nativeLang, targetLang, round.card))
      setResult(null)
      setDragX(0)
      setTransitioning(false)
    }, 400)
  }, [round, nativeLang, targetLang, transitioning])

  const replayCardAudio = useCallback(() => {
    if (!audioEnabled) return
    void speech.speak(display.text, nativeLang)
  }, [audioEnabled, display.text, nativeLang])

  useEffect(() => {
    if (!audioEnabled || transitioning) return
    void speech.speak(display.text, nativeLang)
  }, [audioEnabled, display.text, nativeLang, round.card.word, transitioning])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (transitioning) return

      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (target?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        handleAnswer('left')
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        handleAnswer('right')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleAnswer, transitioning])

  useEffect(() => () => {
    speech.stopSpeaking()
  }, [])

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (transitioning) return
    dragging.current = true
    startX.current = event.clientX
    ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
  }, [transitioning])

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    if (!dragging.current) return
    setDragX(event.clientX - startX.current)
  }, [])

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false

    if (dragX < -80) handleAnswer('left')
    else if (dragX > 80) handleAnswer('right')
    else setDragX(0)
  }, [dragX, handleAnswer])

  const pct = scores.total > 0 ? Math.round((scores.correct / scores.total) * 100) : 0

  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="order-2 rounded-[1.5rem] border border-[var(--line)] bg-[var(--glass-strong)] p-4 shadow-[var(--shadow-card)] lg:order-1">
        <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Deck pace</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <MetricCard label="Accuracy" value={`${pct}%`} detail={`${scores.correct}/${scores.total} correct`} />
          <MetricCard label="Current streak" value={`${scores.streak}`} detail="Keep the run alive" />
          <MetricCard label="Best streak" value={`${scores.bestStreak}`} detail="Your strongest session" />
        </div>
      </aside>

      <section
        className="order-1 rounded-[1.5rem] border border-[var(--line)] p-4 shadow-[var(--shadow-card)] sm:p-5 lg:order-2"
        style={{ background: 'var(--warm-gradient)' }}
      >
        <div className="flex h-full flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--accent-deep)]">Recall drill</div>
              <h3 className="display-font mt-2 text-3xl leading-none text-[var(--ink)]">Listen, look, then choose fast.</h3>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <div className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-4 py-2 text-sm font-semibold text-[var(--muted)]">
                Swipe or use ← →
              </div>
              <button
                className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--glass-hover)]"
                onClick={onToggleAudio}
              >
                {audioEnabled ? 'Mute' : 'Unmute'}
              </button>
              <button
                className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--glass-hover)]"
                onClick={replayCardAudio}
                disabled={!audioEnabled || sp.isSpeaking}
              >
                Replay sound
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-center text-sm font-semibold text-[var(--muted)]">
              ← {round.leftOption}
            </div>
            <div className="hidden h-px w-12 bg-[var(--line-strong)] lg:block" />
            <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-center text-sm font-semibold text-[var(--muted)]">
              {round.rightOption} →
            </div>
          </div>

          <div className="flex min-h-[23rem] flex-1 items-center justify-center">
            <div
              className="relative flex h-[23rem] w-full max-w-[24rem] cursor-grab flex-col items-center justify-center gap-5 rounded-[2rem] border border-[var(--line-strong)] px-6 text-center shadow-[var(--shadow-soft)] active:cursor-grabbing select-none touch-none"
              style={{
                background: 'var(--card-gradient)',
                transform: `translateX(${dragX}px) rotate(${dragX * 0.08}deg)`,
                transition: transitioning ? 'transform 0.35s ease-out, opacity 0.35s ease-out' : 'none',
                opacity: transitioning ? 0 : 1,
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {Math.abs(dragX) > 30 && !transitioning && (
                <div
                  className="absolute top-5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--paper)]"
                  style={{
                    left: dragX < 0 ? 18 : 'auto',
                    right: dragX > 0 ? 18 : 'auto',
                    background: dragX < 0
                      ? (round.correctSide === 'left' ? 'var(--success)' : 'var(--error)')
                      : (round.correctSide === 'right' ? 'var(--success)' : 'var(--error)'),
                  }}
                >
                  {dragX < 0 ? round.leftOption : round.rightOption}
                </div>
              )}

              <div className="absolute right-5 top-5 rounded-full border border-[var(--line)] bg-[var(--glass)] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                {audioEnabled ? (sp.isSpeaking ? 'Speaking' : 'Sound on') : 'Muted'}
              </div>

              <div className="text-7xl drop-shadow-sm">{display.emoji}</div>
              <div className="display-font text-4xl leading-none text-[var(--ink)]">{display.text}</div>
              <div className="max-w-xs text-sm leading-6 text-[var(--muted)]">
                Treat it like simple dictation: hear the word immediately, then answer from instinct.
              </div>
            </div>
          </div>

          <div className="min-h-7 text-center text-sm font-semibold">
            {result && (
              <span style={{ color: result === 'correct' ? 'var(--success)' : 'var(--error)' }}>
                {result === 'correct' ? 'Correct choice.' : `Wrong lane — the answer was ${round.correctSide === 'left' ? round.leftOption : round.rightOption}.`}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--glass)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--glass-hover)]"
              onClick={() => handleAnswer('left')}
              disabled={transitioning}
            >
              Choose {round.leftOption}
            </button>
            <button
              className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--paper)] hover:-translate-y-0.5"
              onClick={() => handleAnswer('right')}
              disabled={transitioning}
            >
              Choose {round.rightOption}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--panel-quiet)] p-4">
      <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-2xl font-extrabold text-[var(--ink)]">{value}</div>
      <div className="mt-1 text-sm text-[var(--muted)]">{detail}</div>
    </div>
  )
}
