import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Layers3, MessageSquare, Mic, Settings2, Volume2, VolumeX } from 'lucide-react'
import { useApplySettings, useSettings } from './hooks.ts'
import { FlashcardsTab } from './components/FlashcardsTab.tsx'
import { SentencesTab } from './components/SpeakTab.tsx'
import { PreferencesTab } from './components/PreferencesTab.tsx'
import { FlashcardModeSwitch } from './components/FlashcardModeSwitch.tsx'
import { InterfaceLanguagePicker } from './components/InterfaceLanguagePicker.tsx'
import { LanguagePicker } from './components/LanguagePicker.tsx'
import { t } from './services/i18n.ts'
import { MAX_PHRASE_LEVEL, MAX_SENTENCE_LEVEL, PHRASE_LEVEL_LABELS } from './services/practiceContent.ts'
import { LEVEL_LABELS, LEVELS } from './services/vocabulary.ts'
import type { Mode } from './types.ts'

const MODES: Mode[] = ['flashcards', 'phrases', 'sentences', 'preferences']

const PATH_TO_MODE: Record<string, Mode> = {
  '/': 'flashcards',
  '/cards': 'flashcards',
  '/phrases': 'phrases',
  '/speak': 'sentences',
  '/sentences': 'sentences',
  '/preferences': 'preferences',
}

const MODE_TO_PATH: Record<Mode, string> = {
  flashcards: '/cards',
  phrases: '/phrases',
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

  const isPracticeMode = mode === 'flashcards' || mode === 'phrases' || mode === 'sentences'
  const isFullscreen = isPracticeMode
  const maxLevel = mode === 'phrases'
    ? MAX_PHRASE_LEVEL
    : mode === 'sentences'
      ? MAX_SENTENCE_LEVEL
      : LEVELS[LEVELS.length - 1]
  const currentLevel = Math.min(settings.cardLevel, maxLevel)
  const levelOptions = mode === 'phrases'
    ? Array.from({ length: MAX_PHRASE_LEVEL }, (_, index) => index + 1)
    : LEVELS.filter((level) => level <= maxLevel)
  const activeInputMode = mode === 'flashcards' ? settings.flashcardInputMode : settings.sentenceInputMode
  const tt = (key: Parameters<typeof t>[1]) => t(settings.interfaceLang, key)
  const statsTitle = mode === 'flashcards' ? tt('wordStats') : mode === 'phrases' ? tt('phraseStats') : tt('sentenceStats')
  const statsReturnLabel = mode === 'flashcards' ? tt('backToCards') : mode === 'phrases' ? tt('backToPhrases') : tt('backToSentences')
  const inputTitle = mode === 'flashcards' ? tt('cardInput') : mode === 'phrases' ? tt('phraseInput') : tt('sentenceInput')

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
                  {{ flashcards: tt('cards'), phrases: tt('phrases'), sentences: tt('sentences'), preferences: tt('preferences') }[item]}
                </button>
              ))}
              {isPracticeMode && (
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

            {isPracticeMode && (
              <div className="mt-auto space-y-3">
                <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--glass-soft)] p-3">
                  <div className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">
                    {inputTitle}
                  </div>
                  <FlashcardModeSwitch
                    value={activeInputMode}
                    uiLang={settings.interfaceLang}
                    onChange={(nextMode) => {
                      if (mode === 'flashcards') update({ flashcardInputMode: nextMode })
                      else update({ sentenceInputMode: nextMode })
                    }}
                  />
                </div>

                <div className="space-y-1 rounded-[1rem] border border-[var(--line)] bg-[var(--glass-soft)] p-3 text-[0.7rem] text-[var(--muted)]">
                  <div className="font-bold uppercase tracking-[0.15em]">
                    {activeInputMode === 'speak' ? tt('speak') : tt('keyboard')}
                  </div>
                  {activeInputMode === 'speak' ? (
                    <>
                      {mode === 'flashcards' ? (
                        <>
                          <div className="flex justify-between"><span>{tt('step1')}</span><span>{tt('repeatWord')}</span></div>
                          <div className="flex justify-between"><span>{tt('step2')}</span><span>{tt('sayMeaning')}</span></div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between"><span>{tt('prompt')}</span><span>{mode === 'phrases' ? tt('hearPhrase') : tt('hearSentence')}</span></div>
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
                          <div className="flex justify-between"><span>{tt('holdMic')}</span><span>{mode === 'phrases' ? tt('recordPhrase') : tt('recordSentence')}</span></div>
                          <div className="flex justify-between"><span>← → / Enter</span><span>{mode === 'phrases' ? tt('nextPhrase') : tt('nextSentence')}</span></div>
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

              {isPracticeMode && (
                <div className="relative ml-auto">
                  <button
                    className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--glass)] px-2 py-1.5 text-xs font-semibold text-[var(--muted)]"
                  onClick={() => setLevelOpen(!levelOpen)}
                >
                  Lv {currentLevel}
                    <ChevronDown className={`h-3 w-3 transition-transform ${levelOpen ? 'rotate-180' : ''}`} strokeWidth={2.2} />
                  </button>
                  {levelOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setLevelOpen(false)} />
                      <div className="absolute right-0 top-full z-50 mt-1 max-h-72 w-48 overflow-y-auto rounded-[1rem] border border-[var(--line-strong)] bg-[var(--panel-strong)] p-1 shadow-[var(--shadow-soft)] backdrop-blur-xl">
                        {levelOptions.map((l) => (
                          <button
                            key={l}
                            className={`flex w-full items-center gap-2 rounded-[0.75rem] px-3 py-2 text-left text-sm ${
                              l === currentLevel
                                ? 'bg-[var(--accent-gradient)] font-semibold text-[var(--ink)]'
                                : 'text-[var(--muted)] hover:bg-[var(--glass-hover)] hover:text-[var(--ink)]'
                            }`}
                            onClick={() => { update({ cardLevel: l }); setLevelOpen(false) }}
                          >
                            <span className="font-bold">{l}</span>
                            <span>{mode === 'phrases' ? PHRASE_LEVEL_LABELS[l] : LEVEL_LABELS[l]}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {isPracticeMode && (
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
                    <Volume2 className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <VolumeX className="h-4 w-4" strokeWidth={2} />
                  )}
                </button>
              )}
            </div>

            {isPracticeMode && (
              <div className="flex justify-center">
                <FlashcardModeSwitch
                  value={activeInputMode}
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
                dictionaryDefaultView={settings.dictionaryDefaultView}
                uiLang={settings.interfaceLang}
                onInputModeChange={(flashcardInputMode) => update({ flashcardInputMode })}
                level={currentLevel}
                showStats={showStats}
                onShowStatsChange={setShowStats}
              />
            )}
            {mode === 'phrases' && (
              <SentencesTab
                contentMode="phrases"
                nativeLang={settings.nativeLang}
                targetLang={settings.targetLang}
                level={currentLevel}
                inputMode={settings.sentenceInputMode}
                uiLang={settings.interfaceLang}
                showStats={showStats}
                onShowStatsChange={setShowStats}
                onInputModeChange={(sentenceInputMode) => update({ sentenceInputMode })}
              />
            )}
            {mode === 'sentences' && (
              <SentencesTab
                contentMode="sentences"
                nativeLang={settings.nativeLang}
                targetLang={settings.targetLang}
                level={currentLevel}
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
        <div className="mx-auto grid max-w-sm grid-cols-4">
          <TabButton icon="flashcards" label={tt('cards')} active={mode === 'flashcards'} onClick={() => { navigate('flashcards'); setShowStats(false) }} />
          <TabButton icon="phrases" label={tt('phrases')} active={mode === 'phrases'} onClick={() => { navigate('phrases'); setShowStats(false) }} />
          <TabButton icon="speak" label={tt('sentences')} active={mode === 'sentences'} onClick={() => { navigate('sentences'); setShowStats(false) }} />
          <TabButton icon="preferences" label={tt('prefs')} active={mode === 'preferences'} onClick={() => { navigate('preferences'); setShowStats(false) }} />
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
      return <Layers3 className="h-5 w-5" strokeWidth={1.7} />
    case 'speak':
      return <Mic className="h-5 w-5" strokeWidth={1.7} />
    case 'phrases':
      return <MessageSquare className="h-5 w-5" strokeWidth={1.7} />
    case 'preferences':
      return <Settings2 className="h-5 w-5" strokeWidth={1.7} />
    default:
      return null
  }
}
