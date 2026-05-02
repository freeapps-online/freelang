import { useState, useCallback, useRef, useEffect } from 'react'
import { getFlashCardRound, getCardDisplay, loadLevel, getLoadedWords } from '../services/vocabulary.ts'
import { loadScores, recordAnswer, loadWordStats, recordWordAnswer, pickWeightedCard, type WordStatsMap } from '../services/scores.ts'
import { speech } from '../services/speech.ts'
import { useSpeech } from '../hooks.ts'
import { reportCardScore } from '../services/cloud.ts'
import type { FlashCard, FlashCardRound, FlashCardScore } from '../types.ts'

type SwipeResult = 'correct' | 'wrong' | null

export function FlashcardsTab({
  nativeLang,
  targetLang,
  audioEnabled,
  level,
  showStats,
}: {
  nativeLang: string
  targetLang: string
  audioEnabled: boolean
  level: number
  showStats: boolean
}) {
  useSpeech()
  const [words, setWords] = useState<FlashCard[]>(getLoadedWords(level))
  const [round, setRound] = useState<FlashCardRound | null>(null)
  const [scores, setScores] = useState<FlashCardScore>(loadScores)
  const [wordStats, setWordStats] = useState<WordStatsMap>(loadWordStats)
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
    void reportCardScore(round.card.word, correct)
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
      if (event.key === 'ArrowUp' && round) { event.preventDefault(); void speech.speak(round.leftOption, nativeLang) }
      if (event.key === 'ArrowDown' && round) { event.preventDefault(); void speech.speak(round.rightOption, nativeLang) }
      if ((event.key === 'Enter' || event.key === ' ') && display) { event.preventDefault(); void speech.speak(display.text, targetLang) }
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
    <div className="flex h-[calc(100dvh-90px)] flex-col lg:h-auto">
      <section
        className="flex flex-1 flex-col p-2 sm:p-3 lg:p-4"
        style={{ background: 'var(--warm-gradient)' }}
      >
        <div className="flex h-full flex-col gap-2">
          {showStats ? (
            <WordStatsPanel words={words} wordStats={wordStats} targetLang={targetLang} nativeLang={nativeLang} />
          ) : (<>
          {/* Answer options + live score */}
          <div className="flex items-center justify-between gap-2">
            <div className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-center">
              <div className="font-semibold text-[var(--ink)]" style={{ fontSize: 'calc(0.875rem * var(--content-scale))' }}>← {round.leftOption}</div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-[var(--success)]">{scores.correct}</span>
              <span className="text-[var(--muted)]">/</span>
              <span className="text-[var(--error)]">{scores.total - scores.correct}</span>
            </div>
            <div className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-center">
              <div className="font-semibold text-[var(--ink)]" style={{ fontSize: 'calc(0.875rem * var(--content-scale))' }}>{round.rightOption} →</div>
            </div>
          </div>

          {/* Card */}
          <div className="flex flex-1 items-center justify-center overflow-hidden">
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
          <div className="pb-2 text-center font-semibold" style={{ fontSize: 'calc(0.875rem * var(--content-scale))' }}>
            {result && lastFeedback && (
              <span style={{ color: result === 'correct' ? 'var(--success)' : 'var(--error)' }}>
                {lastFeedback.nativeWord} = {lastFeedback.correctAnswer}
              </span>
            )}
          </div>
          </>)}
        </div>
      </section>

      {/* Desktop: always-visible stats bar */}
      {!showStats && (
        <div className="hidden border-t border-[var(--line)] bg-[var(--glass)] px-4 py-2 lg:flex lg:items-center lg:gap-6">
          <span className="text-xs font-semibold text-[var(--muted)]">
            Accuracy: <span className="text-[var(--ink)]">{pct}%</span> ({scores.correct}/{scores.total})
          </span>
          <span className="text-xs font-semibold text-[var(--muted)]">
            Streak: <span className="text-[var(--ink)]">{scores.streak}</span>
          </span>
          <span className="text-xs font-semibold text-[var(--muted)]">
            Best: <span className="text-[var(--ink)]">{scores.bestStreak}</span>
          </span>
          {result && lastFeedback && (
            <span className="ml-auto text-sm font-semibold" style={{ color: result === 'correct' ? 'var(--success)' : 'var(--error)' }}>
              {lastFeedback.nativeWord} = {lastFeedback.correctAnswer}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

type SortKey = 'worst' | 'best' | 'most-practiced' | 'least-practiced' | 'unseen'

function WordStatsPanel({ words, wordStats, targetLang, nativeLang }: { words: FlashCard[]; wordStats: WordStatsMap; targetLang: string; nativeLang: string }) {
  const [sort, setSort] = useState<SortKey>('worst')

  const rows = words.map((w) => {
    const s = wordStats[w.word]
    const correct = s?.correct ?? 0
    const wrong = s?.wrong ?? 0
    const total = correct + wrong
    const pct = total > 0 ? Math.round((correct / total) * 100) : -1
    return {
      key: w.word,
      word: w.translations[targetLang] ?? w.word,
      meaning: w.translations[nativeLang] ?? w.word,
      emoji: w.emoji,
      correct,
      wrong,
      total,
      pct,
      lastSeen: s?.lastSeen ?? 0,
    }
  })

  // Summary
  const seen = rows.filter(r => r.total > 0)
  const unseen = rows.filter(r => r.total === 0)
  const struggling = seen.filter(r => r.pct < 50)
  const mastered = seen.filter(r => r.pct >= 90 && r.total >= 3)
  const learning = seen.filter(r => r.pct >= 50 && r.pct < 90)
  const totalAnswers = rows.reduce((a, r) => a + r.total, 0)
  const totalCorrect = rows.reduce((a, r) => a + r.correct, 0)
  const overallPct = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0

  // Sort
  const sorted = [...rows]
  switch (sort) {
    case 'worst':
      sorted.sort((a, b) => {
        if (a.total === 0 && b.total === 0) return 0
        if (a.total === 0) return 1
        if (b.total === 0) return -1
        return a.pct - b.pct
      })
      break
    case 'best':
      sorted.sort((a, b) => {
        if (a.total === 0 && b.total === 0) return 0
        if (a.total === 0) return 1
        if (b.total === 0) return -1
        return b.pct - a.pct
      })
      break
    case 'most-practiced':
      sorted.sort((a, b) => b.total - a.total)
      break
    case 'least-practiced':
      sorted.sort((a, b) => a.total - b.total)
      break
    case 'unseen':
      sorted.sort((a, b) => a.total - b.total || a.key.localeCompare(b.key))
      break
  }

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'worst', label: 'Weakest' },
    { key: 'best', label: 'Strongest' },
    { key: 'most-practiced', label: 'Most seen' },
    { key: 'least-practiced', label: 'Least seen' },
    { key: 'unseen', label: 'New words' },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MiniStat label="Overall" value={`${overallPct}%`} color={overallPct >= 70 ? 'var(--success)' : overallPct >= 40 ? 'var(--warning)' : 'var(--error)'} detail={`${totalCorrect}/${totalAnswers}`} />
        <MiniStat label="Mastered" value={`${mastered.length}`} color="var(--success)" detail={`≥90% & 3+ tries`} />
        <MiniStat label="Learning" value={`${learning.length}`} color="var(--warning)" detail="50–89%" />
        <MiniStat label="Struggling" value={`${struggling.length}`} color="var(--error)" detail="<50%" />
      </div>

      {/* Recommendations */}
      {struggling.length > 0 && (
        <div className="rounded-[0.75rem] border border-[var(--error)]/20 bg-[var(--error)]/5 px-3 py-2 text-xs text-[var(--error)]">
          Focus on: {struggling.slice(0, 5).map(r => r.word).join(', ')}{struggling.length > 5 ? ` (+${struggling.length - 5} more)` : ''}
        </div>
      )}
      {unseen.length > 0 && seen.length > 0 && (
        <div className="rounded-[0.75rem] border border-[var(--sky)]/20 bg-[var(--sky)]/5 px-3 py-2 text-xs text-[var(--sky)]">
          {unseen.length} word{unseen.length !== 1 ? 's' : ''} not yet practiced
        </div>
      )}

      {/* Sort controls */}
      <div className="flex gap-1 overflow-x-auto">
        {sortOptions.map(({ key, label }) => (
          <button
            key={key}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold transition ${
              sort === key ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
            onClick={() => setSort(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Word list */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[0.75rem] border border-[var(--line)] bg-[var(--glass)]">
        {sorted.map((r) => (
          <div key={r.key} className="flex items-center gap-3 border-b border-[var(--line)] px-3 py-2 last:border-b-0">
            <span className="text-base">{r.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--ink)]">{r.word}</div>
              <div className="truncate text-xs text-[var(--muted)]">{r.meaning}</div>
            </div>
            {r.total === 0 ? (
              <span className="shrink-0 text-xs text-[var(--muted)]">new</span>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--line)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${r.pct}%`,
                      background: r.pct >= 70 ? 'var(--success)' : r.pct >= 40 ? 'var(--warning)' : 'var(--error)',
                    }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-semibold" style={{ color: r.pct >= 70 ? 'var(--success)' : r.pct >= 40 ? 'var(--warning)' : 'var(--error)' }}>
                  {r.pct}%
                </span>
                <span className="w-10 text-right text-[0.65rem] text-[var(--muted)]">{r.correct}/{r.total}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniStat({ label, value, color, detail }: { label: string; value: string; color: string; detail: string }) {
  return (
    <div className="rounded-[0.75rem] border border-[var(--line)] bg-[var(--glass)] p-2.5">
      <div className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-xl font-extrabold" style={{ color }}>{value}</div>
      <div className="text-[0.6rem] text-[var(--muted)]">{detail}</div>
    </div>
  )
}

