import { WordStatsPanel } from './practice/WordStatsPanel.tsx'
import { DictionarySheet } from './practice/DictionarySheet.tsx'
import { useState, useCallback, useRef, useEffect } from 'react'

import { getFlashCardRound, getCardDisplay, loadLevel, getLoadedWords } from '../services/vocabulary.ts'
import { loadScores, recordAnswer, loadWordStats, recordWordAnswer, pickWeightedCard, type WordStatsMap } from '../services/scores.ts'
import { speech } from '../services/speech.ts'
import { useSpeech } from '../useSpeech.ts'
import { reportCardScore } from '../services/cloud.ts'
import { evaluateVoiceAttempt } from '../services/flashcardsVoice.ts'
import { t } from '../services/i18n.ts'
import type { PracticeInputMode, DictionaryViewPreference } from '../services/settings.ts'
import type { DictionaryLookupResult } from '../services/dictionary.ts'
import type { FlashCard, FlashCardRound, FlashCardScore } from '../types.ts'

type SwipeResult = 'correct' | 'wrong' | null
type VoiceStep = 'repeat' | 'answer'
type SpeakStatus = 'idle' | 'prompting' | 'listening-repeat' | 'listening-answer' | 'blocked' | 'unsupported'
type DictionaryStatus = 'idle' | 'loading' | 'ready' | 'error'

export function FlashcardsTab({
  nativeLang,
  targetLang,
  audioEnabled,
  inputMode,
  dictionaryDefaultView,
  uiLang,
  onInputModeChange: _onInputModeChange,
  level,
  levelLabel,
  listenOnly,
  showStats,
  onShowStatsChange,
}: {
  nativeLang: string
  targetLang: string
  audioEnabled: boolean
  inputMode: PracticeInputMode
  dictionaryDefaultView: DictionaryViewPreference
  uiLang: string
  onInputModeChange: (mode: PracticeInputMode) => void
  level: number
  levelLabel: string
  listenOnly: boolean
  showStats: boolean
  onShowStatsChange: (show: boolean) => void
}) {
  useSpeech()
  const [words, setWords] = useState<FlashCard[]>(getLoadedWords(level))
  const [round, setRound] = useState<FlashCardRound | null>(null)
  const [, setScores] = useState<FlashCardScore>(loadScores)
  const [wordStats, setWordStats] = useState<WordStatsMap>(loadWordStats)
  const [result, setResult] = useState<SwipeResult>(null)
  const [dragX, setDragX] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const startX = useRef(0)
  const dragging = useRef(false)
  const [lastFeedback, setLastFeedback] = useState<{ nativeWord: string; correctAnswer: string } | null>(null)
  const [, setVoiceStep] = useState<VoiceStep>('repeat')
  const [, setVoiceAttempt] = useState<{ heardTarget: string; heardAnswer: string; repeatMatched: boolean } | null>(null)
  const [, setSpeakStatus] = useState<SpeakStatus>('idle')
  const [dictionaryOpen, setDictionaryOpen] = useState(false)
  const [dictionaryStatus, setDictionaryStatus] = useState<DictionaryStatus>('idle')
  const [dictionaryData, setDictionaryData] = useState<DictionaryLookupResult | null>(null)
  const [dictionaryError, setDictionaryError] = useState<string | null>(null)
  const feedbackTimer = useRef<number>(0)
  const speakTimer = useRef<number>(0)
  const speakRunId = useRef(0)
  const heardTargetRef = useRef('')
  const wordStatsRef = useRef(wordStats)
  const dictionaryModuleRef = useRef<Promise<typeof import('../services/dictionary.ts')> | null>(null)

  useEffect(() => {
    wordStatsRef.current = wordStats
  }, [wordStats])

  const resetDictionary = useCallback(() => {
    setDictionaryOpen(false)
    setDictionaryStatus('idle')
    setDictionaryData(null)
    setDictionaryError(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    loadLevel(level).then((w) => {
      if (cancelled) return
      setWords(w)
      const card = pickWeightedCard(w, wordStatsRef.current)
      resetDictionary()
      setVoiceStep('repeat')
      setVoiceAttempt(null)
      heardTargetRef.current = ''
      setSpeakStatus('idle')
      setRound(getFlashCardRound(nativeLang, targetLang, w, undefined, card))
    })
    return () => { cancelled = true }
  }, [level, nativeLang, resetDictionary, targetLang])

  const display = round ? getCardDisplay(round.card, targetLang) : null
  const displayText = display?.text ?? ''
  const correctAnswer = round ? (round.card.translations[nativeLang] ?? round.card.word) : ''

  const openDictionary = useCallback(async () => {
    if (!round || !displayText) return
    setDictionaryOpen(true)
    if (dictionaryStatus === 'ready' || dictionaryStatus === 'loading') return

    setDictionaryStatus('loading')
    setDictionaryError(null)

    try {
      dictionaryModuleRef.current ??= import('../services/dictionary.ts')
      const { lookupCardDictionary } = await dictionaryModuleRef.current
      const result = await lookupCardDictionary({
        englishWord: round.card.word,
        targetWord: displayText,
        targetLang,
      })
      setDictionaryData(result)
      setDictionaryStatus('ready')
    } catch (error) {
      setDictionaryStatus('error')
      setDictionaryError(error instanceof Error ? error.message : 'Dictionary lookup failed.')
    }
  }, [dictionaryStatus, displayText, round, targetLang])

  const handleAnswer = useCallback((side: 'left' | 'right') => {
    if (transitioning || !round || words.length === 0) return
    const correct = side === round.correctSide
    const correctAnswer = round.correctSide === 'left' ? round.leftOption : round.rightOption
    const cardDisplay = getCardDisplay(round.card, targetLang)
    let nextWordStats = wordStatsRef.current
    setResult(correct ? 'correct' : 'wrong')
    setLastFeedback({ nativeWord: cardDisplay.text, correctAnswer })
    setScores((prev) => recordAnswer(prev, correct))
    setWordStats((prev) => {
      nextWordStats = recordWordAnswer(prev, round.card.word, correct)
      return nextWordStats
    })
    void reportCardScore(round.card.word, correct)
    setTransitioning(true)
    setDragX(side === 'left' ? -420 : 420)

    window.setTimeout(() => {
      const nextCard = pickWeightedCard(words, nextWordStats, round.card)
      resetDictionary()
      setVoiceStep('repeat')
      setVoiceAttempt(null)
      heardTargetRef.current = ''
      setSpeakStatus('idle')
      setRound(getFlashCardRound(nativeLang, targetLang, words, round.card, nextCard))
      setDragX(0)
      setTransitioning(false)
    }, 400)

    window.clearTimeout(feedbackTimer.current)
    feedbackTimer.current = window.setTimeout(() => {
      setResult(null)
      setLastFeedback(null)
    }, 3500)
  }, [resetDictionary, round, nativeLang, targetLang, transitioning, words])

  const handleVoiceAnswer = useCallback((heardTarget: string, heardAnswer: string) => {
    if (transitioning || !round || words.length === 0) return

    const evaluation = evaluateVoiceAttempt(displayText, heardTarget, correctAnswer, heardAnswer)
    let nextWordStats = wordStatsRef.current
    setVoiceAttempt({ heardTarget, heardAnswer, repeatMatched: evaluation.repeatMatched })
    setVoiceStep('repeat')
    setResult(evaluation.answerMatched ? 'correct' : 'wrong')
    setLastFeedback({ nativeWord: displayText, correctAnswer })
    setScores((prev) => recordAnswer(prev, evaluation.answerMatched))
    setWordStats((prev) => {
      nextWordStats = recordWordAnswer(prev, round.card.word, evaluation.answerMatched)
      return nextWordStats
    })
    void reportCardScore(round.card.word, evaluation.answerMatched)
    setTransitioning(true)

    window.setTimeout(() => {
      const nextCard = pickWeightedCard(words, nextWordStats, round.card)
      resetDictionary()
      setVoiceStep('repeat')
      setVoiceAttempt(null)
      heardTargetRef.current = ''
      setSpeakStatus('idle')
      setRound(getFlashCardRound(nativeLang, targetLang, words, round.card, nextCard))
      setTransitioning(false)
    }, 700)

    window.clearTimeout(feedbackTimer.current)
    feedbackTimer.current = window.setTimeout(() => {
      setResult(null)
      setLastFeedback(null)
      setVoiceAttempt(null)
    }, 4500)
  }, [correctAnswer, displayText, nativeLang, resetDictionary, round, targetLang, transitioning, words])

  useEffect(() => {
    if (!audioEnabled || transitioning || !displayText) return
    void speech.speak(displayText, targetLang)
  }, [audioEnabled, displayText, targetLang, round?.card.word, transitioning])

  useEffect(() => {
    if (inputMode !== 'keyboard') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (transitioning) return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (target?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (event.key === 'ArrowLeft') { event.preventDefault(); handleAnswer('left') }
      if (event.key === 'ArrowRight') { event.preventDefault(); handleAnswer('right') }
      if (event.key === 'ArrowUp' && round) { event.preventDefault(); void speech.speak(round.leftOption, nativeLang) }
      if (event.key === 'ArrowDown' && round) { event.preventDefault(); void speech.speak(round.rightOption, nativeLang) }
      if ((event.key === 'Enter' || event.key === ' ') && displayText) { event.preventDefault(); void speech.speak(displayText, targetLang) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [displayText, handleAnswer, inputMode, nativeLang, round, targetLang, transitioning])

  useEffect(() => () => { speech.stopSpeaking(); speech.stopListening() }, [])

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


  const focusCard = useCallback((card: FlashCard) => {
    speech.stopListening()
    speech.stopSpeaking()
    window.clearTimeout(feedbackTimer.current)
    resetDictionary()
    setResult(null)
    setLastFeedback(null)
    setVoiceStep('repeat')
    setVoiceAttempt(null)
    heardTargetRef.current = ''
    setSpeakStatus('idle')
    setDragX(0)
    setTransitioning(false)
    setRound(getFlashCardRound(nativeLang, targetLang, words, undefined, card))
    onShowStatsChange(false)
  }, [nativeLang, onShowStatsChange, resetDictionary, targetLang, words])

  useEffect(() => {
    if (inputMode !== 'speak' || showStats || !round || transitioning) return

    const runId = ++speakRunId.current
    const displayText = getCardDisplay(round.card, targetLang).text
    const answerText = round.card.translations[nativeLang] ?? round.card.word

    const handleRecognitionError = (error: string, step: VoiceStep) => {
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
          if (step === 'repeat') {
            startRepeatListening()
          } else {
            startAnswerListening(heardTargetRef.current)
          }
        }, 250)
      }
    }

    const startAnswerListening = (heardTarget: string) => {
      if (runId !== speakRunId.current) return
      setVoiceStep('answer')
      setSpeakStatus('listening-answer')
      speech.startListening(nativeLang, (heardAnswer) => {
        if (runId !== speakRunId.current) return
        handleVoiceAnswer(heardTarget, heardAnswer)
      }, {
        onError: (error) => handleRecognitionError(error, 'answer'),
      })
    }

    const startRepeatListening = () => {
      if (runId !== speakRunId.current) return
      setVoiceStep('repeat')
      setSpeakStatus('listening-repeat')
      speech.startListening(targetLang, (heardTarget) => {
        if (runId !== speakRunId.current) return
        heardTargetRef.current = heardTarget
        const repeatMatched = evaluateVoiceAttempt(displayText, heardTarget, answerText, answerText).repeatMatched
        setVoiceAttempt({ heardTarget, heardAnswer: '', repeatMatched })
        speakTimer.current = window.setTimeout(() => {
          startAnswerListening(heardTarget)
        }, 160)
      }, {
        onError: (error) => handleRecognitionError(error, 'repeat'),
      })
    }

    const runSpeakCycle = async () => {
      setVoiceStep('repeat')
      setVoiceAttempt(null)
      if (audioEnabled) {
        setSpeakStatus('prompting')
        await speech.speak(displayText, targetLang)
        if (runId !== speakRunId.current) return
      }
      startRepeatListening()
    }

    void runSpeakCycle()

    return () => {
      window.clearTimeout(speakTimer.current)
      speech.stopListening()
      speech.stopSpeaking()
    }
  }, [audioEnabled, handleVoiceAnswer, inputMode, nativeLang, round, showStats, targetLang, transitioning])

  if (!round || !display) {
    return <div className="flex flex-1 items-center justify-center text-[var(--muted)]">{t(uiLang, 'loading')}</div>
  }

  const promptVisible = !listenOnly || result !== null

  return (
    <div className="flex h-[calc(100dvh-80px)] flex-col lg:h-auto">
      <section
        className="flex flex-1 flex-col p-2 sm:p-3 lg:p-4"
        style={{ background: 'var(--warm-gradient)' }}
      >
        <div className="flex h-full flex-col gap-2">
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
              {/* Card */}
              <div className="flex flex-1 items-center justify-center overflow-hidden">
                <div
                  className={`relative flex w-full max-w-[24rem] flex-col items-center justify-center gap-2 rounded-[1.25rem] border border-[var(--line-strong)] px-3 py-4 text-center shadow-[var(--shadow-soft)] select-none touch-none sm:gap-3 sm:rounded-[2rem] sm:px-5 sm:py-8 ${
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
                  onClick={inputMode === 'speak' && audioEnabled ? () => { void speech.speak(display.text, targetLang) } : undefined}
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

                  <button className="drop-shadow-sm" style={{ fontSize: `calc(4.5rem * var(--content-scale))` }} onClick={(e) => { e.stopPropagation(); void openDictionary() }}>{display.emoji}</button>
                  {promptVisible ? (
                    <>
                      <div className="display-font leading-none text-[var(--ink)]" style={{ fontSize: `calc(2.25rem * var(--content-scale))` }}>{display.text}</div>
                      {display.translit && <div className="italic text-[var(--muted)]" style={{ fontSize: `calc(1.5rem * var(--content-scale))` }}>{display.translit}</div>}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-deep)]">
                        {t(uiLang, 'listenFirst')}
                      </div>
                      <div className="text-sm text-[var(--muted)]">{t(uiLang, 'hiddenUntilAnswer')}</div>
                    </div>
                  )}
                  {inputMode === 'keyboard' && (
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
                  )}
                  {inputMode === 'speak' && (
                    <div className="mt-2 text-xs text-[var(--muted)]">
                      {listenOnly
                        ? t(uiLang, 'listenAndRepeat')
                        : audioEnabled ? 'Tap the card to hear it again.' : 'Audio is off. Use the speaker toggle above if needed.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback below card */}
              <div className="shrink-0 text-center text-sm font-semibold" style={{ minHeight: '1.5em' }}>
                {result && lastFeedback && (
                  <span style={{ color: result === 'correct' ? 'var(--success)' : 'var(--error)' }}>
                    {lastFeedback.nativeWord} = {lastFeedback.correctAnswer}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {dictionaryOpen && (
        <DictionarySheet
          uiLang={uiLang}
          displayText={display.text}
          translit={display.translit}
          targetLang={targetLang}
          nativeMeaning={correctAnswer}
          nativeLang={nativeLang}
          defaultView={dictionaryDefaultView}
          status={dictionaryStatus}
          data={dictionaryData}
          error={dictionaryError}
          onClose={() => setDictionaryOpen(false)}
        />
      )}

    </div>
  )
}


