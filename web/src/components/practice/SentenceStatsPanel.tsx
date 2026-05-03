import { MiniStat } from './MiniStat.tsx'
import { useState } from 'react'
import { t } from '../../services/i18n.ts'
import { SENTENCE_PASS_SCORE as DEFAULT_PASS_SCORE, type SentenceStatsMap } from '../../services/sentenceStats.ts'
import type { SentenceLengthFilter } from '../../services/practiceContent.ts'
import type { Sentence } from '../../types.ts'

export function SentenceStatsPanel({ sentences, stats, targetLang, nativeLang, onPracticeSentence, level, levelLabel, lengthFilter, uiLang, passScore = DEFAULT_PASS_SCORE }: {
  sentences: Sentence[]
  stats: SentenceStatsMap
  targetLang: string
  nativeLang: string
  onPracticeSentence: (sentence: Sentence) => void
  level: number
  levelLabel: string
  lengthFilter?: SentenceLengthFilter
  uiLang: string
  passScore?: number
}) {
  const [sort, setSort] = useState<'worst' | 'best' | 'mostWrong' | 'most' | 'unseen'>('worst')

  const rows = sentences.map(s => {
    const st = stats[s.id]
    const avg = st && st.attempts > 0 ? Math.round(st.totalScore / st.attempts) : -1
    return { id: s.id, sentence: s, text: s.text[targetLang] ?? s.text.en ?? '', meaning: s.text[nativeLang] ?? '', emoji: s.emoji, attempts: st?.attempts ?? 0, bestScore: st?.bestScore ?? 0, avgScore: avg, lastScore: st?.lastScore ?? 0, right: st?.right ?? 0, wrong: st?.wrong ?? 0 }
  })

  const practiced = rows.filter(r => r.attempts > 0)
  const unseen = rows.filter(r => r.attempts === 0)
  const totalAttempts = rows.reduce((a, r) => a + r.attempts, 0)
  const overallAvg = practiced.length > 0 ? Math.round(practiced.reduce((a, r) => a + r.avgScore, 0) / practiced.length) : 0
  const totalRight = rows.reduce((a, r) => a + r.right, 0)
  const totalWrong = rows.reduce((a, r) => a + r.wrong, 0)

  const sorted = [...rows]
  switch (sort) {
    case 'worst': sorted.sort((a, b) => { if (!a.attempts) return 1; if (!b.attempts) return -1; return a.avgScore - b.avgScore }); break
    case 'best': sorted.sort((a, b) => { if (!a.attempts) return 1; if (!b.attempts) return -1; return b.avgScore - a.avgScore }); break
    case 'mostWrong': sorted.sort((a, b) => b.wrong - a.wrong || b.attempts - a.attempts); break
    case 'most': sorted.sort((a, b) => b.attempts - a.attempts); break
    case 'unseen': sorted.sort((a, b) => a.attempts - b.attempts); break
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--glass)] px-3 py-2">
        <div className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Current scope</div>
        <div className="mt-1 text-sm font-semibold text-[var(--ink)]">Level {level}</div>
        <div className="text-xs text-[var(--muted)]">{levelLabel}</div>
        {lengthFilter && (
          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-deep)]">
            {lengthFilter === 'short' ? t(uiLang, 'shortLength') : t(uiLang, 'longLength')}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <MiniStat label="Avg score" value={`${overallAvg}%`} color={overallAvg >= 70 ? 'var(--success)' : 'var(--warning)'} detail={`${totalAttempts} attempts`} />
        <MiniStat label="Practiced" value={`${practiced.length}`} color="var(--success)" detail={`of ${rows.length}`} />
        <MiniStat label="Right" value={`${totalRight}`} color="var(--success)" detail={`>= ${passScore}%`} />
        <MiniStat label="Wrong" value={`${totalWrong}`} color="var(--error)" detail={`under ${passScore}%`} />
        <MiniStat label="Unseen" value={`${unseen.length}`} color="var(--sky)" detail="not tried yet" />
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {([['worst', 'Weakest'], ['best', 'Strongest'], ['mostWrong', 'Most wrong'], ['most', 'Most tried'], ['unseen', 'New']] as const).map(([k, l]) => (
          <button key={k} className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${sort === k ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--muted)]'}`} onClick={() => setSort(k)}>{l}</button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[0.75rem] border border-[var(--line)] bg-[var(--glass)]">
        {sorted.map(r => (
          <button key={r.id} className="flex items-center gap-3 border-b border-[var(--line)] px-3 py-2 text-left transition hover:bg-[var(--glass-hover)] last:border-b-0" onClick={() => onPracticeSentence(r.sentence)}>
            <span>{r.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--ink)]">{r.text}</div>
              <div className="truncate text-xs text-[var(--muted)]">{r.meaning}</div>
            </div>
            {r.attempts === 0 ? (
              <span className="text-xs text-[var(--muted)]">new</span>
            ) : (
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex items-center gap-1.5 text-[0.65rem] font-semibold">
                  <span className="rounded-full bg-[rgba(45,144,119,0.12)] px-2 py-1 text-[var(--success)]">R {r.right}</span>
                  <span className="rounded-full bg-[rgba(199,79,67,0.12)] px-2 py-1 text-[var(--error)]">W {r.wrong}</span>
                </div>
                <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--line)]">
                  <div className="h-full rounded-full" style={{ width: `${r.avgScore}%`, background: r.avgScore >= 70 ? 'var(--success)' : r.avgScore >= 40 ? 'var(--warning)' : 'var(--error)' }} />
                </div>
                <span className="w-8 text-right text-xs font-semibold" style={{ color: r.avgScore >= 70 ? 'var(--success)' : r.avgScore >= 40 ? 'var(--warning)' : 'var(--error)' }}>{r.avgScore}%</span>
                <span className="w-6 text-right text-[0.6rem] text-[var(--muted)]">×{r.attempts}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

