export const SENTENCE_PASS_SCORE = 70

const STATS_KEY = 'freelang-sentence-stats'

export interface SentenceStat {
  attempts: number
  bestScore: number
  lastScore: number
  totalScore: number
  lastSeen: number
  right: number
  wrong: number
}

export type SentenceStatsMap = Record<string, SentenceStat>

function normalizeSentenceStat(input: Partial<SentenceStat> | undefined): SentenceStat {
  return {
    attempts: input?.attempts ?? 0,
    bestScore: input?.bestScore ?? 0,
    lastScore: input?.lastScore ?? 0,
    totalScore: input?.totalScore ?? 0,
    lastSeen: input?.lastSeen ?? 0,
    right: input?.right ?? 0,
    wrong: input?.wrong ?? 0,
  }
}

export function loadSentenceStats(): SentenceStatsMap {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Partial<SentenceStat>>
    return Object.fromEntries(
      Object.entries(parsed).map(([id, stat]) => [id, normalizeSentenceStat(stat)]),
    )
  } catch {
    return {}
  }
}

function saveSentenceStats(stats: SentenceStatsMap) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

export function recordSentenceAttempt(stats: SentenceStatsMap, id: string, score: number): SentenceStatsMap {
  const prev = normalizeSentenceStat(stats[id])
  const correct = score >= SENTENCE_PASS_SCORE
  const next = {
    ...stats,
    [id]: {
      attempts: prev.attempts + 1,
      bestScore: Math.max(prev.bestScore, score),
      lastScore: score,
      totalScore: prev.totalScore + score,
      lastSeen: Date.now(),
      right: prev.right + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1),
    },
  }
  saveSentenceStats(next)
  return next
}
