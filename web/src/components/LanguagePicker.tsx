import { useState } from 'react'
import { LANGUAGES, type Language } from '../types.ts'

export function LanguagePicker({ value, onChange, label }: {
  value: string
  onChange: (code: string) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const current = LANGUAGES.find(l => l.code === value)

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-sm"
        onClick={() => setOpen(!open)}
      >
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
        <span>{current?.flag}</span>
        <span className="font-medium">{current?.name}</span>
        <svg className="w-3 h-3 text-[var(--text-muted)]" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl max-h-64 overflow-y-auto min-w-48">
            {LANGUAGES.map((lang: Language) => (
              <button
                key={lang.code}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-hover)] ${
                  lang.code === value ? 'text-[var(--accent)]' : ''
                }`}
                onClick={() => { onChange(lang.code); setOpen(false) }}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
