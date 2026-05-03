import { useState, useEffect, useCallback } from 'react'
import { useApplySettings, useSettings } from './hooks.ts'
import { FlashcardsTab } from './components/FlashcardsTab.tsx'
import { SentencesTab } from './components/SpeakTab.tsx'
import { PreferencesTab } from './components/PreferencesTab.tsx'
import { FlashcardModeSwitch } from './components/FlashcardModeSwitch.tsx'
import { InterfaceLanguagePicker } from './components/InterfaceLanguagePicker.tsx'
import { LanguagePicker } from './components/LanguagePicker.tsx'
import { t } from './services/i18n.ts'
import { LEVEL_LABELS, LEVELS } from './services/vocabulary.ts'
import type { Mode } from './types.ts'

const MODES: Mode[] = ['flashcards', 'sentences', 'preferences']

const PATH_TO_MODE: Record<string, Mode> = {
  '/': 'flashcards',
  '/cards': 'flashcards',
  '/speak': 'sentences',
  '/sentences': 'sentences',
  '/preferences': 'preferences',
}

const MODE_TO_PATH: Record<Mode, string> = {
  flashcards: '/cards',
  sentences: '/sentences',
  preferences: '/preferences',
}

function getModeFromPath(): Mode {
  return PATH_TO_MODE[window.location.pathname] ?? 'flashcards'
}

export default function App() {
  const [mode, setMode] = useState<Mode>(getModeFromPath)
  const { settings, update } = useSettings()
  useApplySettings(settings)
  const [levelOpen, setLevelOpen] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const navigate = useCallback((m: Mode) => {
    setMode(m)
    window.history.pushState(null, '', MODE_TO_PATH[m])
  }, [])

  useEffect(() => {
    const onPop = () => setMode(getModeFromPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const isFullscreen = mode === 'flashcards' || mode === 'sentences'
  const tt = (key: Parameters<typeof t>[1]) => t(settings.interfaceLang, key)
  const statsTitle = mode === 'flashcards' ? tt('wordStats') : tt('sentenceStats')
  const statsReturnLabel = mode === 'flashcards' ? tt('backToCards') : tt('backToSentences')

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-18%] top-[-8%] h-72 w-72 rounded-full bg-[var(--accent-soft)]/35 blur-3xl lg:h-[34rem] lg:w-[34rem]" />
        <div className="absolute right-[-14%] top-[18%] h-72 w-72 rounded-full bg-[var(--sky-soft)]/30 blur-3xl lg:top-[-2%] lg:h-[28rem] lg:w-[28rem]" />
        <div className="absolute bottom-[-10%] left-[10%] h-80 w-80 rounded-full bg-[var(--mint-soft)]/25 blur-3xl lg:left-[45%] lg:h-[26rem] lg:w-[26rem]" />
      </div>

      <div className="absolute right-2 top-2 z-50 sm:right-4 lg:right-8 lg:top-8">
        <InterfaceLanguagePicker
          value={settings.interfaceLang}
          onChange={(interfaceLang) => update({ interfaceLang })}
        />
      </div>

      <div className={`relative mx-auto max-w-[1540px] px-1 pt-1 sm:px-4 lg:px-8 lg:py-8 ${isFullscreen ? '' : 'min-h-[100dvh] pb-14'}`}>
        <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-7">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex lg:min-h-[calc(100dvh-4rem)] lg:flex-col lg:gap-5 lg:rounded-[2rem] lg:border lg:border-[var(--line)] lg:bg-[var(--glass-strong)] lg:p-6 lg:shadow-[var(--shadow-soft)] lg:backdrop-blur-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--glass)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--accent-deep)]">
              <img src="/logo.svg" alt="" className="h-4 w-4 rounded-[0.35rem]" />
              FreeLanguageApp.online
            </div>

            <div className="grid gap-3">
              <LanguagePicker label={tt('native')} value={settings.nativeLang} onChange={(code) => update({ nativeLang: code })} />
              <LanguagePicker label={tt('target')} value={settings.targetLang} onChange={(code) => update({ targetLang: code })} />
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
                  onClick={() => { navigate(item); setShowStats(false) }}
                >
                  {{ flashcards: tt('cards'), sentences: tt('sentences'), preferences: tt('preferences') }[item]}
                </button>
              ))}
              {isFullscreen && (
                <button
                  className={`w-full rounded-[1rem] px-4 py-3 text-left text-sm font-semibold transition duration-200 ${
                    showStats
                      ? 'border border-[var(--sky-soft)] bg-[var(--cool-gradient)] text-[var(--ink)] shadow-[var(--shadow-card)]'
                      : 'border border-transparent text-[var(--muted)] hover:bg-[var(--glass-hover)] hover:text-[var(--ink)]'
                  }`}
                  onClick={() => setShowStats(!showStats)}
                >
                  {showStats ? statsReturnLabel : statsTitle}
                </button>
              )}
            </nav>

            {(mode === 'flashcards' || mode === 'sentences') && (
              <div className="mt-auto space-y-3">
                <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--glass-soft)] p-3">
                  <div className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">
                    {mode === 'flashcards' ? tt('cardInput') : tt('sentenceInput')}
                  </div>
                  <FlashcardModeSwitch
                    value={mode === 'flashcards' ? settings.flashcardInputMode : settings.sentenceInputMode}
                    uiLang={settings.interfaceLang}
                    onChange={(nextMode) => {
                      if (mode === 'flashcards') update({ flashcardInputMode: nextMode })
                      else update({ sentenceInputMode: nextMode })
                    }}
                  />
                </div>

                <div className="space-y-1 rounded-[1rem] border border-[var(--line)] bg-[var(--glass-soft)] p-3 text-[0.7rem] text-[var(--muted)]">
                  <div className="font-bold uppercase tracking-[0.15em]">
                    {(mode === 'flashcards' ? settings.flashcardInputMode : settings.sentenceInputMode) === 'speak' ? tt('speak') : tt('keyboard')}
                  </div>
                  {(mode === 'flashcards' ? settings.flashcardInputMode : settings.sentenceInputMode) === 'speak' ? (
                    <>
                      {mode === 'flashcards' ? (
                        <>
                          <div className="flex justify-between"><span>{tt('step1')}</span><span>{tt('repeatWord')}</span></div>
                          <div className="flex justify-between"><span>{tt('step2')}</span><span>{tt('sayMeaning')}</span></div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between"><span>{tt('prompt')}</span><span>{tt('hearSentence')}</span></div>
                          <div className="flex justify-between"><span>{tt('answer')}</span><span>{tt('sayItBack')}</span></div>
                        </>
                      )}
                      <div className="flex justify-between"><span>{tt('auto')}</span><span>{tt('listenMoveOn')}</span></div>
                    </>
                  ) : (
                    <>
                      {mode === 'flashcards' ? (
                        <>
                          <div className="flex justify-between"><span>← →</span><span>Choose answer</span></div>
                          <div className="flex justify-between"><span>↑ ↓</span><span>Hear options</span></div>
                          <div className="flex justify-between"><span>Space / Enter</span><span>Replay word</span></div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between"><span>{tt('holdMic')}</span><span>{tt('recordSentence')}</span></div>
                          <div className="flex justify-between"><span>← → / Enter</span><span>{tt('nextSentence')}</span></div>
                          <div className="flex justify-between"><span>{tt('speaker')}</span><span>{tt('replayPrompt')}</span></div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* Mobile header */}
          <header className="mb-2 flex flex-col gap-2 lg:hidden">
            <div className="flex items-center gap-2">
              <LanguagePicker compact label="" value={settings.nativeLang} onChange={(code) => update({ nativeLang: code })} />
              <span className="text-xs text-[var(--muted)]">→</span>
              <LanguagePicker compact label="" value={settings.targetLang} onChange={(code) => update({ targetLang: code })} />

              {(mode === 'flashcards' || mode === 'sentences') && (
                <div className="relative ml-auto">
                  <button
                    className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--glass)] px-2 py-1.5 text-xs font-semibold text-[var(--muted)]"
                    onClick={() => setLevelOpen(!levelOpen)}
                  >
                    Lv {settings.cardLevel}
                    <svg className={`h-3 w-3 transition-transform ${levelOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {levelOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setLevelOpen(false)} />
                      <div className="absolute right-0 top-full z-50 mt-1 max-h-72 w-48 overflow-y-auto rounded-[1rem] border border-[var(--line-strong)] bg-[var(--panel-strong)] p-1 shadow-[var(--shadow-soft)] backdrop-blur-xl">
                        {LEVELS.map((l) => (
                          <button
                            key={l}
                            className={`flex w-full items-center gap-2 rounded-[0.75rem] px-3 py-2 text-left text-sm ${
                              l === settings.cardLevel
                                ? 'bg-[var(--accent-gradient)] font-semibold text-[var(--ink)]'
                                : 'text-[var(--muted)] hover:bg-[var(--glass-hover)] hover:text-[var(--ink)]'
                            }`}
                            onClick={() => { update({ cardLevel: l }); setLevelOpen(false) }}
                          >
                            <span className="font-bold">{l}</span>
                            <span>{LEVEL_LABELS[l]}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {isFullscreen && (
                <button
                  className={`rounded-full px-2 py-1.5 text-xs font-semibold ${showStats ? 'bg-[var(--sky)] text-[var(--paper)]' : 'text-[var(--muted)]'}`}
                  onClick={() => setShowStats(!showStats)}
                >
                  {showStats ? tt('play') : tt('stats')}
                </button>
              )}
              {mode === 'flashcards' && (
                <button
                  className={`flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] ${settings.flashcardAudio ? 'bg-[var(--accent)]/25 text-[var(--accent)]' : 'bg-[var(--glass)] text-[var(--muted)]'}`}
                  onClick={() => update({ flashcardAudio: !settings.flashcardAudio })}
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
            </div>

            {(mode === 'flashcards' || mode === 'sentences') && (
              <div className="flex justify-center">
                <FlashcardModeSwitch
                  value={mode === 'flashcards' ? settings.flashcardInputMode : settings.sentenceInputMode}
                  uiLang={settings.interfaceLang}
                  onChange={(nextMode) => {
                    if (mode === 'flashcards') update({ flashcardInputMode: nextMode })
                    else update({ sentenceInputMode: nextMode })
                  }}
                  compact
                />
              </div>
            )}
          </header>

          {/* Content */}
          <main className="min-w-0">
            {mode === 'flashcards' && (
              <FlashcardsTab
                nativeLang={settings.nativeLang}
                targetLang={settings.targetLang}
                audioEnabled={settings.flashcardAudio}
                inputMode={settings.flashcardInputMode}
                uiLang={settings.interfaceLang}
                onInputModeChange={(flashcardInputMode) => update({ flashcardInputMode })}
                level={settings.cardLevel}
                showStats={showStats}
                onShowStatsChange={setShowStats}
              />
            )}
            {mode === 'sentences' && (
              <SentencesTab
                nativeLang={settings.nativeLang}
                targetLang={settings.targetLang}
                level={settings.cardLevel}
                inputMode={settings.sentenceInputMode}
                uiLang={settings.interfaceLang}
                showStats={showStats}
                onShowStatsChange={setShowStats}
                onInputModeChange={(sentenceInputMode) => update({ sentenceInputMode })}
              />
            )}
            {mode === 'preferences' && (
              <section className="rounded-[1.25rem] bg-[var(--panel-quiet)] p-3 sm:p-4 lg:rounded-[1.5rem] lg:p-5">
                <PreferencesTab settings={settings} update={update} />
              </section>
            )}
          </main>
        </div>
      </div>

      {/* Mobile dock */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--dock)]/92 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 backdrop-blur-2xl lg:hidden">
        <div className="mx-auto grid max-w-xs grid-cols-3">
          <TabButton icon="flashcards" label={tt('cards')} active={mode === 'flashcards'} onClick={() => navigate('flashcards')} />
          <TabButton icon="speak" label={tt('sentences')} active={mode === 'sentences'} onClick={() => navigate('sentences')} />
          <TabButton icon="preferences" label={tt('prefs')} active={mode === 'preferences'} onClick={() => navigate('preferences')} />
        </div>
      </nav>
    </div>
  )
}

function TabButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`relative flex flex-col items-center gap-1 rounded-[1rem] px-2 py-2 text-center ${
        active
          ? 'bg-[var(--ink)] text-[var(--paper)] shadow-[var(--shadow-card)]'
          : 'text-[var(--muted)]'
      }`}
      onClick={onClick}
    >
      <TabIcon name={icon} />
      <span className="text-[0.6rem] font-bold uppercase tracking-[0.14em]">{label}</span>
    </button>
  )
}

function TabIcon({ name }: { name: string }) {
  switch (name) {
    case 'flashcards':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <rect x="5" y="4" width="14" height="8" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="7" y="12" width="14" height="8" rx="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        </svg>
      )
    case 'speak':
      return (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
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
