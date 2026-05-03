import type { FlashCardScore } from '../types.ts'

const SCORES_KEY = 'freelang-flashcard-scores'
const SPELLING_SCORES_KEY = 'freelang-spelling-scores'
const WORD_STATS_KEY = 'freelang-word-stats'
type ScoreScope = 'flashcards' | 'spelling'

// --- Session scores (streak, accuracy) ---

function getScoresKey(scope: ScoreScope) {
  return scope === 'spelling' ? SPELLING_SCORES_KEY : SCORES_KEY
}

export function loadScores(scope: ScoreScope = 'flashcards'): FlashCardScore {
  try {
    const raw = localStorage.getItem(getScoresKey(scope))
      ?? (scope === 'flashcards' ? localStorage.getItem('lango-flashcard-scores') : null)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { correct: 0, total: 0, streak: 0, bestStreak: 0 }
}

function saveScores(scores: FlashCardScore, scope: ScoreScope) {
  localStorage.setItem(getScoresKey(scope), JSON.stringify(scores))
}

export function recordAnswer(scores: FlashCardScore, correct: boolean, scope: ScoreScope = 'flashcards'): FlashCardScore {
  const streak = correct ? scores.streak + 1 : 0
  const bestStreak = Math.max(scores.bestStreak, streak)
  const next = {
    correct: scores.correct + (correct ? 1 : 0),
    total: scores.total + 1,
    streak,
    bestStreak,
  }
  saveScores(next, scope)
  return next
}

// --- Per-word stats ---

export interface WordStat {
  correct: number
  wrong: number
  lastSeen: number // timestamp
}

export type WordStatsMap = Record<string, WordStat>

export function loadWordStats(): WordStatsMap {
  try {
    const raw = localStorage.getItem(WORD_STATS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

function saveWordStats(stats: WordStatsMap) {
  localStorage.setItem(WORD_STATS_KEY, JSON.stringify(stats))
}

export function recordWordAnswer(stats: WordStatsMap, word: string, correct: boolean): WordStatsMap {
  const prev = stats[word] ?? { correct: 0, wrong: 0, lastSeen: 0 }
  const next = {
    ...stats,
    [word]: {
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1),
      lastSeen: Date.now(),
    },
  }
  saveWordStats(next)
  return next
}

// --- Smart card selection ---
// Words with more wrong answers and less recently seen get higher weight

export function pickWeightedCard<T extends { word: string }>(
  pool: T[],
  stats: WordStatsMap,
  exclude?: T,
): T {
  const filtered = exclude ? pool.filter(c => c.word !== exclude.word) : pool
  if (filtered.length === 0) return pool[0]

  const now = Date.now()
  const weights = filtered.map((card) => {
    const s = stats[card.word]
    if (!s) return 3 // never seen = high priority

    const total = s.correct + s.wrong
    const errorRate = total > 0 ? s.wrong / total : 0.5
    const hoursSince = (now - s.lastSeen) / (1000 * 60 * 60)
    const timeFactor = Math.min(hoursSince / 24, 2) // caps at 2x after 48h

    // Higher weight for: more errors, longer since last seen, fewer attempts
    return 1 + errorRate * 3 + timeFactor + (total < 3 ? 1 : 0)
  })

  const totalWeight = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * totalWeight
  for (let i = 0; i < filtered.length; i++) {
    r -= weights[i]
    if (r <= 0) return filtered[i]
  }
  return filtered[filtered.length - 1]
}
