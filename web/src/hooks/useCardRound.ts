import { useState, useCallback, useRef, useEffect } from 'react'
import { getFlashCardRound, getCardDisplay, loadLevel, getLoadedWords } from '../services/vocabulary.ts'
import { loadScores, recordAnswer, loadWordStats, recordWordAnswer, pickWeightedCard, type WordStatsMap } from '../services/scores.ts'
import { reportCardScore } from '../services/cloud.ts'
import type { FlashCard, FlashCardRound } from '../types.ts'

export type AnswerResult = 'correct' | 'wrong' | null
export interface Feedback { nativeWord: string; correctAnswer: string; correct: boolean }

interface UseCardRoundOptions {
  level: number
  nativeLang: string
  targetLang: string
  onTransitionStart?: (correct: boolean, side: 'left' | 'right') => void
}

export function useCardRound({ level, nativeLang, targetLang, onTransitionStart }: UseCardRoundOptions) {
  const [words, setWords] = useState<FlashCard[]>(getLoadedWords(level))
  const [round, setRound] = useState<FlashCardRound | null>(null)
  const scoresRef = useRef(loadScores())
  const [wordStats, setWordStats] = useState<WordStatsMap>(loadWordStats)
  const [result, setResult] = useState<AnswerResult>(null)
  const [transitioning, setTransitioning] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const feedbackTimer = useRef<number>(0)
  const advanceTimers = useRef<number[]>([])
  const wordStatsRef = useRef(wordStats)

  useEffect(() => { wordStatsRef.current = wordStats }, [wordStats])

  // Load words when level changes
  useEffect(() => {
    let cancelled = false
    loadLevel(level).then((w) => {
      if (cancelled) return
      setWords(w)
      const card = pickWeightedCard(w, wordStatsRef.current)
      setRound(getFlashCardRound(nativeLang, targetLang, w, undefined, card))
      setResult(null)
      setTransitioning(false)
    })
    return () => { cancelled = true }
  }, [level, nativeLang, targetLang])

  // Cleanup all timers on unmount
  useEffect(() => () => {
    advanceTimers.current.forEach(t => window.clearTimeout(t))
    window.clearTimeout(feedbackTimer.current)
  }, [])

  const advanceToNext = useCallback((excludeCard?: FlashCard, statsOverride?: WordStatsMap) => {
    const stats = statsOverride ?? wordStatsRef.current
    const nextCard = pickWeightedCard(words, stats, excludeCard)
    setResult(null)
    setRound(getFlashCardRound(nativeLang, targetLang, words, excludeCard, nextCard))
    setTransitioning(false)
  }, [nativeLang, targetLang, words])

  const answer = useCallback((side: 'left' | 'right') => {
    if (result || transitioning || !round || words.length === 0) return false
    const correct = side === round.correctSide
    const correctAnswer = round.correctSide === 'left' ? round.leftOption : round.rightOption
    const cardDisplay = getCardDisplay(round.card, targetLang)
    let nextWordStats = wordStatsRef.current

    setResult(correct ? 'correct' : 'wrong')
    setFeedback({ nativeWord: cardDisplay.text, correctAnswer, correct })
    scoresRef.current = recordAnswer(scoresRef.current, correct)
    setWordStats((prev) => {
      nextWordStats = recordWordAnswer(prev, round.card.word, correct)
      return nextWordStats
    })
    void reportCardScore(round.card.word, correct)

    onTransitionStart?.(correct, side)

    advanceTimers.current.forEach(t => window.clearTimeout(t))
    advanceTimers.current = []

    if (correct) {
      setTransitioning(true)
      advanceTimers.current.push(window.setTimeout(() => {
        advanceToNext(round.card, nextWordStats)
      }, 400))
    } else {
      advanceTimers.current.push(window.setTimeout(() => setTransitioning(true), 800))
      advanceTimers.current.push(window.setTimeout(() => {
        advanceToNext(round.card, nextWordStats)
      }, 1100))
    }

    window.clearTimeout(feedbackTimer.current)
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 3500)

    return correct
  }, [advanceToNext, onTransitionStart, result, round, targetLang, transitioning, words])

  const focusCard = useCallback((card: FlashCard) => {
    window.clearTimeout(feedbackTimer.current)
    setResult(null)
    setFeedback(null)
    setTransitioning(false)
    setRound(getFlashCardRound(nativeLang, targetLang, words, undefined, card))
  }, [nativeLang, targetLang, words])

  const display = round ? getCardDisplay(round.card, targetLang) : null
  const correctAnswer = round ? (round.card.translations[nativeLang] ?? round.card.word) : ''

  return {
    words,
    round,
    result,
    transitioning,
    feedback,
    wordStats,
    display,
    correctAnswer,
    answer,
    focusCard,
  }
}
