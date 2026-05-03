import { WordStatsPanel } from './practice/WordStatsPanel.tsx'
import { DictionarySheet } from './practice/DictionarySheet.tsx'
import { useState, useCallback, useRef, useEffect } from 'react'

import { speech } from '../services/speech.ts'
import { useSpeech } from '../useSpeech.ts'
import { evaluateVoiceAttempt } from '../services/flashcardsVoice.ts'
import { t } from '../services/i18n.ts'
import { useSwipeGesture } from '../hooks/useSwipeGesture.ts'
import { useCardRound } from '../hooks/useCardRound.ts'
import { useVoiceCycle } from '../hooks/useVoiceCycle.ts'
import type { PracticeInputMode, DictionaryViewPreference } from '../services/settings.ts'
import type { DictionaryLookupResult } from '../services/dictionary.ts'

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
  speechRate = 0.9,
  correctDelay = 400,
  wrongDelay = 1100,
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
  speechRate?: number
  correctDelay?: number
  wrongDelay?: number
}) {
  useSpeech()

  // --- Card round lifecycle ---
  const {
    words, round, result, transitioning, feedback, wordStats, display, correctAnswer, answer, focusCard,
  } = useCardRound({
    level,
    nativeLang,
    targetLang,
    correctDelay,
    wrongDelay,
    onTransitionStart: (correct, side) => {
      if (correct) swipe.flyOff(side)
      else swipe.resetDrag()
    },
  })

  const displayText = display?.text ?? ''

  // --- Swipe gesture ---
  const swipe = useSwipeGesture({
    disabled: !!result || transitioning || inputMode !== 'keyboard',
    onSwipe: answer,
    onTap: () => { if (audioEnabled && displayText) void speech.speak(displayText, targetLang, speechRate) },
  })

  // Reset card position when new card appears (transitioning ends)
  useEffect(() => {
    if (!transitioning) swipe.resetDrag()
  }, [transitioning, swipe.resetDrag])

  // --- Audio: speak word on new card ---
  useEffect(() => {
    if (!audioEnabled || transitioning || !displayText) return
    void speech.speak(displayText, targetLang, speechRate)
  }, [audioEnabled, displayText, speechRate, targetLang, round?.card.word, transitioning])

  // --- Voice recognition cycle (speak mode) ---
  const handleVoiceAnswer = useCallback((heardTarget: string, heardAnswer: string) => {
    if (transitioning || !round) return
    const evaluation = evaluateVoiceAttempt(displayText, heardTarget, correctAnswer, heardAnswer)
    // Voice answers always use left/right based on correctness for scoring
    answer(evaluation.answerMatched ? round.correctSide : (round.correctSide === 'left' ? 'right' : 'left'))
  }, [answer, correctAnswer, displayText, round, transitioning])

  useVoiceCycle({
    round,
    targetLang,
    nativeLang,
    audioEnabled,
    active: inputMode === 'speak' && !showStats,
    transitioning,
    onAnswer: handleVoiceAnswer,
  })

  // --- Keyboard shortcuts ---
  useEffect(() => {
    if (inputMode !== 'keyboard') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (transitioning || result) return
      const tag = (event.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (event.key === 'ArrowLeft') { event.preventDefault(); answer('left') }
      if (event.key === 'ArrowRight') { event.preventDefault(); answer('right') }
      if (event.key === 'ArrowUp' && round) { event.preventDefault(); void speech.speak(round.leftOption, nativeLang, speechRate) }
      if (event.key === 'ArrowDown' && round) { event.preventDefault(); void speech.speak(round.rightOption, nativeLang, speechRate) }
      if ((event.key === 'Enter' || event.key === ' ') && displayText) { event.preventDefault(); void speech.speak(displayText, targetLang, speechRate) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [answer, displayText, inputMode, nativeLang, result, round, targetLang, transitioning])

  // --- Cleanup ---
  useEffect(() => () => { speech.stopSpeaking(); speech.stopListening() }, [])

  // --- Dictionary ---
  const [dictionaryOpen, setDictionaryOpen] = useState(false)
  const [dictionaryStatus, setDictionaryStatus] = useState<DictionaryStatus>('idle')
  const [dictionaryData, setDictionaryData] = useState<DictionaryLookupResult | null>(null)
  const [dictionaryError, setDictionaryError] = useState<string | null>(null)
  const dictionaryModuleRef = useRef<Promise<typeof import('../services/dictionary.ts')> | null>(null)

  // Reset dictionary on card change
  useEffect(() => {
    setDictionaryOpen(false)
    setDictionaryStatus('idle')
    setDictionaryData(null)
    setDictionaryError(null)
  }, [round?.card.word])

  const openDictionary = useCallback(async () => {
    if (!round || !displayText) return
    setDictionaryOpen(true)
    if (dictionaryStatus === 'ready' || dictionaryStatus === 'loading') return
    setDictionaryStatus('loading')
    setDictionaryError(null)
    try {
      dictionaryModuleRef.current ??= import('../services/dictionary.ts')
      const { lookupCardDictionary } = await dictionaryModuleRef.current
      const data = await lookupCardDictionary({
        englishWord: round.card.word,
        targetWord: displayText,
        targetLang,
      })
      setDictionaryData(data)
      setDictionaryStatus('ready')
    } catch (error) {
      setDictionaryStatus('error')
      setDictionaryError(error instanceof Error ? error.message : 'Dictionary lookup failed.')
    }
  }, [dictionaryStatus, displayText, round, targetLang])

  // --- Focus card from stats ---
  const handleFocusCard = useCallback((card: typeof words[0]) => {
    speech.stopListening()
    speech.stopSpeaking()
    focusCard(card)
    onShowStatsChange(false)
  }, [focusCard, onShowStatsChange])

  // --- Render ---
  if (!round || !display) {
    return <div className="flex flex-1 items-center justify-center text-[var(--muted)]">{t(uiLang, 'loading')}</div>
  }

  const promptVisible = !listenOnly || result !== null

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:h-auto">
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
              onPracticeWord={handleFocusCard}
              level={level}
              levelLabel={levelLabel}
            />
          ) : (
            <>
              {/* Card */}
              <div className="flex flex-1 items-center justify-center overflow-hidden">
                <div
                  className={`relative flex w-full max-w-[24rem] flex-col items-center justify-center gap-2 rounded-[1.25rem] border px-3 py-4 text-center shadow-[var(--shadow-soft)] select-none touch-none transition-colors duration-200 sm:gap-3 sm:rounded-[2rem] sm:px-5 sm:py-8 ${
                    result === 'correct'
                      ? 'border-[var(--success)] bg-[var(--mint-soft)]'
                      : result === 'wrong'
                        ? 'border-[var(--error)] bg-[var(--error)]/10'
                        : 'border-[var(--line-strong)]'
                  } ${inputMode === 'keyboard' && !result ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  style={{
                    background: result ? undefined : 'var(--card-gradient)',
                    transform: inputMode === 'keyboard' ? `translateX(${swipe.dragX}px) rotate(${swipe.dragX * 0.08}deg)` : 'none',
                    transition: transitioning ? 'transform 0.35s ease-out, opacity 0.35s ease-out' : 'none',
                    opacity: transitioning ? 0 : 1,
                  }}
                  onPointerDown={inputMode === 'keyboard' && !result && !transitioning ? swipe.handlers.onPointerDown : undefined}
                  onPointerMove={inputMode === 'keyboard' && !result && !transitioning ? swipe.handlers.onPointerMove : undefined}
                  onPointerUp={inputMode === 'keyboard' && !result && !transitioning ? swipe.handlers.onPointerUp : undefined}
                  onClick={inputMode === 'speak' && audioEnabled ? () => { void speech.speak(display.text, targetLang, speechRate) } : undefined}
                >
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
                  {inputMode === 'speak' && (
                    <div className="mt-2 text-xs text-[var(--muted)]">
                      {listenOnly
                        ? t(uiLang, 'listenAndRepeat')
                        : audioEnabled ? 'Tap the card to hear it again.' : 'Audio is off. Use the speaker toggle above if needed.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Answer buttons — outside card */}
              {inputMode === 'keyboard' && (
                <div className="mx-auto flex w-full max-w-[24rem] shrink-0 gap-3">
                  <button
                    className={`flex flex-1 flex-col items-center justify-center rounded-[1.5rem] border py-3 transition-all duration-200 ${
                      result
                        ? round.correctSide === 'left'
                          ? 'border-[var(--success)] bg-[var(--success)]/15 text-[var(--success)]'
                          : result === 'wrong'
                            ? 'border-[var(--error)] bg-[var(--error)]/10 text-[var(--error)]'
                            : 'border-[var(--line)] bg-[var(--glass)] text-[var(--muted)]'
                        : 'border-[var(--line-strong)] bg-[var(--glass)] text-[var(--ink)] hover:bg-[var(--glass-hover)]'
                    }`}
                    onClick={() => answer('left')}
                    disabled={!!result || transitioning}
                  >
                    <span className="text-[0.6rem] font-bold uppercase tracking-[0.16em] opacity-80">{'\u2190'}</span>
                    <span className="px-2 font-semibold" style={{ fontSize: 'calc(0.875rem * var(--content-scale))' }}>{round.leftOption}</span>
                  </button>
                  <button
                    className={`flex flex-1 flex-col items-center justify-center rounded-[1.5rem] border py-3 transition-all duration-200 ${
                      result
                        ? round.correctSide === 'right'
                          ? 'border-[var(--success)] bg-[var(--success)]/15 text-[var(--success)]'
                          : result === 'wrong'
                            ? 'border-[var(--error)] bg-[var(--error)]/10 text-[var(--error)]'
                            : 'border-[var(--line)] bg-[var(--glass)] text-[var(--muted)]'
                        : 'border-[var(--line-strong)] bg-[var(--glass)] text-[var(--ink)] hover:bg-[var(--glass-hover)]'
                    }`}
                    onClick={() => answer('right')}
                    disabled={!!result || transitioning}
                  >
                    <span className="text-[0.6rem] font-bold uppercase tracking-[0.16em] opacity-80">{'\u2192'}</span>
                    <span className="px-2 font-semibold" style={{ fontSize: 'calc(0.875rem * var(--content-scale))' }}>{round.rightOption}</span>
                  </button>
                </div>
              )}

              {/* Feedback below card */}
              <div className="shrink-0 text-center text-sm font-semibold" style={{ minHeight: '1.5em' }}>
                {feedback && (
                  <span style={{ color: feedback.correct ? 'var(--success)' : 'var(--error)' }}>
                    {feedback.nativeWord} = {feedback.correctAnswer}
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
