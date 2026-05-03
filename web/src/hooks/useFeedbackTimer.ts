import { useState, useCallback, useRef } from 'react'

/**
 * useFeedbackTimer — manages the answer feedback toast that disappears after a delay.
 *
 * Shows "targetWord = correctAnswer" in green/red for `duration` ms.
 */
export function useFeedbackTimer(duration = 3500) {
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const [targetWord, setTargetWord] = useState('')
  const [correctAnswer, setCorrectAnswer] = useState('')
  const timer = useRef<number>(0)

  const showFeedback = useCallback((
    outcome: 'correct' | 'wrong',
    word: string,
    answer: string,
  ) => {
    setResult(outcome)
    setTargetWord(word)
    setCorrectAnswer(answer)

    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setResult(null)
      setTargetWord('')
      setCorrectAnswer('')
    }, duration)
  }, [duration])

  const clearFeedback = useCallback(() => {
    window.clearTimeout(timer.current)
    setResult(null)
  }, [])

  return { result, targetWord, correctAnswer, showFeedback, clearFeedback }
}
