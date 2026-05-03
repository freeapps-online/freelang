import { SentenceStatsPanel } from './practice/SentenceStatsPanel.tsx'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { ArrowRight, Mic, Volume2 } from 'lucide-react'
import { speech } from '../services/speech.ts'
import { useSpeech } from '../useSpeech.ts'
import { reportSentenceScore } from '../services/cloud.ts'
import { t } from '../services/i18n.ts'
import { filterSentencesByLength, loadPracticeDeck, type SentenceLengthFilter } from '../services/practiceContent.ts'
import { SENTENCE_PASS_SCORE, loadSentenceStats, recordSentenceAttempt, type SentenceStatsMap } from '../services/sentenceStats.ts'
import type { PracticeInputMode } from '../services/settings.ts'
import { getTranslit } from '../services/translit.ts'
import type { Sentence } from '../types.ts'

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
type SpeakStatus = 'idle' | 'prompting' | 'listening' | 'blocked' | 'unsupported'

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

export function SentencesTab({
  nativeLang,
  targetLang,
  level,
  levelLabel,
  lengthFilter,
  inputMode,
  uiLang,
  showStats: showStatsExternal,
  onShowStatsChange,
  onInputModeChange: _onInputModeChange,
  onLengthFilterChange,
}: {
  nativeLang: string
  targetLang: string
  level: number
  levelLabel: string
  lengthFilter: SentenceLengthFilter
  inputMode: PracticeInputMode
  uiLang: string
  showStats: boolean
  onShowStatsChange: (show: boolean) => void
  onInputModeChange: (mode: PracticeInputMode) => void
  onLengthFilterChange: (filter: SentenceLengthFilter) => void
}) {
  const sp = useSpeech()
  const [allSentences, setAllSentences] = useState<Sentence[]>([])
  const [sentence, setSentence] = useState<Sentence | null>(null)
  const [attempt, setAttempt] = useState<AttemptResult | null>(null)
  const [sentenceStats, setSentenceStats] = useState<SentenceStatsMap>(loadSentenceStats)
  const showStats = showStatsExternal
  const [listenOnly] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [, setSpeakStatus] = useState<SpeakStatus>('idle')
  const startXRef = useRef(0)
  const dragging = useRef(false)
  const advanceTimer = useRef<number>(0)
  const speakTimer = useRef<number>(0)
  const speakRunId = useRef(0)
  const sentenceStatsRef = useRef(sentenceStats)

  useEffect(() => {
    sentenceStatsRef.current = sentenceStats
  }, [sentenceStats])

  const shortSentences = useMemo(() => filterSentencesByLength(allSentences, 'short'), [allSentences])
  const longSentences = useMemo(() => filterSentencesByLength(allSentences, 'long'), [allSentences])
  const sentences = useMemo(
    () => (lengthFilter === 'short' ? shortSentences : longSentences),
    [lengthFilter, longSentences, shortSentences],
  )

  useEffect(() => {
    let cancelled = false
    loadPracticeDeck(level).then((s) => {
      if (cancelled) return
      const nextShort = filterSentencesByLength(s, 'short')
      const nextLong = filterSentencesByLength(s, 'long')
      if (lengthFilter === 'short' && nextShort.length === 0 && nextLong.length > 0) {
        onLengthFilterChange('long')
        return
      }
      if (lengthFilter === 'long' && nextLong.length === 0 && nextShort.length > 0) {
        onLengthFilterChange('short')
        return
      }
      const nextPool = lengthFilter === 'short' ? nextShort : nextLong
      setAllSentences(s)
      setSentence(nextPool.length > 0 ? pickWeightedSentence(nextPool, sentenceStatsRef.current) : null)
      setAttempt(null)
      setSpeakStatus('idle')
    })
    return () => { cancelled = true }
  }, [lengthFilter, level, onLengthFilterChange])

  const targetText = sentence?.text[targetLang] ?? sentence?.text.en ?? ''
  const nativeText = sentence?.text[nativeLang] ?? sentence?.text.en ?? ''
  const promptVisible = !listenOnly || attempt !== null

  const playAudio = useCallback(() => {
    if (!targetText) return
    void speech.speak(targetText, targetLang)
  }, [targetText, targetLang])

  useEffect(() => {
    if (inputMode !== 'keyboard') return
    if (targetText && !transitioning) void speech.speak(targetText, targetLang)
  }, [inputMode, targetText, targetLang, sentence?.id, transitioning])

  const selectNextSentence = useCallback((exclude?: Sentence, statsOverride = sentenceStatsRef.current) => {
    if (sentences.length === 0) return
    setSentence(pickWeightedSentence(sentences, statsOverride, exclude))
    setAttempt(null)
    setDragX(0)
    setTransitioning(false)
    setSpeakStatus('idle')
  }, [sentences])

  const commitAttempt = useCallback((currentSentence: Sentence, result: AttemptResult, autoAdvance: boolean) => {
    let nextSentenceStats = sentenceStatsRef.current
    setAttempt(result)
    setSentenceStats(prev => {
      nextSentenceStats = recordSentenceAttempt(prev, currentSentence.id, result.score)
      return nextSentenceStats
    })
    void reportSentenceScore(currentSentence.id, result.score)

    if (autoAdvance) {
      window.clearTimeout(advanceTimer.current)
      advanceTimer.current = window.setTimeout(() => {
        selectNextSentence(currentSentence, nextSentenceStats)
      }, result.score >= SENTENCE_PASS_SCORE ? 900 : 1300)
    }
  }, [selectNextSentence])

  const startRecording = useCallback(() => {
    if (inputMode !== 'keyboard') return
    setAttempt(null)
    speech.startListening(targetLang, (transcript) => {
      const result = scoreAttempt(targetText, transcript)
      if (sentence) {
        commitAttempt(sentence, result, false)
      }
    })
  }, [commitAttempt, inputMode, targetLang, targetText, sentence])

  const stopRecording = useCallback(() => { speech.stopListening() }, [])

  const focusSentence = useCallback((nextSentence: Sentence) => {
    speech.stopListening()
    speech.stopSpeaking()
    setAttempt(null)
    setDragX(0)
    setTransitioning(false)
    setSentence(nextSentence)
    setSpeakStatus('idle')
    onShowStatsChange(false)
  }, [onShowStatsChange])

  const goNext = useCallback(() => {
    if (transitioning || sentences.length === 0) return
    setTransitioning(true)
    setDragX(300)
    setTimeout(() => {
      selectNextSentence(sentence ?? undefined)
    }, 300)
  }, [selectNextSentence, sentence, sentences.length, transitioning])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (transitioning || inputMode !== 'keyboard') return
    dragging.current = true
    startXRef.current = e.clientX
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [inputMode, transitioning])
  const onPointerMove = useCallback((e: React.PointerEvent) => { if (dragging.current) setDragX(e.clientX - startXRef.current) }, [])
  const onPointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    if (Math.abs(dragX) > 80) goNext()
    else setDragX(0)
  }, [dragX, goNext])

  useEffect(() => {
    if (inputMode !== 'keyboard') return
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
  }, [goNext, inputMode, startRecording, stopRecording])

  useEffect(() => {
    if (inputMode !== 'speak' || showStats || !sentence || transitioning) return

    const runId = ++speakRunId.current
    const expected = sentence.text[targetLang] ?? sentence.text.en ?? ''

    const startAutoListening = () => {
      if (runId !== speakRunId.current) return
      setSpeakStatus('listening')
      setAttempt(null)
      speech.startListening(targetLang, (transcript) => {
        if (runId !== speakRunId.current) return
        const result = scoreAttempt(expected, transcript)
        commitAttempt(sentence, result, true)
      }, {
        onError: (error) => {
          if (runId !== speakRunId.current) return
          if (error === 'not-allowed' || error === 'service-not-allowed') {
            setSpeakStatus('blocked')
            return
          }
          if (error === 'Speech recognition not supported') {
            setSpeakStatus('unsupported')
            return
          }
          if (error === 'no-speech') {
            speakTimer.current = window.setTimeout(startAutoListening, 220)
          }
        },
      })
    }

    const runAutoPrompt = async () => {
      setSpeakStatus('prompting')
      await speech.speak(expected, targetLang)
      if (runId !== speakRunId.current) return
      startAutoListening()
    }

    void runAutoPrompt()

    return () => {
      window.clearTimeout(speakTimer.current)
      speech.stopListening()
      speech.stopSpeaking()
    }
  }, [commitAttempt, inputMode, sentence, showStats, targetLang, transitioning])

  useEffect(() => () => {
    window.clearTimeout(advanceTimer.current)
    window.clearTimeout(speakTimer.current)
    speech.stopSpeaking()
    speech.stopListening()
  }, [])

  if (!sentence) return <div className="flex flex-1 items-center justify-center text-[var(--muted)]">{t(uiLang, 'loading')}</div>

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-hidden lg:h-auto">
      {showStats ? (
        <SentenceStatsPanel
          sentences={sentences}
          stats={sentenceStats}
          targetLang={targetLang}
          nativeLang={nativeLang}
          onPracticeSentence={focusSentence}
          level={level}
          levelLabel={levelLabel}
          lengthFilter={lengthFilter}
          uiLang={uiLang}
        />
      ) : (
        <>
          {/* Card */}
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            <div
              className={`relative flex w-full max-w-md flex-col items-center gap-2.5 rounded-[1.5rem] border border-[var(--line-strong)] px-4 py-4 text-center shadow-[var(--shadow-soft)] select-none touch-none sm:gap-3 sm:rounded-[2rem] sm:px-6 sm:py-8 ${inputMode === 'keyboard' ? 'cursor-grab active:cursor-grabbing' : ''}`}
              style={{
                background: 'var(--card-gradient)',
                transform: inputMode === 'keyboard' ? `translateX(${dragX}px) rotate(${dragX * 0.05}deg)` : 'none',
                transition: transitioning ? 'transform 0.3s ease-out, opacity 0.3s ease-out' : 'none',
                opacity: transitioning ? 0 : 1,
              }}
              onPointerDown={inputMode === 'keyboard' ? onPointerDown : undefined}
              onPointerMove={inputMode === 'keyboard' ? onPointerMove : undefined}
              onPointerUp={inputMode === 'keyboard' ? onPointerUp : undefined}
              onClick={inputMode === 'speak' ? playAudio : undefined}
            >
              <div className="drop-shadow-sm" style={{ fontSize: 'calc(3rem * var(--content-scale))' }}>{sentence.emoji}</div>
              {promptVisible ? (
                <>
                  <button className="display-font leading-snug text-[var(--ink)]" style={{ fontSize: 'calc(1.5rem * var(--content-scale))' }} onClick={playAudio}>{targetText}</button>
                  {getTranslit(targetText, targetLang) && (
                    <div className="italic text-[var(--muted)]" style={{ fontSize: 'calc(1rem * var(--content-scale))' }}>{getTranslit(targetText, targetLang)}</div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-deep)]">
                    {t(uiLang, 'listenFirst')}
                  </div>
                  <div className="text-sm text-[var(--muted)]">{t(uiLang, 'hiddenUntilAnswer')}</div>
                </div>
              )}
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
          {inputMode === 'keyboard' ? (
            <div className="flex items-center justify-center gap-3 py-1">
              <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--glass)] text-[var(--muted)]" onClick={playAudio} disabled={sp.isSpeaking}>
                <Volume2 className="h-5 w-5" strokeWidth={2} />
              </button>
              <button
                className={`flex h-14 w-14 items-center justify-center rounded-full border-2 transition ${sp.isListening ? 'border-[var(--error)] bg-[var(--error)] text-white pulse-ring' : 'border-[var(--accent)] bg-[var(--accent)] text-white'}`}
                onPointerDown={startRecording} onPointerUp={stopRecording} onPointerLeave={stopRecording}
              >
                <Mic className="h-6 w-6" strokeWidth={2.2} />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--glass)] text-[var(--muted)]" onClick={goNext}>
                <ArrowRight className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

