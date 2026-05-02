import { useState, useCallback, useRef, useEffect } from 'react'
import { speech } from '../services/speech.ts'
import { useSpeech } from '../hooks.ts'
import type { Sentence } from '../types.ts'

const sentenceModules: Record<number, () => Promise<{ default: Sentence[] }>> = {
  1: () => import('../data/sentences1.ts'),
  2: () => import('../data/sentences2.ts'),
  3: () => import('../data/sentences3.ts'),
  4: () => import('../data/sentences4.ts'),
  5: () => import('../data/sentences5.ts'),
}

const LEVELS = [1, 2, 3, 4, 5]
const loadedSentences: Map<number, Sentence[]> = new Map()

async function loadSentences(level: number): Promise<Sentence[]> {
  const cached = loadedSentences.get(level)
  if (cached) return cached
  const loader = sentenceModules[level]
  if (!loader) return []
  const mod = await loader()
  loadedSentences.set(level, mod.default)
  return mod.default
}

function scoreAttempt(expected: string, attempt: string): { score: number; words: { word: string; ok: boolean }[] } {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim()
  const expectedWords = norm(expected).split(/\s+/)
  const attemptWords = norm(attempt).split(/\s+/)

  const result = expectedWords.map((w, i) => ({
    word: w,
    ok: i < attemptWords.length && attemptWords[i] === w,
  }))

  const correct = result.filter(r => r.ok).length
  return { score: expectedWords.length > 0 ? Math.round((correct / expectedWords.length) * 100) : 0, words: result }
}

export function SpeakTab({
  nativeLang,
  targetLang,
}: {
  nativeLang: string
  targetLang: string
}) {
  const sp = useSpeech()
  const [level, setLevel] = useState(1)
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [index, setIndex] = useState(0)
  const [attempt, setAttempt] = useState<{ score: number; words: { word: string; ok: boolean }[] } | null>(null)
  const [dragX, setDragX] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const startX = useRef(0)
  const dragging = useRef(false)

  useEffect(() => {
    let cancelled = false
    loadSentences(level).then((s) => {
      if (cancelled) return
      setSentences(s)
      setIndex(0)
      setAttempt(null)
    })
    return () => { cancelled = true }
  }, [level])

  const sentence = sentences[index]
  const targetText = sentence?.text[targetLang] ?? sentence?.text.en ?? ''
  const nativeText = sentence?.text[nativeLang] ?? sentence?.text.en ?? ''

  const playAudio = useCallback(() => {
    if (!targetText) return
    void speech.speak(targetText, targetLang)
  }, [targetText, targetLang])

  // Auto-play on new sentence
  useEffect(() => {
    if (targetText && !transitioning) {
      void speech.speak(targetText, targetLang)
    }
  }, [targetText, targetLang, index, transitioning])

  const startRecording = useCallback(() => {
    setAttempt(null)
    speech.startListening(targetLang, (transcript) => {
      const result = scoreAttempt(targetText, transcript)
      setAttempt(result)
    })
  }, [targetLang, targetText])

  const stopRecording = useCallback(() => {
    speech.stopListening()
  }, [])

  const goNext = useCallback(() => {
    if (transitioning || sentences.length === 0) return
    setTransitioning(true)
    setDragX(300)
    setTimeout(() => {
      setIndex((i) => (i + 1) % sentences.length)
      setAttempt(null)
      setDragX(0)
      setTransitioning(false)
    }, 300)
  }, [transitioning, sentences.length])

  const goPrev = useCallback(() => {
    if (transitioning || sentences.length === 0) return
    setTransitioning(true)
    setDragX(-300)
    setTimeout(() => {
      setIndex((i) => (i - 1 + sentences.length) % sentences.length)
      setAttempt(null)
      setDragX(0)
      setTransitioning(false)
    }, 300)
  }, [transitioning, sentences.length])

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
    if (dragX > 80) goPrev()
    else if (dragX < -80) goNext()
    else setDragX(0)
  }, [dragX, goNext, goPrev])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
        e.preventDefault()
        goNext()
      }
      if (e.key === ' ') {
        e.preventDefault()
        startRecording()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        stopRecording()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [goNext, startRecording, stopRecording])

  useEffect(() => () => { speech.stopSpeaking(); speech.stopListening() }, [])

  if (!sentence) {
    return <div className="flex flex-1 items-center justify-center text-[var(--muted)]">Loading...</div>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* Level selector */}
      <div className="flex items-center gap-1">
        {LEVELS.map((l) => (
          <button
            key={l}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold transition ${
              l === level
                ? 'bg-[var(--accent)] text-[var(--paper)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
            onClick={() => setLevel(l)}
          >
            {l}
          </button>
        ))}
        <span className="ml-auto text-xs text-[var(--muted)]">{index + 1}/{sentences.length}</span>
      </div>

      {/* Sentence card */}
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          className="relative flex w-full max-w-md cursor-grab flex-col items-center gap-4 rounded-[1.5rem] border border-[var(--line-strong)] p-5 text-center shadow-[var(--shadow-soft)] active:cursor-grabbing select-none touch-none sm:rounded-[2rem] sm:p-8"
          style={{
            background: 'var(--card-gradient)',
            transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`,
            transition: transitioning ? 'transform 0.3s ease-out, opacity 0.3s ease-out' : 'none',
            opacity: transitioning ? 0 : 1,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="drop-shadow-sm" style={{ fontSize: 'calc(3rem * var(--content-scale))' }}>{sentence.emoji}</div>

          {/* Target language sentence */}
          <button
            className="display-font leading-snug text-[var(--ink)]"
            style={{ fontSize: 'calc(1.5rem * var(--content-scale))' }}
            onClick={playAudio}
          >
            {targetText}
          </button>

          {/* Native translation (small) */}
          <div className="text-sm text-[var(--muted)]">{nativeText}</div>

          {/* Scoring result */}
          {attempt && (
            <div className="space-y-2">
              <div className="flex flex-wrap justify-center gap-1">
                {attempt.words.map((w, i) => (
                  <span
                    key={i}
                    className="rounded px-1.5 py-0.5 text-sm font-medium"
                    style={{
                      color: w.ok ? 'var(--success)' : 'var(--error)',
                      background: w.ok ? 'rgba(45, 144, 119, 0.1)' : 'rgba(199, 79, 67, 0.1)',
                    }}
                  >
                    {w.word}
                  </span>
                ))}
              </div>
              <div className="font-semibold" style={{ color: attempt.score >= 70 ? 'var(--success)' : attempt.score >= 40 ? 'var(--warning)' : 'var(--error)' }}>
                {attempt.score}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 py-2">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--glass)] text-[var(--muted)] hover:text-[var(--ink)]"
          onClick={playAudio}
          disabled={sp.isSpeaking}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
          </svg>
        </button>

        <button
          className={`flex h-14 w-14 items-center justify-center rounded-full border-2 transition ${
            sp.isListening
              ? 'border-[var(--error)] bg-[var(--error)] text-white pulse-ring'
              : 'border-[var(--accent)] bg-[var(--accent)] text-white'
          }`}
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          onPointerLeave={stopRecording}
        >
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </button>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--glass)] text-[var(--muted)] hover:text-[var(--ink)]"
          onClick={goNext}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}
