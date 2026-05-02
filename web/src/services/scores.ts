import type { FlashCardScore } from '../types.ts'

const STORAGE_KEY = 'lango-flashcard-scores'

export function loadScores(): FlashCardScore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { correct: 0, total: 0, streak: 0, bestStreak: 0 }
}

export function saveScores(scores: FlashCardScore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores))
}

export function recordAnswer(scores: FlashCardScore, correct: boolean): FlashCardScore {
  const streak = correct ? scores.streak + 1 : 0
  const bestStreak = Math.max(scores.bestStreak, streak)
  const next = {
    correct: scores.correct + (correct ? 1 : 0),
    total: scores.total + 1,
    streak,
    bestStreak,
  }
  saveScores(next)
  return next
}
