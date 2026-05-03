import type { PracticeInputMode } from '../services/settings.ts'

export function FlashcardModeSwitch({
  value,
  onChange,
  compact = false,
}: {
  value: PracticeInputMode
  onChange: (mode: PracticeInputMode) => void
  compact?: boolean
}) {
  return (
    <div className={`inline-flex rounded-full border border-[var(--line)] bg-[var(--glass)] p-1 ${compact ? '' : 'shadow-[var(--shadow-soft)]'}`}>
      {(['keyboard', 'speak'] as const).map((mode) => (
        <button
          key={mode}
          className={`rounded-full px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] ${
            value === mode ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--muted)]'
          }`}
          onClick={() => onChange(mode)}
        >
          {mode}
        </button>
      ))}
    </div>
  )
}
