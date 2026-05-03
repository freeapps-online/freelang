export const CLOZE_PASS_SCORE = 70

const STATS_KEY = 'freelang-cloze-stats'

export interface ClozeStat {
  attempts: number
  bestScore: number
  lastScore: number
  totalScore: number
  lastSeen: number
  right: number
  wrong: number
}

export type ClozeStatsMap = Record<string, ClozeStat>

function normalizeClozeStat(input: Partial<ClozeStat> | undefined): ClozeStat {
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

export function loadClozeStats(): ClozeStatsMap {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Partial<ClozeStat>>
    return Object.fromEntries(
      Object.entries(parsed).map(([id, stat]) => [id, normalizeClozeStat(stat)]),
    )
  } catch {
    return {}
  }
}

function saveClozeStats(stats: ClozeStatsMap) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

export function recordClozeAttempt(stats: ClozeStatsMap, id: string, score: number): ClozeStatsMap {
  const prev = normalizeClozeStat(stats[id])
  const correct = score >= CLOZE_PASS_SCORE
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
  saveClozeStats(next)
  return next
}
