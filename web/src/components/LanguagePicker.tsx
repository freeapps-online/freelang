import { useState } from 'react'
import { LANGUAGES, type Language } from '../types.ts'

export function LanguagePicker({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (code: string) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const current = LANGUAGES.find((lang) => lang.code === value)

  return (
    <div className="relative">
      <button
        className="flex w-full items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-left shadow-[var(--shadow-card)] hover:border-[var(--line-strong)] hover:bg-[var(--glass-hover)]"
        onClick={() => setOpen(!open)}
      >
        <div className="min-w-0">
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <span className="text-base">{current?.flag}</span>
            <span className="truncate">{current?.name}</span>
          </div>
        </div>
        <svg className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${open ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-[1.25rem] border border-[var(--line-strong)] bg-[var(--panel-strong)] p-2 shadow-[var(--shadow-soft)] backdrop-blur-xl">
            {LANGUAGES.map((lang: Language) => {
              const active = lang.code === value
              return (
                <button
                  key={lang.code}
                  className={`flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-sm ${
                    active
                      ? 'text-[var(--ink)]'
                      : 'text-[var(--muted)] hover:bg-[var(--glass-hover)] hover:text-[var(--ink)]'
                  }`}
                  style={active ? { background: 'var(--accent-gradient)' } : undefined}
                  onClick={() => {
                    onChange(lang.code)
                    setOpen(false)
                  }}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span className="flex-1 text-left font-medium">{lang.name}</span>
                  {active && <span className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-deep)]">Active</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
