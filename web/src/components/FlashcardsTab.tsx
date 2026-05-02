import { useState, useCallback, useRef, useEffect } from 'react'
import { getFlashCardRound, getCardDisplay, loadLevel, getLoadedWords } from '../services/vocabulary.ts'
import { loadScores, recordAnswer, loadWordStats, recordWordAnswer, pickWeightedCard, type WordStatsMap } from '../services/scores.ts'
import { speech } from '../services/speech.ts'
import { useSpeech } from '../hooks.ts'
import type { FlashCard, FlashCardRound, FlashCardScore } from '../types.ts'

type SwipeResult = 'correct' | 'wrong' | null

export function FlashcardsTab({
  nativeLang,
  targetLang,
  audioEnabled,
  level,
}: {
  nativeLang: string
  targetLang: string
  audioEnabled: boolean
  level: number
}) {
  useSpeech()
  const [words, setWords] = useState<FlashCard[]>(getLoadedWords(level))
  const [round, setRound] = useState<FlashCardRound | null>(null)
  const [scores, setScores] = useState<FlashCardScore>(loadScores)
  const [wordStats, setWordStats] = useState<WordStatsMap>(loadWordStats)
  const [showStats, setShowStats] = useState(false)
  const [result, setResult] = useState<SwipeResult>(null)
  const [dragX, setDragX] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const startX = useRef(0)
  const dragging = useRef(false)
  const [lastFeedback, setLastFeedback] = useState<{ nativeWord: string; correctAnswer: string } | null>(null)
  const feedbackTimer = useRef<number>(0)

  useEffect(() => {
    let cancelled = false
    loadLevel(level).then((w) => {
      if (cancelled) return
      setWords(w)
      const card = pickWeightedCard(w, wordStats)
      setRound(getFlashCardRound(nativeLang, targetLang, w, undefined, card))
    })
    return () => { cancelled = true }
  }, [level, nativeLang, targetLang])

  const display = round ? getCardDisplay(round.card, targetLang) : null

  const handleAnswer = useCallback((side: 'left' | 'right') => {
    if (transitioning || !round || words.length === 0) return
    const correct = side === round.correctSide
    const correctAnswer = round.correctSide === 'left' ? round.leftOption : round.rightOption
    const cardDisplay = getCardDisplay(round.card, targetLang)
    setResult(correct ? 'correct' : 'wrong')
    setLastFeedback({ nativeWord: cardDisplay.text, correctAnswer })
    setScores((prev) => recordAnswer(prev, correct))
    setWordStats((prev) => recordWordAnswer(prev, round.card.word, correct))
    setTransitioning(true)
    setDragX(side === 'left' ? -420 : 420)

    window.setTimeout(() => {
      const nextCard = pickWeightedCard(words, wordStats, round.card)
      setRound(getFlashCardRound(nativeLang, targetLang, words, round.card, nextCard))
      setDragX(0)
      setTransitioning(false)
    }, 400)

    window.clearTimeout(feedbackTimer.current)
    feedbackTimer.current = window.setTimeout(() => {
      setResult(null)
      setLastFeedback(null)
    }, 3500)
  }, [round, nativeLang, targetLang, transitioning, words, wordStats])

  useEffect(() => {
    if (!audioEnabled || transitioning || !display) return
    void speech.speak(display.text, targetLang)
  }, [audioEnabled, display?.text, targetLang, round?.card.word, transitioning])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (transitioning) return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (target?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (event.key === 'ArrowLeft') { event.preventDefault(); handleAnswer('left') }
      if (event.key === 'ArrowRight') { event.preventDefault(); handleAnswer('right') }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleAnswer, transitioning])

  useEffect(() => () => { speech.stopSpeaking() }, [])

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

  const onPointerUp = useCallback((event: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    const moved = Math.abs(event.clientX - startX.current)
    if (dragX < -80) handleAnswer('left')
    else if (dragX > 80) handleAnswer('right')
    else {
      setDragX(0)
      if (moved < 10 && audioEnabled && display) {
        void speech.speak(display.text, targetLang)
      }
    }
  }, [dragX, handleAnswer, audioEnabled, display, targetLang])

  if (!round || !display) {
    return <div className="flex flex-1 items-center justify-center text-[var(--muted)]">Loading...</div>
  }

  const pct = scores.total > 0 ? Math.round((scores.correct / scores.total) * 100) : 0

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-4">
      <aside className="hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--glass-strong)] p-4 shadow-[var(--shadow-card)] lg:block lg:order-1">
        <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Deck pace</div>
        <div className="mt-3 grid gap-3">
          <MetricCard label="Accuracy" value={`${pct}%`} detail={`${scores.correct}/${scores.total} correct`} />
          <MetricCard label="Current streak" value={`${scores.streak}`} detail="Keep the run alive" />
          <MetricCard label="Best streak" value={`${scores.bestStreak}`} detail="Your strongest session" />
        </div>
      </aside>

      <section
        className="flex min-h-0 flex-1 flex-col p-2 sm:p-4 lg:order-2 lg:rounded-[1.5rem] lg:border lg:border-[var(--line)] lg:shadow-[var(--shadow-card)]"
        style={{ background: 'var(--warm-gradient)' }}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-3">
          {/* Stats toggle */}
          <div className="flex justify-end">
            <button
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                showStats
                  ? 'bg-[var(--sky)] text-[var(--paper)]'
                  : 'text-[var(--muted)]'
              }`}
              onClick={() => setShowStats(!showStats)}
            >
              {showStats ? 'Play' : 'Stats'}
            </button>
          </div>

          {showStats ? (
            <WordStatsPanel words={words} wordStats={wordStats} targetLang={targetLang} nativeLang={nativeLang} />
          ) : (<>
          {/* Answer options */}
          <div className="flex items-center justify-between gap-2">
            <div className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-center">
              <div className="font-semibold text-[var(--ink)]" style={{ fontSize: 'calc(0.875rem * var(--content-scale))' }}>← {round.leftOption}</div>
            </div>
            <div className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-center">
              <div className="font-semibold text-[var(--ink)]" style={{ fontSize: 'calc(0.875rem * var(--content-scale))' }}>{round.rightOption} →</div>
            </div>
          </div>

          {/* Card */}
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div
              className="relative flex w-full max-w-[24rem] cursor-grab flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-[var(--line-strong)] px-5 py-8 text-center shadow-[var(--shadow-soft)] active:cursor-grabbing select-none touch-none sm:rounded-[2rem] sm:py-10"
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

              <div className="drop-shadow-sm" style={{ fontSize: `calc(4.5rem * var(--content-scale))` }}>{display.emoji}</div>
              <div className="display-font leading-none text-[var(--ink)]" style={{ fontSize: `calc(2.25rem * var(--content-scale))` }}>{display.text}</div>
              {display.translit && <div className="italic text-[var(--muted)]" style={{ fontSize: `calc(1.5rem * var(--content-scale))` }}>{display.translit}</div>}
            </div>
          </div>

          {/* Feedback */}
          <div className="min-h-7 text-center font-semibold" style={{ fontSize: 'calc(0.875rem * var(--content-scale))' }}>
            {result && lastFeedback && (
              <span style={{ color: result === 'correct' ? 'var(--success)' : 'var(--error)' }}>
                {lastFeedback.nativeWord} = {lastFeedback.correctAnswer}
              </span>
            )}
          </div>
          </>)}
        </div>
      </section>
    </div>
  )
}

function WordStatsPanel({ words, wordStats, targetLang, nativeLang }: { words: FlashCard[]; wordStats: WordStatsMap; targetLang: string; nativeLang: string }) {
  const rows = words.map((w) => {
    const s = wordStats[w.word]
    return {
      word: w.translations[targetLang] ?? w.word,
      meaning: w.translations[nativeLang] ?? w.word,
      emoji: w.emoji,
      correct: s?.correct ?? 0,
      wrong: s?.wrong ?? 0,
      total: (s?.correct ?? 0) + (s?.wrong ?? 0),
    }
  }).sort((a, b) => {
    // Show worst accuracy first, then unseen
    const aRate = a.total > 0 ? a.correct / a.total : -1
    const bRate = b.total > 0 ? b.correct / b.total : -1
    return aRate - bRate
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[1rem] border border-[var(--line)] bg-[var(--glass)]">
      {rows.map((r) => {
        const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : -1
        return (
          <div key={r.word} className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-2 last:border-b-0">
            <span className="text-base">{r.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--ink)]">{r.word}</div>
              <div className="truncate text-xs text-[var(--muted)]">{r.meaning}</div>
            </div>
            <div className="shrink-0 text-right text-xs">
              {r.total === 0 ? (
                <span className="text-[var(--muted)]">—</span>
              ) : (
                <>
                  <span style={{ color: pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--error)' }}>{pct}%</span>
                  <span className="ml-1 text-[var(--muted)]">{r.correct}/{r.total}</span>
                </>
              )}
            </div>
          </div>
        )
      })}
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
