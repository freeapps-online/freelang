import { useCallback, useEffect, useRef, useState } from 'react'
import { Headphones } from 'lucide-react'
import { loadLevel, getLoadedWords } from '../services/vocabulary.ts'
import { createMissingLetterRound, type MissingLetterRound } from '../services/missingLetters.ts'
import { loadScores, pickWeightedCard, recordAnswer, loadWordStats, recordWordAnswer, type WordStatsMap } from '../services/scores.ts'
import { speech } from '../services/speech.ts'
import { useSpeech } from '../useSpeech.ts'
import { reportCardScore } from '../services/cloud.ts'
import { isSpeechMatch } from '../services/flashcardsVoice.ts'
import { FlashcardModeSwitch } from './FlashcardModeSwitch.tsx'
import { WordStatsPanel } from './FlashcardsTab.tsx'
import { t } from '../services/i18n.ts'
import type { PracticeInputMode } from '../services/settings.ts'
import type { FlashCard, FlashCardScore } from '../types.ts'

type SwipeResult = 'correct' | 'wrong' | null
type SpeakStatus = 'idle' | 'prompting' | 'listening-answer' | 'blocked' | 'unsupported'

function nextMissingLetterRound({
  words,
  targetLang,
  wordStats,
  exclude,
  prePickedCard,
}: {
  words: FlashCard[]
  targetLang: string
  wordStats: WordStatsMap
  exclude?: FlashCard
  prePickedCard?: FlashCard
}) {
  const pickedCard = prePickedCard ?? pickWeightedCard(words, wordStats, exclude)
  return createMissingLetterRound({
    words,
    targetLang,
    exclude,
    prePickedCard: pickedCard,
  })
}

export function MissingLetterTab({
  nativeLang,
  targetLang,
  audioEnabled,
  inputMode,
  uiLang,
  onInputModeChange,
  level,
  levelLabel,
  showStats,
  onShowStatsChange,
}: {
  nativeLang: string
  targetLang: string
  audioEnabled: boolean
  inputMode: PracticeInputMode
  uiLang: string
  onInputModeChange: (mode: PracticeInputMode) => void
  level: number
  levelLabel: string
  showStats: boolean
  onShowStatsChange: (show: boolean) => void
}) {
  const sp = useSpeech()
  const [words, setWords] = useState<FlashCard[]>(getLoadedWords(level))
  const [round, setRound] = useState<MissingLetterRound | null>(null)
  const [scores, setScores] = useState<FlashCardScore>(() => loadScores('spelling'))
  const [wordStats, setWordStats] = useState<WordStatsMap>(loadWordStats)
  const [result, setResult] = useState<SwipeResult>(null)
  const [dragX, setDragX] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [lastFeedback, setLastFeedback] = useState<{ maskedWord: string; correctWord: string; missingLetter: string } | null>(null)
  const [voiceAttempt, setVoiceAttempt] = useState('')
  const [speakStatus, setSpeakStatus] = useState<SpeakStatus>('idle')
  const startX = useRef(0)
  const dragging = useRef(false)
  const feedbackTimer = useRef<number>(0)
  const speakTimer = useRef<number>(0)
  const speakRunId = useRef(0)
  const wordStatsRef = useRef(wordStats)

  useEffect(() => {
    wordStatsRef.current = wordStats
  }, [wordStats])

  useEffect(() => {
    let cancelled = false
    loadLevel(level).then((loadedWords) => {
      if (cancelled) return
      setWords(loadedWords)
      setResult(null)
      setLastFeedback(null)
      setVoiceAttempt('')
      setSpeakStatus('idle')
      setRound(nextMissingLetterRound({
        words: loadedWords,
        targetLang,
        wordStats: wordStatsRef.current,
      }))
    })
    return () => { cancelled = true }
  }, [level, targetLang])

  useEffect(() => {
    if (!audioEnabled || transitioning || !round?.displayText) return
    void speech.speak(round.displayText, targetLang)
  }, [audioEnabled, round?.card.word, round?.displayText, targetLang, transitioning])

  useEffect(() => () => {
    speech.stopSpeaking()
    speech.stopListening()
    window.clearTimeout(feedbackTimer.current)
    window.clearTimeout(speakTimer.current)
  }, [])

  const settleRound = useCallback((correct: boolean) => {
    if (!round || words.length === 0) return
    let nextWordStats = wordStatsRef.current
    setResult(correct ? 'correct' : 'wrong')
    setLastFeedback({
      maskedWord: round.maskedText,
      correctWord: round.displayText,
      missingLetter: round.missingLetter,
    })
    setScores((prev) => recordAnswer(prev, correct, 'spelling'))
    setWordStats((prev) => {
      nextWordStats = recordWordAnswer(prev, round.card.word, correct)
      return nextWordStats
    })
    void reportCardScore(round.card.word, correct)
    setTransitioning(true)

    window.clearTimeout(feedbackTimer.current)
    feedbackTimer.current = window.setTimeout(() => {
      setResult(null)
      setLastFeedback(null)
      setVoiceAttempt('')
    }, 4200)

    window.setTimeout(() => {
      setRound(nextMissingLetterRound({
        words,
        targetLang,
        wordStats: nextWordStats,
        exclude: round.card,
      }))
      setDragX(0)
      setTransitioning(false)
      setSpeakStatus('idle')
    }, correct ? 500 : 700)
  }, [round, targetLang, words])

  const handleAnswer = useCallback((side: 'left' | 'right') => {
    if (!round || transitioning) return
    const correct = side === round.correctSide
    setDragX(side === 'left' ? -420 : 420)
    settleRound(correct)
  }, [round, settleRound, transitioning])

  const handleVoiceAnswer = useCallback((heardAnswer: string) => {
    if (!round || transitioning) return
    setVoiceAttempt(heardAnswer)
    const correct = isSpeechMatch(round.displayText, heardAnswer) || isSpeechMatch(round.missingLetter, heardAnswer)
    settleRound(correct)
  }, [round, settleRound, transitioning])

  useEffect(() => {
    if (inputMode !== 'keyboard') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (transitioning || !round) return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (target?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (event.key === 'ArrowLeft') { event.preventDefault(); handleAnswer('left') }
      if (event.key === 'ArrowRight') { event.preventDefault(); handleAnswer('right') }
      if (event.key === 'ArrowUp') { event.preventDefault(); void speech.speak(round.leftOption, targetLang) }
      if (event.key === 'ArrowDown') { event.preventDefault(); void speech.speak(round.rightOption, targetLang) }
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void speech.speak(round.displayText, targetLang) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleAnswer, inputMode, round, targetLang, transitioning])

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (transitioning || inputMode !== 'keyboard') return
    dragging.current = true
    startX.current = event.clientX
    ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
  }, [inputMode, transitioning])

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    if (!dragging.current) return
    setDragX(event.clientX - startX.current)
  }, [])

  const onPointerUp = useCallback((event: React.PointerEvent) => {
    if (!dragging.current || !round) return
    dragging.current = false
    const moved = Math.abs(event.clientX - startX.current)
    if (dragX < -80) handleAnswer('left')
    else if (dragX > 80) handleAnswer('right')
    else {
      setDragX(0)
      if (moved < 10 && audioEnabled) {
        void speech.speak(round.displayText, targetLang)
      }
    }
  }, [audioEnabled, dragX, handleAnswer, round, targetLang])

  const focusCard = useCallback((card: FlashCard) => {
    speech.stopListening()
    speech.stopSpeaking()
    window.clearTimeout(feedbackTimer.current)
    setResult(null)
    setLastFeedback(null)
    setVoiceAttempt('')
    setSpeakStatus('idle')
    setDragX(0)
    setTransitioning(false)
    setRound(nextMissingLetterRound({
      words,
      targetLang,
      wordStats: wordStatsRef.current,
      prePickedCard: card,
    }))
    onShowStatsChange(false)
  }, [onShowStatsChange, targetLang, words])

  const handleInputModeSwitch = useCallback((mode: PracticeInputMode) => {
    speakRunId.current += 1
    window.clearTimeout(speakTimer.current)
    speech.stopListening()
    speech.stopSpeaking()
    setVoiceAttempt('')
    setSpeakStatus('idle')
    onInputModeChange(mode)
  }, [onInputModeChange])

  useEffect(() => {
    if (inputMode !== 'speak' || showStats || !round || transitioning) return

    const runId = ++speakRunId.current

    const handleRecognitionError = (error: string) => {
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
        speakTimer.current = window.setTimeout(() => {
          if (runId !== speakRunId.current) return
          startAnswerListening()
        }, 250)
      }
    }

    const startAnswerListening = () => {
      if (runId !== speakRunId.current) return
      setSpeakStatus('listening-answer')
      speech.startListening(targetLang, (heardAnswer) => {
        if (runId !== speakRunId.current) return
        handleVoiceAnswer(heardAnswer)
      }, {
        onError: handleRecognitionError,
      })
    }

    const runSpeakCycle = async () => {
      setVoiceAttempt('')
      if (audioEnabled) {
        setSpeakStatus('prompting')
        await speech.speak(round.displayText, targetLang)
        if (runId !== speakRunId.current) return
      }
      startAnswerListening()
    }

    void runSpeakCycle()

    return () => {
      window.clearTimeout(speakTimer.current)
      speech.stopListening()
      speech.stopSpeaking()
    }
  }, [audioEnabled, handleVoiceAnswer, inputMode, round, showStats, targetLang, transitioning])

  if (!round) {
    return <div className="flex flex-1 items-center justify-center text-[var(--muted)]">{t(uiLang, 'loading')}</div>
  }

  const pct = scores.total > 0 ? Math.round((scores.correct / scores.total) * 100) : 0
  const meaning = round.card.translations[nativeLang] ?? round.card.word

  return (
    <div className="flex h-[calc(100dvh-80px)] flex-col lg:h-auto">
      <section className="flex flex-1 flex-col p-2 sm:p-3 lg:p-4" style={{ background: 'var(--warm-gradient)' }}>
        <div className="flex h-full flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="lg:hidden">
              <FlashcardModeSwitch value={inputMode} uiLang={uiLang} onChange={handleInputModeSwitch} />
            </div>
            <div className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]">
              Lv {level} · {levelLabel}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                className="flex h-9 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--glass)] px-3 text-xs font-bold text-[var(--muted)] shadow-[var(--shadow-soft)]"
                onClick={() => { void speech.speak(round.displayText, targetLang) }}
                title={t(uiLang, 'hearWordAgain')}
              >
                <Headphones className="h-4 w-4" strokeWidth={1.8} />
                <span className="hidden sm:inline">{t(uiLang, 'hearWordAgain')}</span>
              </button>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="text-[var(--success)]">{scores.correct}</span>
                <span className="text-[var(--muted)]">/</span>
                <span className="text-[var(--error)]">{scores.total - scores.correct}</span>
              </div>
            </div>
          </div>

          {showStats ? (
            <WordStatsPanel
              words={words}
              wordStats={wordStats}
              targetLang={targetLang}
              nativeLang={nativeLang}
              onPracticeWord={focusCard}
              level={level}
              levelLabel={levelLabel}
            />
          ) : (
            <>
              {inputMode === 'keyboard' ? null : (
                <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm text-[var(--muted)]">
                  {voiceAttempt
                    ? `${t(uiLang, 'answer')}: ${voiceAttempt}`
                    : t(uiLang, 'sayMissingLetterHelp')}
                </div>
              )}

              <div className="flex flex-1 items-center justify-center overflow-hidden">
                <div
                  className={`relative flex w-full max-w-[26rem] flex-col items-center justify-center gap-2 rounded-[1.25rem] border border-[var(--line-strong)] px-3 py-4 text-center shadow-[var(--shadow-soft)] select-none touch-none sm:gap-3 sm:rounded-[2rem] sm:px-5 sm:py-8 ${
                    inputMode === 'keyboard' ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                  style={{
                    background: 'var(--card-gradient)',
                    transform: inputMode === 'keyboard' ? `translateX(${dragX}px) rotate(${dragX * 0.08}deg)` : 'none',
                    transition: transitioning ? 'transform 0.35s ease-out, opacity 0.35s ease-out' : 'none',
                    opacity: transitioning ? 0 : 1,
                  }}
                  onPointerDown={inputMode === 'keyboard' ? onPointerDown : undefined}
                  onPointerMove={inputMode === 'keyboard' ? onPointerMove : undefined}
                  onPointerUp={inputMode === 'keyboard' ? onPointerUp : undefined}
                  onClick={inputMode === 'speak' || audioEnabled ? () => { void speech.speak(round.displayText, targetLang) } : undefined}
                >
                  {inputMode === 'keyboard' && Math.abs(dragX) > 30 && !transitioning && (
                    <div
                      className="absolute top-4 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--paper)] sm:top-5"
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

                  <div className="drop-shadow-sm" style={{ fontSize: `calc(4.5rem * var(--content-scale))` }}>{round.card.emoji}</div>
                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{meaning}</div>
                  <div className="display-font leading-none text-[var(--ink)]" style={{ fontSize: `calc(2.4rem * var(--content-scale))` }}>
                    {round.maskedText}
                  </div>
                  {inputMode === 'keyboard' ? (
                    <div className="mt-1 grid w-full grid-cols-2 gap-2">
                      <button
                        className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-center transition hover:border-[var(--line-strong)] hover:bg-[var(--glass-hover)]"
                        onClick={() => handleAnswer('left')}
                        disabled={transitioning}
                      >
                        <div className="font-semibold text-[var(--ink)]" style={{ fontSize: 'calc(0.875rem * var(--content-scale))' }}>← {round.leftOption}</div>
                      </button>
                      <button
                        className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-center transition hover:border-[var(--line-strong)] hover:bg-[var(--glass-hover)]"
                        onClick={() => handleAnswer('right')}
                        disabled={transitioning}
                      >
                        <div className="font-semibold text-[var(--ink)]" style={{ fontSize: 'calc(0.875rem * var(--content-scale))' }}>{round.rightOption} →</div>
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-[var(--muted)]">
                      {t(uiLang, 'sayMissingLetterHelp')}
                    </div>
                  )}
                  {result && lastFeedback && (
                    <div className="mt-1 w-full rounded-[1rem] border border-[var(--line)] bg-[var(--glass)] px-3 py-2">
                      <div className="text-sm font-semibold" style={{ color: result === 'correct' ? 'var(--success)' : 'var(--error)' }}>
                        {lastFeedback.maskedWord} → {lastFeedback.correctWord}
                      </div>
                      {voiceAttempt && result === 'wrong' && (
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {t(uiLang, 'answer')}: <span className="text-[var(--error)]">{voiceAttempt}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {inputMode === 'speak' && (
                <div className="space-y-2">
                  <div className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-xs text-[var(--muted)]">
                    {sp.isListening
                      ? `Listening: ${sp.transcript || 'speak now...'}`
                      : {
                          prompting: t(uiLang, 'playingWordPrompt'),
                          'listening-answer': t(uiLang, 'sayFullWordOrLetter'),
                          blocked: 'Microphone permission is blocked in this browser.',
                          unsupported: 'Speech recognition is not supported in this browser.',
                          idle: t(uiLang, 'preparingWordPrompt'),
                        }[speakStatus]}
                  </div>
                  <button
                    className="w-full rounded-[1.1rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm font-semibold text-[var(--ink)]"
                    onClick={() => focusCard(round.card)}
                  >
                    {t(uiLang, 'restartSpelling')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

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
        </div>
      )}
    </div>
  )
}
