import { useState } from 'react'
import { useApplySettings, useSettings } from './hooks.ts'
import { PracticeTab } from './components/PracticeTab.tsx'
import { FlashcardsTab } from './components/FlashcardsTab.tsx'
import { TranslateTab } from './components/TranslateTab.tsx'
import { ConversationTab } from './components/ConversationTab.tsx'
import { PreferencesTab } from './components/PreferencesTab.tsx'
import { LanguagePicker } from './components/LanguagePicker.tsx'
import { LANGUAGES, type Mode } from './types.ts'

const MODES: Mode[] = ['practice', 'flashcards', 'translate', 'conversation', 'preferences']

const MODE_META: Record<Mode, {
  label: string
  shortLabel: string
  eyebrow: string
  title: string
  description: string
}> = {
  practice: {
    label: 'Practice Studio',
    shortLabel: 'Practice',
    eyebrow: 'Voice Loop',
    title: 'Say it, hear it, repeat it.',
    description: 'A tight repetition loop for accent training and phrase memory.',
  },
  flashcards: {
    label: 'Card Deck',
    shortLabel: 'Cards',
    eyebrow: 'Quick Recall',
    title: 'Swipe through meaning at speed.',
    description: 'Fast vocabulary reps with momentum, plus keyboard arrows and auto-pronounced cards.',
  },
  translate: {
    label: 'Live Translate',
    shortLabel: 'Translate',
    eyebrow: 'Two-Way Mode',
    title: 'Pass the phone and keep talking.',
    description: 'Dual microphone controls designed for a real conversation across two languages.',
  },
  conversation: {
    label: 'Conversation',
    shortLabel: 'Converse',
    eyebrow: 'Speaking Flow',
    title: 'Stay in the target language longer.',
    description: 'A lighter chat surface that nudges you to keep responding out loud.',
  },
  preferences: {
    label: 'Preferences',
    shortLabel: 'Prefs',
    eyebrow: 'UI Control',
    title: 'Adjust theme, type, motion, and defaults.',
    description: 'A dedicated preferences surface for appearance, reading comfort, and language defaults.',
  },
}

export default function App() {
  const [mode, setMode] = useState<Mode>('practice')
  const { settings, update } = useSettings()
  useApplySettings(settings)

  const native = LANGUAGES.find((lang) => lang.code === settings.nativeLang)
  const target = LANGUAGES.find((lang) => lang.code === settings.targetLang)
  const current = MODE_META[mode]

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-18%] top-[-8%] h-72 w-72 rounded-full bg-[var(--accent-soft)]/35 blur-3xl lg:h-[34rem] lg:w-[34rem]" />
        <div className="absolute right-[-14%] top-[18%] h-72 w-72 rounded-full bg-[var(--sky-soft)]/30 blur-3xl lg:top-[-2%] lg:h-[28rem] lg:w-[28rem]" />
        <div className="absolute bottom-[-10%] left-[10%] h-80 w-80 rounded-full bg-[var(--mint-soft)]/25 blur-3xl lg:left-[45%] lg:h-[26rem] lg:w-[26rem]" />
      </div>

      <div className="relative mx-auto min-h-[100dvh] max-w-[1540px] px-3 pb-24 pt-3 sm:px-4 lg:px-8 lg:py-8">
        <div className="lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-7">
          <aside className="hidden lg:flex lg:min-h-[calc(100dvh-4rem)] lg:flex-col lg:gap-5 lg:rounded-[2rem] lg:border lg:border-[var(--line)] lg:bg-[var(--glass-strong)] lg:p-6 lg:shadow-[var(--shadow-soft)] lg:backdrop-blur-xl">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--glass)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--accent-deep)]">
                <img src="/logo.svg" alt="" className="h-4 w-4 rounded-[0.35rem]" />
                Lango
              </div>
              <div className="space-y-2">
                <h1 className="display-font text-4xl leading-none text-[var(--ink)]">
                  Learn like a voice notebook, not a form.
                </h1>
                <p className="max-w-xs text-sm leading-6 text-[var(--muted)]">
                  Desktop stays studio-like with a persistent mode rail. Mobile stays thumb-first with a dock.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <LanguagePicker label="Native language" value={settings.nativeLang} onChange={(code) => update({ nativeLang: code })} />
              <LanguagePicker label="Target language" value={settings.targetLang} onChange={(code) => update({ targetLang: code })} />
            </div>

            <div className="space-y-2">
              {MODES.map((item) => (
                <ModeRailButton
                  key={item}
                  mode={item}
                  active={mode === item}
                  meta={MODE_META[item]}
                  onClick={() => setMode(item)}
                />
              ))}
            </div>

            <div className="mt-auto grid gap-3">
              <HeroStat label="Current lane" value={current.shortLabel} tint="var(--accent)" />
              <HeroStat
                label="Language pair"
                value={`${native?.flag ?? ''} ${native?.name ?? settings.nativeLang} → ${target?.flag ?? ''} ${target?.name ?? settings.targetLang}`}
                tint="var(--sky)"
              />
              <HeroStat label="Theme" value={settings.theme === 'system' ? 'System' : settings.theme} tint="var(--mint)" />
            </div>
          </aside>

          <main className="min-w-0 space-y-4 lg:space-y-6">
            <section className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--glass-strong)] p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:p-5 lg:rounded-[2rem] lg:p-7">
              <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.45fr)_18rem] lg:items-start">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 lg:hidden">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--glass)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--accent-deep)]">
                        <img src="/logo.svg" alt="" className="h-4 w-4 rounded-[0.35rem]" />
                        Lango
                      </div>
                      <h1 className="display-font mt-3 text-3xl leading-[0.92] text-[var(--ink)]">
                        Voice-first language practice.
                      </h1>
                    </div>
                    <div className="rounded-[1.15rem] border border-[var(--line)] bg-[var(--glass)] px-3 py-2 text-right shadow-[var(--shadow-card)]">
                      <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Now open</div>
                      <div className="mt-1 text-sm font-semibold text-[var(--ink)]">{current.shortLabel}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[var(--accent-deep)]">
                      {current.eyebrow}
                    </div>
                    <h2 className="display-font text-[2rem] leading-[0.95] text-[var(--ink)] sm:text-[2.4rem] lg:text-[3.35rem]">
                      {current.title}
                    </h2>
                    <p className="max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-[0.95rem] lg:text-base">
                      {current.description}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
                    <LanguagePicker label="From" value={settings.nativeLang} onChange={(code) => update({ nativeLang: code })} />
                    <LanguagePicker label="To" value={settings.targetLang} onChange={(code) => update({ targetLang: code })} />
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <QuickChip text="Hold-to-speak controls" tone="accent" />
                    <QuickChip text="Arrow-key flashcards" tone="sky" />
                    <QuickChip text="Theme + font preferences" tone="mint" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <HeroStat label="Native" value={`${native?.flag ?? ''} ${native?.name ?? 'Native'}`} tint="var(--accent)" />
                  <HeroStat label="Target" value={`${target?.flag ?? ''} ${target?.name ?? 'Target'}`} tint="var(--mint)" />
                  <HeroStat label="Font size" value={settings.fontSize.toUpperCase()} tint="var(--sky)" />
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:p-4 lg:rounded-[2rem] lg:p-5">
              <div className="min-h-[34rem] rounded-[1.35rem] bg-[var(--panel-quiet)] p-3 sm:min-h-[36rem] sm:p-4 lg:min-h-0 lg:rounded-[1.6rem] lg:p-5">
                {mode === 'practice' && <PracticeTab nativeLang={settings.nativeLang} targetLang={settings.targetLang} />}
                {mode === 'flashcards' && (
                  <FlashcardsTab
                    nativeLang={settings.nativeLang}
                    targetLang={settings.targetLang}
                    audioEnabled={settings.flashcardAudio}
                    onToggleAudio={() => update({ flashcardAudio: !settings.flashcardAudio })}
                  />
                )}
                {mode === 'translate' && <TranslateTab nativeLang={settings.nativeLang} targetLang={settings.targetLang} />}
                {mode === 'conversation' && <ConversationTab targetLang={settings.targetLang} />}
                {mode === 'preferences' && <PreferencesTab settings={settings} update={update} />}
              </div>
            </section>
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--dock)]/92 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-2xl lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-2 rounded-[1.4rem] border border-[var(--line-strong)] bg-[var(--glass)] p-1.5 shadow-[var(--shadow-soft)]">
          <TabButton icon="practice" label="Practice" active={mode === 'practice'} onClick={() => setMode('practice')} />
          <TabButton icon="flashcards" label="Cards" active={mode === 'flashcards'} onClick={() => setMode('flashcards')} />
          <TabButton icon="translate" label="Translate" active={mode === 'translate'} onClick={() => setMode('translate')} />
          <TabButton icon="conversation" label="Talk" active={mode === 'conversation'} onClick={() => setMode('conversation')} />
          <TabButton icon="preferences" label="Prefs" active={mode === 'preferences'} onClick={() => setMode('preferences')} />
        </div>
      </nav>
    </div>
  )
}

function QuickChip({ text, tone }: { text: string; tone: 'accent' | 'mint' | 'sky' }) {
  const toneMap = {
    accent: 'border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)]/55 text-[var(--accent-deep)]',
    mint: 'border-[color:var(--mint-soft)] bg-[color:var(--mint-soft)]/55 text-[var(--mint-deep)]',
    sky: 'border-[color:var(--sky-soft)] bg-[color:var(--sky-soft)]/55 text-[var(--sky-deep)]',
  } as const

  return (
    <div className={`rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.01em] ${toneMap[tone]}`}>
      {text}
    </div>
  )
}

function HeroStat({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--glass)] p-4 shadow-[var(--shadow-card)]">
      <div className="text-[0.68rem] font-bold uppercase tracking-[0.2em]" style={{ color: tint }}>{label}</div>
      <div className="mt-2 text-sm font-semibold leading-5 text-[var(--ink)]">
        {value}
      </div>
    </div>
  )
}

function ModeRailButton({
  mode,
  active,
  meta,
  onClick,
}: {
  mode: Mode
  active: boolean
  meta: (typeof MODE_META)[Mode]
  onClick: () => void
}) {
  return (
    <button
      className={`group w-full rounded-[1.35rem] border p-4 text-left transition duration-200 ${
        active
          ? 'border-[var(--accent-soft)] bg-[var(--accent-gradient)] shadow-[var(--shadow-card)]'
          : 'border-[var(--line)] bg-[var(--glass-soft)] hover:border-[var(--line-strong)] hover:bg-[var(--glass-hover)]'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
            {meta.eyebrow}
          </div>
          <div className="mt-1 text-base font-semibold text-[var(--ink)]">{meta.label}</div>
        </div>
        <div className={`mt-1 rounded-full px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] ${
          active ? 'bg-[var(--accent)] text-[var(--paper)]' : 'bg-[var(--panel-quiet)] text-[var(--muted)]'
        }`}>
          {mode === 'preferences' ? 'UI' : mode === 'conversation' ? 'AI' : 'Live'}
        </div>
      </div>
      <p className="mt-2 text-sm leading-5 text-[var(--muted)]">{meta.description}</p>
    </button>
  )
}

function TabButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`relative flex flex-col items-center gap-1 rounded-[1rem] px-2 py-2.5 text-center ${
        active
          ? 'bg-[var(--ink)] text-[var(--paper)] shadow-[var(--shadow-card)]'
          : 'text-[var(--muted)]'
      }`}
      onClick={onClick}
    >
      <TabIcon name={icon} />
      <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em]">{label}</span>
    </button>
  )
}

function TabIcon({ name }: { name: string }) {
  switch (name) {
    case 'practice':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
        </svg>
      )
    case 'flashcards':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <rect x="5" y="4" width="14" height="8" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="7" y="12" width="14" height="8" rx="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        </svg>
      )
    case 'translate':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502" />
        </svg>
      )
    case 'conversation':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM6.75 18 3 21V6.75A2.25 2.25 0 0 1 5.25 4.5h13.5A2.25 2.25 0 0 1 21 6.75v8.25a2.25 2.25 0 0 1-2.25 2.25H6.75Z" />
        </svg>
      )
    case 'preferences':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9m-9 12h9M4.5 6h.008v.008H4.5V6Zm0 12h.008v.008H4.5V18Zm0-6h15" />
          <circle cx="8" cy="6" r="2" />
          <circle cx="16" cy="18" r="2" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      )
    default:
      return null
  }
}
