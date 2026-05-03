import { Hand, Mic } from 'lucide-react'
import type { PracticeInputMode } from '../services/settings.ts'
import { t } from '../services/i18n.ts'

export function FlashcardModeSwitch({
  value,
  onChange,
  uiLang,
  compact = false,
}: {
  value: PracticeInputMode
  onChange: (mode: PracticeInputMode) => void
  uiLang: string
  compact?: boolean
}) {
  return (
    <div className={`inline-flex rounded-full border border-[var(--line)] bg-[var(--glass)] p-1 ${compact ? '' : 'shadow-[var(--shadow-soft)]'}`}>
      {(['keyboard', 'speak'] as const).map((mode) => (
        <button
          key={mode}
          aria-label={mode === 'keyboard' ? t(uiLang, 'touch') : t(uiLang, mode)}
          className={`flex h-9 w-9 items-center justify-center rounded-full sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] ${
            value === mode ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--muted)]'
          }`}
          onClick={() => onChange(mode)}
          title={mode === 'keyboard' ? t(uiLang, 'touch') : t(uiLang, mode)}
        >
          <span className="sm:hidden" aria-hidden="true">
            {mode === 'keyboard' ? (
              <Hand className="h-4 w-4" strokeWidth={2} />
            ) : (
              <Mic className="h-4 w-4" strokeWidth={2} />
            )}
          </span>
          <span className="hidden sm:inline">{t(uiLang, mode)}</span>
        </button>
      ))}
    </div>
  )
}
