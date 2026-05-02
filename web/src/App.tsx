import { useState, useEffect, useCallback } from 'react'
import { useApplySettings, useSettings } from './hooks.ts'
import { PracticeTab } from './components/PracticeTab.tsx'
import { FlashcardsTab } from './components/FlashcardsTab.tsx'
import { TranslateTab } from './components/TranslateTab.tsx'
import { ConversationTab } from './components/ConversationTab.tsx'
import { PreferencesTab } from './components/PreferencesTab.tsx'
import { LanguagePicker } from './components/LanguagePicker.tsx'
import { LANGUAGES, type Mode } from './types.ts'

const MODES: Mode[] = ['practice', 'flashcards', 'translate', 'conversation', 'preferences']

const MODE_LABELS: Record<Mode, string> = {
  practice: 'Practice',
  flashcards: 'Cards',
  translate: 'Translate',
  conversation: 'Conversation',
  preferences: 'Preferences',
}

const PATH_TO_MODE: Record<string, Mode> = {
  '/': 'practice',
  '/practice': 'practice',
  '/cards': 'flashcards',
  '/translate': 'translate',
  '/conversation': 'conversation',
  '/preferences': 'preferences',
}

const MODE_TO_PATH: Record<Mode, string> = {
  practice: '/',
  flashcards: '/cards',
  translate: '/translate',
  conversation: '/conversation',
  preferences: '/preferences',
}

function getModeFromPath(): Mode {
  return PATH_TO_MODE[window.location.pathname] ?? 'practice'
}

export default function App() {
  const [mode, setMode] = useState<Mode>(getModeFromPath)
  const { settings, update } = useSettings()
  useApplySettings(settings)

  const navigate = useCallback((m: Mode) => {
    setMode(m)
    window.history.pushState(null, '', MODE_TO_PATH[m])
  }, [])

  useEffect(() => {
    const onPop = () => setMode(getModeFromPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const native = LANGUAGES.find((lang) => lang.code === settings.nativeLang)
  const target = LANGUAGES.find((lang) => lang.code === settings.targetLang)

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-18%] top-[-8%] h-72 w-72 rounded-full bg-[var(--accent-soft)]/35 blur-3xl lg:h-[34rem] lg:w-[34rem]" />
        <div className="absolute right-[-14%] top-[18%] h-72 w-72 rounded-full bg-[var(--sky-soft)]/30 blur-3xl lg:top-[-2%] lg:h-[28rem] lg:w-[28rem]" />
        <div className="absolute bottom-[-10%] left-[10%] h-80 w-80 rounded-full bg-[var(--mint-soft)]/25 blur-3xl lg:left-[45%] lg:h-[26rem] lg:w-[26rem]" />
      </div>

      <div className={`relative mx-auto max-w-[1540px] px-2 pt-2 sm:px-4 lg:px-8 lg:py-8 ${mode === 'flashcards' ? 'flex min-h-[100dvh] flex-col pb-16' : 'min-h-[100dvh] pb-16'}`}>
        <div className={`${mode === 'flashcards' ? 'flex flex-1 flex-col lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-7' : 'lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-7'}`}>
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex lg:min-h-[calc(100dvh-4rem)] lg:flex-col lg:gap-5 lg:rounded-[2rem] lg:border lg:border-[var(--line)] lg:bg-[var(--glass-strong)] lg:p-6 lg:shadow-[var(--shadow-soft)] lg:backdrop-blur-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--glass)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--accent-deep)]">
              <img src="/logo.svg" alt="" className="h-4 w-4 rounded-[0.35rem]" />
              FreeLanguageApp.online
            </div>

            <div className="grid gap-3">
              <LanguagePicker label="Native" value={settings.nativeLang} onChange={(code) => update({ nativeLang: code })} />
              <LanguagePicker label="Target" value={settings.targetLang} onChange={(code) => update({ targetLang: code })} />
            </div>

            <nav className="space-y-1">
              {MODES.map((item) => (
                <button
                  key={item}
                  className={`w-full rounded-[1rem] px-4 py-3 text-left text-sm font-semibold transition duration-200 ${
                    mode === item
                      ? 'border border-[var(--accent-soft)] bg-[var(--accent-gradient)] text-[var(--ink)] shadow-[var(--shadow-card)]'
                      : 'border border-transparent text-[var(--muted)] hover:bg-[var(--glass-hover)] hover:text-[var(--ink)]'
                  }`}
                  onClick={() => navigate(item)}
                >
                  {MODE_LABELS[item]}
                </button>
              ))}
            </nav>

            <div className="mt-auto text-xs text-[var(--muted)]">
              {native?.flag} {native?.name} → {target?.flag} {target?.name}
            </div>
          </aside>

          {/* Mobile header */}
          <header className="mb-2 flex items-center justify-end gap-2 lg:hidden">
            <div className="flex items-center gap-2">
              {mode === 'flashcards' && (
                <button
                  className={`flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] ${settings.flashcardAudio ? 'bg-[var(--accent)]/25 text-[var(--accent)]' : 'bg-[var(--glass)] text-[var(--muted)]'}`}
                  onClick={() => update({ flashcardAudio: !settings.flashcardAudio })}
                  aria-label={settings.flashcardAudio ? 'Mute' : 'Unmute'}
                >
                  {settings.flashcardAudio ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.531V19.94a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                    </svg>
                  )}
                </button>
              )}
              <LanguagePicker label="" value={settings.nativeLang} onChange={(code) => update({ nativeLang: code })} />
              <span className="text-xs text-[var(--muted)]">→</span>
              <LanguagePicker label="" value={settings.targetLang} onChange={(code) => update({ targetLang: code })} />
            </div>
          </header>

          {/* Content */}
          <main className={`min-w-0 ${mode === 'flashcards' ? 'flex flex-1 flex-col lg:block' : ''}`}>
            <section className={`rounded-[1.25rem] bg-[var(--panel-quiet)] backdrop-blur-xl lg:rounded-[2rem] lg:border lg:border-[var(--line)] lg:bg-[var(--panel)] lg:p-5 lg:shadow-[var(--shadow-soft)] ${mode === 'flashcards' ? 'flex flex-1 flex-col p-2 sm:p-3' : 'p-3 sm:p-4'}`}>
              <div className={`lg:rounded-[1.6rem] lg:bg-[var(--panel-quiet)] lg:p-5 ${mode === 'flashcards' ? 'flex flex-1 flex-col' : 'min-h-[34rem] sm:min-h-[36rem] lg:min-h-0'}`}>
                {mode === 'practice' && <PracticeTab nativeLang={settings.nativeLang} targetLang={settings.targetLang} />}
                {mode === 'flashcards' && (
                  <FlashcardsTab
                    nativeLang={settings.nativeLang}
                    targetLang={settings.targetLang}
                    audioEnabled={settings.flashcardAudio}
                    level={settings.cardLevel}
                    onLevelChange={(cardLevel) => update({ cardLevel })}
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

      {/* Mobile dock */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--dock)]/92 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 backdrop-blur-2xl lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5">
          <TabButton icon="practice" label="Practice" active={mode === 'practice'} onClick={() => navigate('practice')} />
          <TabButton icon="flashcards" label="Cards" active={mode === 'flashcards'} onClick={() => navigate('flashcards')} />
          <TabButton icon="translate" label="Translate" active={mode === 'translate'} onClick={() => navigate('translate')} />
          <TabButton icon="conversation" label="Talk" active={mode === 'conversation'} onClick={() => navigate('conversation')} />
          <TabButton icon="preferences" label="Prefs" active={mode === 'preferences'} onClick={() => navigate('preferences')} />
        </div>
      </nav>
    </div>
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
