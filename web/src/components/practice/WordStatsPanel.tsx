import { MiniStat } from './MiniStat.tsx'
import { useState } from 'react'
import type { WordStatsMap } from '../../services/scores.ts'
import type { FlashCard } from '../../types.ts'

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
    return { key: w.word, card: w, word: w.translations[targetLang] ?? w.word, meaning: w.translations[nativeLang] ?? w.word, emoji: w.emoji, correct, wrong, total, pct, lastSeen: s?.lastSeen ?? 0 }
  })

  const seen = rows.filter(r => r.total > 0)
  const unseen = rows.filter(r => r.total === 0)
  const struggling = seen.filter(r => r.pct < 50)
  const mastered = seen.filter(r => r.pct >= 90 && r.total >= 3)
  const learning = seen.filter(r => r.pct >= 50 && r.pct < 90)
  const totalAnswers = rows.reduce((a, r) => a + r.total, 0)
  const totalCorrect = rows.reduce((a, r) => a + r.correct, 0)
  const overallPct = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0

  const sorted = [...rows]
  switch (sort) {
    case 'worst': sorted.sort((a, b) => { if (!a.total) return 1; if (!b.total) return -1; return a.pct - b.pct }); break
    case 'best': sorted.sort((a, b) => { if (!a.total) return 1; if (!b.total) return -1; return b.pct - a.pct }); break
    case 'most-practiced': sorted.sort((a, b) => b.total - a.total); break
    case 'least-practiced': sorted.sort((a, b) => a.total - b.total); break
    case 'unseen': sorted.sort((a, b) => a.total - b.total || a.key.localeCompare(b.key)); break
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

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MiniStat label="Overall" value={`${overallPct}%`} color={overallPct >= 70 ? 'var(--success)' : overallPct >= 40 ? 'var(--warning)' : 'var(--error)'} detail={`${totalCorrect}/${totalAnswers}`} />
        <MiniStat label="Mastered" value={`${mastered.length}`} color="var(--success)" detail="≥90% & 3+ tries" />
        <MiniStat label="Learning" value={`${learning.length}`} color="var(--warning)" detail="50–89%" />
        <MiniStat label="Struggling" value={`${struggling.length}`} color="var(--error)" detail="<50%" />
      </div>

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

      <div className="flex gap-1 overflow-x-auto">
        {sortOptions.map(({ key, label }) => (
          <button key={key} className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${sort === key ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--muted)]'}`} onClick={() => setSort(key)}>{label}</button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[0.75rem] border border-[var(--line)] bg-[var(--glass)]">
        {sorted.map((r) => (
          <button key={r.key} className="flex items-center gap-3 border-b border-[var(--line)] px-3 py-2 text-left transition hover:bg-[var(--glass-hover)] last:border-b-0" onClick={() => onPracticeWord(r.card)}>
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
                  <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.pct >= 70 ? 'var(--success)' : r.pct >= 40 ? 'var(--warning)' : 'var(--error)' }} />
                </div>
                <span className="w-8 text-right text-xs font-semibold" style={{ color: r.pct >= 70 ? 'var(--success)' : r.pct >= 40 ? 'var(--warning)' : 'var(--error)' }}>{r.pct}%</span>
                <span className="w-10 text-right text-[0.65rem] text-[var(--muted)]">{r.correct}/{r.total}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

