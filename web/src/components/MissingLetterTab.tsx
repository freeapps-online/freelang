import { useCallback, useEffect, useRef, useState } from 'react'
import { loadLevel, getLoadedWords } from '../services/vocabulary.ts'
import { createMissingLetterRound, type MissingLetterRound } from '../services/missingLetters.ts'
import { loadScores, pickWeightedCard, recordAnswer, loadWordStats, recordWordAnswer, type WordStatsMap } from '../services/scores.ts'
import { speech } from '../services/speech.ts'
import { useSpeech } from '../useSpeech.ts'
import { reportCardScore } from '../services/cloud.ts'
import { isSpeechMatch } from '../services/flashcardsVoice.ts'

import { PracticeLayout, CardShell, SwipeHint, FeedbackToast, WordStatsPanel } from './practice/index.ts'
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
  onInputModeChange: _onInputModeChange,
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
  useSpeech()
  const [words, setWords] = useState<FlashCard[]>(getLoadedWords(level))
  const [round, setRound] = useState<MissingLetterRound | null>(null)
  const [, setScores] = useState<FlashCardScore>(() => loadScores('spelling'))
  const [wordStats, setWordStats] = useState<WordStatsMap>(loadWordStats)
  const [result, setResult] = useState<SwipeResult>(null)
  const [dragX, setDragX] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [lastFeedback, setLastFeedback] = useState<{ maskedWord: string; correctWord: string; missingLetter: string } | null>(null)
  const [, setVoiceAttempt] = useState('')
  const [, setSpeakStatus] = useState<SpeakStatus>('idle')
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

  const meaning = round.card.translations[nativeLang] ?? round.card.word

  return (
    <PracticeLayout>
      {showStats ? (
        <WordStatsPanel words={words} wordStats={wordStats} targetLang={targetLang} nativeLang={nativeLang} onPracticeWord={focusCard} level={level} levelLabel={levelLabel} />
      ) : (
        <>
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            <CardShell
              dragX={inputMode === 'keyboard' ? dragX : 0}
              transitioning={transitioning}
              swipeable={inputMode === 'keyboard'}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onClick={inputMode === 'speak' || audioEnabled ? () => { void speech.speak(round.displayText, targetLang) } : undefined}
            >
              {inputMode === 'keyboard' && (
                <SwipeHint dragX={dragX} transitioning={transitioning} leftOption={round.leftOption} rightOption={round.rightOption} correctSide={round.correctSide} />
              )}

              <div className="drop-shadow-sm" style={{ fontSize: 'calc(4.5rem * var(--content-scale))' }}>{round.card.emoji}</div>
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{meaning}</div>
              <div className="display-font leading-none text-[var(--ink)]" style={{ fontSize: 'calc(2.4rem * var(--content-scale))' }}>{round.maskedText}</div>

              {inputMode === 'keyboard' && (
                <div className="mt-1 grid w-full grid-cols-2 gap-2">
                  <button className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-center transition hover:border-[var(--line-strong)] hover:bg-[var(--glass-hover)]" onClick={() => handleAnswer('left')} disabled={transitioning}>
                    <div className="font-semibold text-[var(--ink)]" style={{ fontSize: 'calc(0.875rem * var(--content-scale))' }}>← {round.leftOption}</div>
                  </button>
                  <button className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-center transition hover:border-[var(--line-strong)] hover:bg-[var(--glass-hover)]" onClick={() => handleAnswer('right')} disabled={transitioning}>
                    <div className="font-semibold text-[var(--ink)]" style={{ fontSize: 'calc(0.875rem * var(--content-scale))' }}>{round.rightOption} →</div>
                  </button>
                </div>
              )}
            </CardShell>
          </div>

          <FeedbackToast result={result} targetWord={lastFeedback?.maskedWord ?? ''} correctAnswer={lastFeedback?.correctWord ?? ''} />
        </>
      )}
    </PracticeLayout>
  )
}
