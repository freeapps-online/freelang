import { useState, useCallback, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
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
  const sp = useSpeech()
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
  const [voiceStep, setVoiceStep] = useState<VoiceStep>('repeat')
  const [voiceAttempt, setVoiceAttempt] = useState<{ heardTarget: string; heardAnswer: string; repeatMatched: boolean } | null>(null)
  const [speakStatus, setSpeakStatus] = useState<SpeakStatus>('idle')
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

  const pct = scores.total > 0 ? Math.round((scores.correct / scores.total) * 100) : 0
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
              {inputMode === 'keyboard' ? null : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <VoiceStepCard
                    title={`${t(uiLang, 'step1')}. ${t(uiLang, 'repeatWord')}`}
                    active={voiceStep === 'repeat'}
                    complete={voiceAttempt?.repeatMatched === true}
                    detail={voiceAttempt?.heardTarget ? `Heard: ${voiceAttempt.heardTarget}` : listenOnly ? t(uiLang, 'listenAndRepeat') : `Say ${display.text}`}
                  />
                  <VoiceStepCard
                    title={`${t(uiLang, 'step2')}. ${t(uiLang, 'sayMeaning')}`}
                    active={voiceStep === 'answer'}
                    complete={result === 'correct'}
                    detail={voiceAttempt?.heardAnswer ? `Heard: ${voiceAttempt.heardAnswer}` : `Say ${correctAnswer}`}
                  />
                </div>
              )}

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

              {inputMode === 'speak' && (
                <div className="space-y-2">
                  <div className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-xs text-[var(--muted)]">
                    {sp.isListening
                      ? `Listening: ${sp.transcript || 'speak now...'}` : {
                        prompting: listenOnly ? 'Playing the card. Listen closely, then answer from audio only.' : 'Playing the card. Repeat it, then say the meaning.',
                        'listening-repeat': listenOnly ? 'Step 1: repeat the card from audio only.' : 'Step 1: repeat the card exactly as shown.',
                        'listening-answer': 'Step 2: say the meaning in your native language.',
                        blocked: 'Microphone permission is blocked in this browser.',
                        unsupported: 'Speech recognition is not supported in this browser.',
                        idle: 'Preparing the next card...',
                      }[speakStatus]}
                  </div>
                  <button
                    className="w-full rounded-[1.1rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm font-semibold text-[var(--ink)]"
                    onClick={() => focusCard(round.card)}
                  >
                    {t(uiLang, 'restartCard')}
                  </button>
                </div>
              )}

            </>
          )}

          {/* Feedback below card */}
          {result && lastFeedback && (
            <div className="text-center text-sm font-semibold" style={{ color: result === 'correct' ? 'var(--success)' : 'var(--error)' }}>
              {lastFeedback.nativeWord} = {lastFeedback.correctAnswer}
            </div>
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
        </div>
      )}
    </div>
  )
}

function VoiceStepCard({ title, detail, active, complete }: { title: string; detail: string; active: boolean; complete: boolean }) {
  return (
    <div
      className={`rounded-[1rem] border px-3 py-2.5 ${
        complete
          ? 'border-[var(--success)]/30 bg-[var(--success)]/8'
          : active
            ? 'border-[var(--accent-soft)] bg-[var(--accent-gradient)]'
            : 'border-[var(--line)] bg-[var(--glass)]'
      }`}
    >
      <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">{title}</div>
      <div className="mt-1 text-sm text-[var(--ink)]">{detail}</div>
    </div>
  )
}

function DictionarySheet({
  uiLang,
  displayText,
  translit,
  targetLang,
  nativeMeaning,
  nativeLang,
  defaultView,
  status,
  data,
  error,
  onClose,
}: {
  uiLang: string
  displayText: string
  translit?: string
  targetLang: string
  nativeMeaning: string
  nativeLang: string
  defaultView: DictionaryViewPreference
  status: DictionaryStatus
  data: DictionaryLookupResult | null
  error: string | null
  onClose: () => void
}) {
  const [view, setView] = useState<DictionaryViewPreference>(defaultView)

  const thesaurusItems = data?.entries.flatMap((entry) => [
    ...entry.synonyms,
    ...entry.senses.flatMap((sense) => sense.synonyms),
  ]) ?? []
  const uniqueSynonyms = [...new Set(thesaurusItems)].filter(Boolean).slice(0, 18)
  const formItems = data?.entries.flatMap((entry) => entry.forms) ?? []
  const uniqueForms = [...new Map(
    formItems.map((form) => [`${form.word}:${form.tags.join(',')}`, form]),
  ).values()]
  const translationItems = data?.entries.flatMap((entry) =>
    entry.senses.flatMap((sense) =>
      sense.translations.filter((translation) =>
        translation.languageCode === nativeLang || translation.languageCode === 'en',
      ),
    ),
  ) ?? []
  const uniqueTranslations = [...new Map(
    translationItems.map((translation) => [`${translation.languageCode}:${translation.word}`, translation]),
  ).values()]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-2 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-[1.5rem] border border-[var(--line-strong)] bg-[var(--panel-strong)] shadow-[var(--shadow-soft)] backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="display-font truncate text-2xl text-[var(--ink)]">{displayText}</div>
            {translit && <div className="truncate text-sm italic text-[var(--muted)]">{translit}</div>}
            <div className="mt-1 text-sm text-[var(--muted)]">{nativeMeaning}</div>
          </div>
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--glass)] text-[var(--muted)]"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="max-h-[70dvh] space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--glass)] p-1">
            {([
              ['dictionary', t(uiLang, 'definitionView')],
              ['thesaurus', t(uiLang, 'thesaurusView')],
              ['translation', t(uiLang, 'translationView')],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] ${
                  view === key ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--muted)]'
                }`}
                onClick={() => setView(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {status === 'loading' && (
            <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm text-[var(--muted)]">
              {t(uiLang, 'loadingMeaning')}
            </div>
          )}

          {status === 'error' && (
            <div className="rounded-[1rem] border border-[var(--error)]/20 bg-[var(--error)]/6 px-4 py-3 text-sm text-[var(--error)]">
              {error ?? t(uiLang, 'meaningUnavailable')}
            </div>
          )}

          {status === 'ready' && !data && (
            <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm text-[var(--muted)]">
              {t(uiLang, 'meaningUnavailable')}
            </div>
          )}

          {status === 'ready' && data && data.definitionLanguageCode !== targetLang && (
            <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--panel-quiet)] px-4 py-3 text-sm text-[var(--muted)]">
              <span className="font-semibold text-[var(--ink)]">{t(uiLang, 'definitionLanguage')}:</span>{' '}
              {data.definitionLanguageName}
            </div>
          )}

          {view === 'dictionary' && data?.entries.map((entry, index) => (
            <div key={`${entry.languageCode}-${entry.partOfSpeech}-${index}`} className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--glass)] p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-deep)]">
                  {entry.partOfSpeech || entry.languageName || data.queryWord}
                </span>
                {entry.pronunciation && (
                  <span className="text-sm text-[var(--muted)]">{entry.pronunciation}</span>
                )}
                {entry.languageName && entry.languageCode !== targetLang && (
                  <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    {entry.languageCode}
                  </span>
                )}
              </div>

              {entry.forms.length > 0 && (
                <div className="mt-3">
                  <div className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{t(uiLang, 'wordForms')}</div>
                  <div className="flex flex-wrap gap-2">
                    {entry.forms.map((form) => (
                      <span key={`${form.word}-${form.tags.join('-')}`} className="rounded-full border border-[var(--line)] bg-[var(--panel-quiet)] px-3 py-1.5 text-sm text-[var(--ink)]">
                        {form.word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 space-y-3">
                {entry.senses.map((sense, senseIndex) => (
                  <div key={`${entry.partOfSpeech}-${senseIndex}`} className="space-y-1.5">
                    <div className="text-sm leading-6 text-[var(--ink)]">
                      <span className="mr-2 text-[var(--muted)]">{senseIndex + 1}.</span>
                      {sense.definition}
                    </div>
                    {sense.examples.length > 0 && (
                      <div className="rounded-[0.85rem] bg-[var(--panel-quiet)] px-3 py-2 text-xs text-[var(--muted)]">
                        <span className="mr-2 font-semibold text-[var(--ink)]">{t(uiLang, 'examples')}:</span>
                        {sense.examples.join('  ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {view === 'dictionary' && status === 'ready' && data && data.entries.length === 0 && (
            <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm text-[var(--muted)]">
              {t(uiLang, 'dictionaryEmpty')}
            </div>
          )}

          {view === 'thesaurus' && (
            uniqueSynonyms.length > 0 || uniqueForms.length > 0 ? (
              <div className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--glass)] p-4">
                {uniqueSynonyms.length > 0 && (
                  <>
                    <div className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-deep)]">{t(uiLang, 'synonyms')}</div>
                    <div className="flex flex-wrap gap-2">
                      {uniqueSynonyms.map((synonym) => (
                        <span key={synonym} className="rounded-full border border-[var(--line)] bg-[var(--panel-quiet)] px-3 py-1.5 text-sm text-[var(--ink)]">
                          {synonym}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {uniqueForms.length > 0 && (
                  <div className={uniqueSynonyms.length > 0 ? 'mt-4' : ''}>
                    <div className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-deep)]">{t(uiLang, 'wordForms')}</div>
                    <div className="flex flex-wrap gap-2">
                      {uniqueForms.map((form) => (
                        <span key={`${form.word}-${form.tags.join('-')}`} className="rounded-full border border-[var(--line)] bg-[var(--panel-quiet)] px-3 py-1.5 text-sm text-[var(--ink)]">
                          {form.word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : status === 'ready' && (
              <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm text-[var(--muted)]">
                {t(uiLang, 'thesaurusEmpty')}
              </div>
            )
          )}

          {view === 'translation' && (
            <div className="space-y-3">
              <div className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--glass)] p-4">
                <div className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-deep)]">{t(uiLang, 'translationView')}</div>
                <div className="mt-3 flex items-center justify-between gap-4 rounded-[0.9rem] bg-[var(--panel-quiet)] px-4 py-3">
                  <span className="display-font text-lg text-[var(--ink)]">{displayText}</span>
                  <span className="text-sm font-semibold text-[var(--muted)]">{nativeMeaning}</span>
                </div>
              </div>
              {uniqueTranslations.length > 0 ? (
                <div className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--glass)] p-4">
                  <div className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-deep)]">{t(uiLang, 'otherTranslations')}</div>
                  <div className="space-y-2">
                    {uniqueTranslations.map((translation) => (
                      <div key={`${translation.languageCode}-${translation.word}`} className="flex items-center justify-between gap-3 rounded-[0.85rem] bg-[var(--panel-quiet)] px-3 py-2">
                        <span className="text-sm text-[var(--ink)]">{translation.word}</span>
                        <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                          {translation.languageName || translation.languageCode}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : status === 'ready' && (
                <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm text-[var(--muted)]">
                  {t(uiLang, 'translationEmpty')}
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-[var(--muted)]">
            {t(uiLang, 'dictionarySource')}:{' '}
            {(data?.sources ?? [{ id: 'freedictionaryapi', label: 'FreeDictionaryAPI.com', url: 'https://freedictionaryapi.com/' }]).map((source, index) => (
              <span key={source.id}>
                {index > 0 && ' · '}
                <a className="font-semibold text-[var(--accent)] underline" href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

type SortKey = 'worst' | 'best' | 'most-practiced' | 'least-practiced' | 'unseen'

export function WordStatsPanel({ words, wordStats, targetLang, nativeLang, onPracticeWord, level, levelLabel }: {
  words: FlashCard[]
  wordStats: WordStatsMap
  targetLang: string
  nativeLang: string
  onPracticeWord: (card: FlashCard) => void
  level: number
  levelLabel: string
}) {
  const [sort, setSort] = useState<SortKey>('worst')

  const rows = words.map((w) => {
    const s = wordStats[w.word]
    const correct = s?.correct ?? 0
    const wrong = s?.wrong ?? 0
    const total = correct + wrong
    const pct = total > 0 ? Math.round((correct / total) * 100) : -1
    return {
      key: w.word,
      card: w,
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
      <div className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--glass)] px-3 py-2">
        <div className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Current scope</div>
        <div className="mt-1 text-sm font-semibold text-[var(--ink)]">Level {level}</div>
        <div className="text-xs text-[var(--muted)]">{levelLabel}</div>
      </div>

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
          <button
            key={r.key}
            className="flex items-center gap-3 border-b border-[var(--line)] px-3 py-2 text-left transition hover:bg-[var(--glass-hover)] last:border-b-0"
            onClick={() => onPracticeWord(r.card)}
          >
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
          </button>
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
