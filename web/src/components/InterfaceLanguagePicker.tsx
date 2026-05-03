import { useState } from 'react'
import { UI_LANGUAGES, type UiLocale } from '../services/i18n.ts'

export function InterfaceLanguagePicker({
  value,
  onChange,
}: {
  value: UiLocale
  onChange: (locale: UiLocale) => void
}) {
  const [open, setOpen] = useState(false)
  const active = UI_LANGUAGES.find((language) => language.code === value) ?? UI_LANGUAGES[0]

  return (
    <div className="relative">
      <button
        className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--glass)] px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink)] shadow-[var(--shadow-card)] hover:bg-[var(--glass-hover)]"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm">{active.flag}</span>
        <span>{active.code.toUpperCase()}</span>
        <svg className={`h-3 w-3 text-[var(--muted)] transition-transform ${open ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 max-h-72 w-44 overflow-y-auto rounded-[1rem] border border-[var(--line-strong)] bg-[var(--panel-strong)] p-1 shadow-[var(--shadow-soft)] backdrop-blur-xl">
            {UI_LANGUAGES.map((language) => {
              const selected = language.code === active.code
              return (
                <button
                  key={language.code}
                  className={`flex w-full items-center gap-2 rounded-[0.75rem] px-3 py-2 text-left text-sm ${
                    selected
                      ? 'bg-[var(--accent-gradient)] font-semibold text-[var(--ink)]'
                      : 'text-[var(--muted)] hover:bg-[var(--glass-hover)] hover:text-[var(--ink)]'
                  }`}
                  onClick={() => {
                    onChange(language.code as UiLocale)
                    setOpen(false)
                  }}
                >
                  <span>{language.flag}</span>
                  <span className="w-7 text-xs font-bold uppercase tracking-[0.12em]">{language.code}</span>
                  <span className="truncate">{language.name}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
