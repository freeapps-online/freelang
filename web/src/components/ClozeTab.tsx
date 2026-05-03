import { SentenceStatsPanel } from './practice/SentenceStatsPanel.tsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2, Mic, ArrowRight } from 'lucide-react'

import { speech } from '../services/speech.ts'
import { useSpeech } from '../useSpeech.ts'
import { t } from '../services/i18n.ts'
import { loadPracticeDeck } from '../services/practiceContent.ts'
import { createClozeRound, type ClozeRound } from '../services/cloze.ts'
import { loadClozeStats, recordClozeAttempt, CLOZE_PASS_SCORE, type ClozeStatsMap } from '../services/clozeStats.ts'
import { isSpeechMatch } from '../services/flashcardsVoice.ts'
import type { PracticeInputMode } from '../services/settings.ts'
import type { Sentence } from '../types.ts'

type SwipeResult = 'correct' | 'wrong' | null
type SpeakStatus = 'idle' | 'prompting' | 'listening-answer' | 'blocked' | 'unsupported'

function pickWeightedSentence(pool: Sentence[], stats: ClozeStatsMap, exclude?: Sentence): Sentence {
  const filtered = exclude ? pool.filter((sentence) => sentence.id !== exclude.id) : pool
  if (filtered.length === 0) return pool[0]
  const now = Date.now()
  const weights = filtered.map((sentence) => {
    const stat = stats[sentence.id]
    if (!stat) return 3
    const avgScore = stat.attempts > 0 ? stat.totalScore / stat.attempts : 50
    const hoursSince = (now - stat.lastSeen) / 3600000
    return 1 + (100 - avgScore) / 25 + Math.min(hoursSince / 24, 2) + (stat.attempts < 2 ? 1 : 0)
  })
  const total = weights.reduce((sum, value) => sum + value, 0)
  let random = Math.random() * total
  for (let index = 0; index < filtered.length; index += 1) {
    random -= weights[index]
    if (random <= 0) return filtered[index]
  }
  return filtered[filtered.length - 1]
}


export function ClozeTab({
  nativeLang,
  targetLang,
  level,
  levelLabel,
  inputMode,
  uiLang,
  showStats: showStatsExternal,
  onShowStatsChange,
  onInputModeChange: _onInputModeChange,
}: {
  nativeLang: string
  targetLang: string
  level: number
  levelLabel: string
  inputMode: PracticeInputMode
  uiLang: string
  showStats: boolean
  onShowStatsChange: (show: boolean) => void
  onInputModeChange: (mode: PracticeInputMode) => void
}) {
  const sp = useSpeech()
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [round, setRound] = useState<ClozeRound | null>(null)
  const [stats, setStats] = useState<ClozeStatsMap>(loadClozeStats)
  const [result, setResult] = useState<SwipeResult>(null)
  const [heardAnswer, setHeardAnswer] = useState('')
  const [dragX, setDragX] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [speakStatus, setSpeakStatus] = useState<SpeakStatus>('idle')
  const showStats = showStatsExternal
  const startXRef = useRef(0)
  const dragging = useRef(false)
  const feedbackTimer = useRef<number>(0)
  const speakTimer = useRef<number>(0)
  const speakRunId = useRef(0)
  const statsRef = useRef(stats)

  useEffect(() => {
    statsRef.current = stats
  }, [stats])

  const selectNextRound = useCallback((exclude?: Sentence, nextStats = statsRef.current, prePickedSentence?: Sentence) => {
    if (sentences.length === 0) return
    const pickedSentence = prePickedSentence ?? pickWeightedSentence(sentences, nextStats, exclude)
    setRound(createClozeRound({
      sentences,
      targetLang,
      exclude,
      prePickedSentence: pickedSentence,
    }))
    setResult(null)
    setHeardAnswer('')
    setDragX(0)
    setTransitioning(false)
    setSpeakStatus('idle')
  }, [sentences, targetLang])

  useEffect(() => {
    let cancelled = false
    loadPracticeDeck(level).then((loadedSentences) => {
      if (cancelled) return
      setSentences(loadedSentences)
      const pickedSentence = pickWeightedSentence(loadedSentences, statsRef.current)
      setRound(createClozeRound({
        sentences: loadedSentences,
        targetLang,
        prePickedSentence: pickedSentence,
      }))
      setResult(null)
      setHeardAnswer('')
      setSpeakStatus('idle')
    })
    return () => { cancelled = true }
  }, [level, targetLang])

  const playAudio = useCallback(() => {
    if (!round) return
    void speech.speak(round.fullText, targetLang)
  }, [round, targetLang])

  const focusSentence = useCallback((sentence: Sentence) => {
    speech.stopListening()
    speech.stopSpeaking()
    window.clearTimeout(feedbackTimer.current)
    selectNextRound(undefined, statsRef.current, sentence)
    onShowStatsChange(false)
  }, [onShowStatsChange, selectNextRound])

  const commitAnswer = useCallback((correct: boolean) => {
    if (!round) return
    const score = correct ? 100 : 0
    let nextStats = statsRef.current
    setResult(correct ? 'correct' : 'wrong')
    setStats((prev) => {
      nextStats = recordClozeAttempt(prev, round.sentence.id, score)
      return nextStats
    })
    setTransitioning(true)

    window.clearTimeout(feedbackTimer.current)
    feedbackTimer.current = window.setTimeout(() => {
      setResult(null)
      setHeardAnswer('')
    }, 4200)

    window.setTimeout(() => {
      selectNextRound(round.sentence, nextStats)
    }, correct ? 700 : 1000)
  }, [round, selectNextRound])

  const handleAnswer = useCallback((side: 'left' | 'right') => {
    if (!round || transitioning) return
    setDragX(side === 'left' ? -320 : 320)
    commitAnswer(side === round.correctSide)
  }, [commitAnswer, round, transitioning])

  useEffect(() => {
    if (inputMode !== 'keyboard') return
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || transitioning || !round) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); handleAnswer('left') }
      if (event.key === 'ArrowRight') { event.preventDefault(); handleAnswer('right') }
      if (event.key === 'ArrowUp') { event.preventDefault(); void speech.speak(round.leftOption, targetLang) }
      if (event.key === 'ArrowDown') { event.preventDefault(); void speech.speak(round.rightOption, targetLang) }
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); playAudio() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleAnswer, inputMode, playAudio, round, targetLang, transitioning])

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (transitioning || inputMode !== 'keyboard') return
    dragging.current = true
    startXRef.current = event.clientX
    ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
  }, [inputMode, transitioning])

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    if (dragging.current) setDragX(event.clientX - startXRef.current)
  }, [])

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    if (dragX < -80) handleAnswer('left')
    else if (dragX > 80) handleAnswer('right')
    else setDragX(0)
  }, [dragX, handleAnswer])

  useEffect(() => {
    if (inputMode !== 'speak' || showStats || !round || transitioning) return
    const runId = ++speakRunId.current

    const startListening = () => {
      if (runId !== speakRunId.current) return
      setSpeakStatus('listening-answer')
      speech.startListening(targetLang, (transcript) => {
        if (runId !== speakRunId.current) return
        setHeardAnswer(transcript)
        commitAnswer(isSpeechMatch(round.missingWord, transcript))
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
            speakTimer.current = window.setTimeout(startListening, 220)
          }
        },
      })
    }

    const runAutoPrompt = async () => {
      setSpeakStatus('prompting')
      await speech.speak(round.fullText, targetLang)
      if (runId !== speakRunId.current) return
      startListening()
    }

    void runAutoPrompt()

    return () => {
      window.clearTimeout(speakTimer.current)
      speech.stopListening()
      speech.stopSpeaking()
    }
  }, [commitAnswer, inputMode, round, showStats, targetLang, transitioning])

  useEffect(() => () => {
    window.clearTimeout(feedbackTimer.current)
    window.clearTimeout(speakTimer.current)
    speech.stopSpeaking()
    speech.stopListening()
  }, [])

  if (!round) return <div className="flex flex-1 items-center justify-center text-[var(--muted)]">{t(uiLang, 'loading')}</div>

  const nativeText = round.sentence.text[nativeLang] ?? round.sentence.text.en ?? ''

  return (
    <div className="flex h-[calc(100dvh-80px-env(safe-area-inset-bottom,0px))] flex-col gap-2 lg:h-auto">
      {showStats ? (
        <SentenceStatsPanel
          sentences={sentences}
          stats={stats}
          targetLang={targetLang}
          nativeLang={nativeLang}
          onPracticeSentence={focusSentence}
          level={level}
          levelLabel={levelLabel}
          uiLang={uiLang}
          passScore={CLOZE_PASS_SCORE}
        />
      ) : (
        <>
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            <div
              className={`relative flex w-full max-w-2xl flex-col items-center gap-2.5 rounded-[1.5rem] border border-[var(--line-strong)] px-4 py-4 text-center shadow-[var(--shadow-soft)] select-none touch-none sm:gap-3 sm:rounded-[2rem] sm:px-6 sm:py-8 ${inputMode === 'keyboard' ? 'cursor-grab active:cursor-grabbing' : ''}`}
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
              <div className="drop-shadow-sm" style={{ fontSize: 'calc(3rem * var(--content-scale))' }}>{round.sentence.emoji}</div>
              <button className="display-font leading-snug text-[var(--ink)]" style={{ fontSize: 'calc(1.5rem * var(--content-scale))' }} onClick={playAudio}>
                {round.maskedText}
              </button>
              <div className="text-sm text-[var(--muted)]">{nativeText}</div>

              {inputMode === 'keyboard' ? (
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <button
                    className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--line-strong)] hover:bg-[var(--glass-hover)]"
                    onClick={() => handleAnswer('left')}
                    disabled={transitioning}
                  >
                    ← {round.leftOption}
                  </button>
                  <button
                    className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--line-strong)] hover:bg-[var(--glass-hover)]"
                    onClick={() => handleAnswer('right')}
                    disabled={transitioning}
                  >
                    {round.rightOption} →
                  </button>
                </div>
              ) : (
                <div className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-xs text-[var(--muted)]">
                  {heardAnswer ? `${t(uiLang, 'answer')}: ${heardAnswer}` : t(uiLang, 'sayMissingWordHelp')}
                </div>
              )}

              {result !== null && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold" style={{ color: result === 'correct' ? 'var(--success)' : 'var(--error)' }}>
                    {round.missingWord}
                  </div>
                  <div className="text-xs text-[var(--muted)]">{round.fullText}</div>
                </div>
              )}
            </div>
          </div>

          {inputMode === 'keyboard' ? (
            <div className="flex items-center justify-center gap-3 py-1">
              <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--glass)] text-[var(--muted)]" onClick={playAudio} disabled={sp.isSpeaking}>
                <Volume2 className="h-5 w-5" strokeWidth={2} />
              </button>
              <button
                className={`flex h-14 w-14 items-center justify-center rounded-full border-2 transition ${sp.isListening ? 'border-[var(--error)] bg-[var(--error)] text-white pulse-ring' : 'border-[var(--accent)] bg-[var(--accent)] text-white'}`}
                onPointerDown={() => {
                  if (inputMode !== 'keyboard') return
                  setHeardAnswer('')
                  speech.startListening(targetLang, (transcript) => {
                    setHeardAnswer(transcript)
                    if (!round) return
                    commitAnswer(isSpeechMatch(round.missingWord, transcript))
                  })
                }}
                onPointerUp={() => speech.stopListening()}
                onPointerLeave={() => speech.stopListening()}
              >
                <Mic className="h-6 w-6" strokeWidth={2.2} />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--glass)] text-[var(--muted)]" onClick={() => selectNextRound(round.sentence)}>
                <ArrowRight className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-xs text-[var(--muted)]">
                {sp.isListening
                  ? `Listening: ${sp.transcript || 'speak now...'}`
                  : {
                      prompting: t(uiLang, 'playingClozePrompt'),
                      'listening-answer': t(uiLang, 'sayMissingWordNow'),
                      blocked: 'Microphone permission is blocked in this browser.',
                      unsupported: 'Speech recognition is not supported in this browser.',
                      idle: t(uiLang, 'preparingClozePrompt'),
                    }[speakStatus]}
              </div>
              <button
                className="w-full rounded-[1.1rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm font-semibold text-[var(--ink)]"
                onClick={() => focusSentence(round.sentence)}
              >
                {t(uiLang, 'restartCloze')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
