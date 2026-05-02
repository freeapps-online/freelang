import { useState, useCallback, useRef, useEffect } from 'react'
import { speech } from '../services/speech.ts'
import { useSpeech } from '../hooks.ts'
import { reportSentenceScore } from '../services/cloud.ts'
import type { Sentence } from '../types.ts'

const sentenceModules: Record<number, () => Promise<{ default: Sentence[] }>> = {
  1: () => import('../data/sentences1.ts'),
  2: () => import('../data/sentences2.ts'),
  3: () => import('../data/sentences3.ts'),
  4: () => import('../data/sentences4.ts'),
  5: () => import('../data/sentences5.ts'),
}

const loadedSentences: Map<number, Sentence[]> = new Map()
const STATS_KEY = 'freelang-sentence-stats'

async function loadSentences(level: number): Promise<Sentence[]> {
  const cached = loadedSentences.get(level)
  if (cached) return cached
  const loader = sentenceModules[level]
  if (!loader) return []
  const mod = await loader()
  loadedSentences.set(level, mod.default)
  return mod.default
}

// --- Per-sentence stats ---
interface SentenceStat { attempts: number; bestScore: number; lastScore: number; totalScore: number; lastSeen: number }
type SentenceStatsMap = Record<string, SentenceStat>

function loadSentenceStats(): SentenceStatsMap {
  try { const r = localStorage.getItem(STATS_KEY); if (r) return JSON.parse(r) } catch {}
  return {}
}
function saveSentenceStats(s: SentenceStatsMap) { localStorage.setItem(STATS_KEY, JSON.stringify(s)) }

function recordSentenceAttempt(stats: SentenceStatsMap, id: string, score: number): SentenceStatsMap {
  const prev = stats[id] ?? { attempts: 0, bestScore: 0, lastScore: 0, totalScore: 0, lastSeen: 0 }
  const next = { ...stats, [id]: {
    attempts: prev.attempts + 1,
    bestScore: Math.max(prev.bestScore, score),
    lastScore: score,
    totalScore: prev.totalScore + score,
    lastSeen: Date.now(),
  }}
  saveSentenceStats(next)
  return next
}

function pickWeightedSentence(pool: Sentence[], stats: SentenceStatsMap, exclude?: Sentence): Sentence {
  const filtered = exclude ? pool.filter(s => s.id !== exclude.id) : pool
  if (filtered.length === 0) return pool[0]
  const now = Date.now()
  const weights = filtered.map(s => {
    const st = stats[s.id]
    if (!st) return 3
    const avgScore = st.attempts > 0 ? st.totalScore / st.attempts : 50
    const hoursSince = (now - st.lastSeen) / 3600000
    return 1 + (100 - avgScore) / 25 + Math.min(hoursSince / 24, 2) + (st.attempts < 2 ? 1 : 0)
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < filtered.length; i++) { r -= weights[i]; if (r <= 0) return filtered[i] }
  return filtered[filtered.length - 1]
}

// --- Scoring ---
interface WordResult { expected: string; got: string; ok: boolean }
interface AttemptResult { score: number; words: WordResult[]; raw: string }

function scoreAttempt(expected: string, attempt: string): AttemptResult {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim()
  const expectedWords = norm(expected).split(/\s+/)
  const attemptWords = norm(attempt).split(/\s+/)

  const words = expectedWords.map((w, i) => ({
    expected: w,
    got: i < attemptWords.length ? attemptWords[i] : '',
    ok: i < attemptWords.length && attemptWords[i] === w,
  }))

  const correct = words.filter(r => r.ok).length
  return { score: expectedWords.length > 0 ? Math.round((correct / expectedWords.length) * 100) : 0, words, raw: attempt }
}

const MAX_SENTENCE_LEVEL = 5

export function SpeakTab({ nativeLang, targetLang, level: rawLevel, showStats: showStatsExternal }: { nativeLang: string; targetLang: string; level: number; showStats: boolean }) {
  const sp = useSpeech()
  const level = Math.min(rawLevel, MAX_SENTENCE_LEVEL)
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [sentence, setSentence] = useState<Sentence | null>(null)
  const [attempt, setAttempt] = useState<AttemptResult | null>(null)
  const [sentenceStats, setSentenceStats] = useState<SentenceStatsMap>(loadSentenceStats)
  const showStats = showStatsExternal
  const [dragX, setDragX] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const startXRef = useRef(0)
  const dragging = useRef(false)

  useEffect(() => {
    let cancelled = false
    loadSentences(level).then((s) => {
      if (cancelled) return
      setSentences(s)
      setSentence(pickWeightedSentence(s, sentenceStats))
      setAttempt(null)
    })
    return () => { cancelled = true }
  }, [level])

  const targetText = sentence?.text[targetLang] ?? sentence?.text.en ?? ''
  const nativeText = sentence?.text[nativeLang] ?? sentence?.text.en ?? ''

  const playAudio = useCallback(() => {
    if (!targetText) return
    void speech.speak(targetText, targetLang)
  }, [targetText, targetLang])

  useEffect(() => {
    if (targetText && !transitioning) void speech.speak(targetText, targetLang)
  }, [targetText, targetLang, sentence?.id, transitioning])

  const startRecording = useCallback(() => {
    setAttempt(null)
    speech.startListening(targetLang, (transcript) => {
      const result = scoreAttempt(targetText, transcript)
      setAttempt(result)
      if (sentence) {
        setSentenceStats(prev => recordSentenceAttempt(prev, sentence.id, result.score))
        void reportSentenceScore(sentence.id, result.score)
      }
    })
  }, [targetLang, targetText, sentence])

  const stopRecording = useCallback(() => { speech.stopListening() }, [])

  const goNext = useCallback(() => {
    if (transitioning || sentences.length === 0) return
    setTransitioning(true)
    setDragX(300)
    setTimeout(() => {
      setSentence(prev => pickWeightedSentence(sentences, sentenceStats, prev ?? undefined))
      setAttempt(null)
      setDragX(0)
      setTransitioning(false)
    }, 300)
  }, [transitioning, sentences, sentenceStats])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (transitioning) return
    dragging.current = true
    startXRef.current = e.clientX
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [transitioning])
  const onPointerMove = useCallback((e: React.PointerEvent) => { if (dragging.current) setDragX(e.clientX - startXRef.current) }, [])
  const onPointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    if (Math.abs(dragX) > 80) goNext()
    else setDragX(0)
  }, [dragX, goNext])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') { e.preventDefault(); goNext() }
      if (e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); startRecording() }
    }
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); stopRecording() } }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  }, [goNext, startRecording, stopRecording])

  useEffect(() => () => { speech.stopSpeaking(); speech.stopListening() }, [])

  if (!sentence) return <div className="flex flex-1 items-center justify-center text-[var(--muted)]">Loading...</div>

  if (showStats) {
    return <SentenceStatsPanel sentences={sentences} stats={sentenceStats} targetLang={targetLang} nativeLang={nativeLang} />
  }

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] flex-col gap-2 lg:h-auto">

      {/* Card */}
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <div
          className="relative flex w-full max-w-md cursor-grab flex-col items-center gap-3 rounded-[1.5rem] border border-[var(--line-strong)] p-5 text-center shadow-[var(--shadow-soft)] active:cursor-grabbing select-none touch-none sm:rounded-[2rem] sm:p-8"
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
          <button className="display-font leading-snug text-[var(--ink)]" style={{ fontSize: 'calc(1.5rem * var(--content-scale))' }} onClick={playAudio}>{targetText}</button>
          <div className="text-sm text-[var(--muted)]">{nativeText}</div>

          {/* Live transcription */}
          {sp.isListening && sp.transcript && (
            <div className="italic text-[var(--sky)]" style={{ fontSize: 'calc(0.875rem * var(--content-scale))' }}>
              {sp.transcript}
            </div>
          )}

          {/* Scored result */}
          {attempt && (
            <div className="space-y-2">
              <div className="flex flex-wrap justify-center gap-1">
                {attempt.words.map((w, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <span className="rounded px-1.5 py-0.5 text-sm font-medium" style={{ color: w.ok ? 'var(--success)' : 'var(--error)', background: w.ok ? 'rgba(45,144,119,0.1)' : 'rgba(199,79,67,0.1)' }}>
                      {w.expected}
                    </span>
                    {!w.ok && w.got && (
                      <span className="text-[0.6rem] text-[var(--error)]">{w.got}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="font-semibold" style={{ color: attempt.score >= 70 ? 'var(--success)' : attempt.score >= 40 ? 'var(--warning)' : 'var(--error)' }}>{attempt.score}%</div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 py-1">
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--glass)] text-[var(--muted)]" onClick={playAudio} disabled={sp.isSpeaking}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
        </button>
        <button
          className={`flex h-14 w-14 items-center justify-center rounded-full border-2 transition ${sp.isListening ? 'border-[var(--error)] bg-[var(--error)] text-white pulse-ring' : 'border-[var(--accent)] bg-[var(--accent)] text-white'}`}
          onPointerDown={startRecording} onPointerUp={stopRecording} onPointerLeave={stopRecording}
        >
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
        </button>
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--glass)] text-[var(--muted)]" onClick={goNext}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
        </button>
      </div>
    </div>
  )
}

function SentenceStatsPanel({ sentences, stats, targetLang, nativeLang }: {
  sentences: Sentence[]; stats: SentenceStatsMap; targetLang: string; nativeLang: string
}) {
  const [sort, setSort] = useState<'worst' | 'best' | 'most' | 'unseen'>('worst')

  const rows = sentences.map(s => {
    const st = stats[s.id]
    const avg = st && st.attempts > 0 ? Math.round(st.totalScore / st.attempts) : -1
    return { id: s.id, text: s.text[targetLang] ?? s.text.en ?? '', meaning: s.text[nativeLang] ?? '', emoji: s.emoji, attempts: st?.attempts ?? 0, bestScore: st?.bestScore ?? 0, avgScore: avg, lastScore: st?.lastScore ?? 0 }
  })

  const practiced = rows.filter(r => r.attempts > 0)
  const unseen = rows.filter(r => r.attempts === 0)
  const totalAttempts = rows.reduce((a, r) => a + r.attempts, 0)
  const overallAvg = practiced.length > 0 ? Math.round(practiced.reduce((a, r) => a + r.avgScore, 0) / practiced.length) : 0

  const sorted = [...rows]
  switch (sort) {
    case 'worst': sorted.sort((a, b) => { if (!a.attempts) return 1; if (!b.attempts) return -1; return a.avgScore - b.avgScore }); break
    case 'best': sorted.sort((a, b) => { if (!a.attempts) return 1; if (!b.attempts) return -1; return b.avgScore - a.avgScore }); break
    case 'most': sorted.sort((a, b) => b.attempts - a.attempts); break
    case 'unseen': sorted.sort((a, b) => a.attempts - b.attempts); break
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MiniStat label="Avg score" value={`${overallAvg}%`} color={overallAvg >= 70 ? 'var(--success)' : 'var(--warning)'} detail={`${totalAttempts} attempts`} />
        <MiniStat label="Practiced" value={`${practiced.length}`} color="var(--success)" detail={`of ${rows.length}`} />
        <MiniStat label="Unseen" value={`${unseen.length}`} color="var(--sky)" detail="not tried yet" />
        <MiniStat label="Struggling" value={`${practiced.filter(r => r.avgScore < 50).length}`} color="var(--error)" detail="avg <50%" />
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {([['worst','Weakest'],['best','Strongest'],['most','Most tried'],['unseen','New']] as const).map(([k,l]) => (
          <button key={k} className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${sort === k ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--muted)]'}`} onClick={() => setSort(k)}>{l}</button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[0.75rem] border border-[var(--line)] bg-[var(--glass)]">
        {sorted.map(r => (
          <div key={r.id} className="flex items-center gap-3 border-b border-[var(--line)] px-3 py-2 last:border-b-0">
            <span>{r.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--ink)]">{r.text}</div>
              <div className="truncate text-xs text-[var(--muted)]">{r.meaning}</div>
            </div>
            {r.attempts === 0 ? (
              <span className="text-xs text-[var(--muted)]">new</span>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--line)]">
                  <div className="h-full rounded-full" style={{ width: `${r.avgScore}%`, background: r.avgScore >= 70 ? 'var(--success)' : r.avgScore >= 40 ? 'var(--warning)' : 'var(--error)' }} />
                </div>
                <span className="w-8 text-right text-xs font-semibold" style={{ color: r.avgScore >= 70 ? 'var(--success)' : r.avgScore >= 40 ? 'var(--warning)' : 'var(--error)' }}>{r.avgScore}%</span>
                <span className="w-6 text-right text-[0.6rem] text-[var(--muted)]">×{r.attempts}</span>
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
