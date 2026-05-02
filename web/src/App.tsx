import { useState } from 'react'
import { useSettings } from './hooks.ts'
import { PracticeTab } from './components/PracticeTab.tsx'
import { FlashcardsTab } from './components/FlashcardsTab.tsx'
import { TranslateTab } from './components/TranslateTab.tsx'
import { ConversationTab } from './components/ConversationTab.tsx'
import { LanguagePicker } from './components/LanguagePicker.tsx'
import type { Mode } from './types.ts'

export default function App() {
  const [mode, setMode] = useState<Mode>('practice')
  const { settings, update } = useSettings()

  return (
    <div className="flex flex-col min-h-[100dvh]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <LanguagePicker label="From" value={settings.nativeLang} onChange={(code) => update({ nativeLang: code })} />
          <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <LanguagePicker label="To" value={settings.targetLang} onChange={(code) => update({ targetLang: code })} />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-14">
        <div className="max-w-2xl mx-auto">
          {mode === 'practice' && <PracticeTab nativeLang={settings.nativeLang} targetLang={settings.targetLang} />}
          {mode === 'flashcards' && <FlashcardsTab nativeLang={settings.nativeLang} targetLang={settings.targetLang} />}
          {mode === 'translate' && <TranslateTab nativeLang={settings.nativeLang} targetLang={settings.targetLang} />}
          {mode === 'conversation' && <ConversationTab targetLang={settings.targetLang} />}
        </div>
      </div>

      {/* Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg)]/90 backdrop-blur-xl border-t border-white/[0.04] pb-[env(safe-area-inset-bottom)]">
        <div className="flex max-w-2xl mx-auto">
          <TabButton icon="practice" label="Practice" active={mode === 'practice'} onClick={() => setMode('practice')} />
          <TabButton icon="flashcards" label="Cards" active={mode === 'flashcards'} onClick={() => setMode('flashcards')} />
          <TabButton icon="translate" label="Translate" active={mode === 'translate'} onClick={() => setMode('translate')} />
          <TabButton icon="conversation" label="Converse" active={mode === 'conversation'} onClick={() => setMode('conversation')} />
        </div>
      </nav>
    </div>
  )
}

function TabButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 relative ${active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} onClick={onClick}>
      {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-[var(--accent)]" />}
      <TabIcon name={icon} />
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </button>
  )
}

function TabIcon({ name }: { name: string }) {
  switch (name) {
    case 'practice':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
        </svg>
      )
    case 'flashcards':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          <rect x="5" y="4" width="14" height="8" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="7" y="12" width="14" height="8" rx="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        </svg>
      )
    case 'translate':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495A18.023 18.023 0 0 1 3.413 12.5" />
        </svg>
      )
    case 'conversation':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
      )
    default:
      return null
  }
}
