import { Suspense, lazy, startTransition, useState, useEffect, useCallback } from 'react'
import { ChevronDown, Headphones, Layers3, MessageSquare, Mic, Settings2, Type, Volume2, VolumeX } from 'lucide-react'
import { useApplySettings, useSettings } from './hooks.ts'
import { FlashcardModeSwitch } from './components/FlashcardModeSwitch.tsx'
import { InterfaceLanguagePicker } from './components/InterfaceLanguagePicker.tsx'
import { LanguagePicker } from './components/LanguagePicker.tsx'
import { t } from './services/i18n.ts'
import { LEVEL_LABELS, LEVELS } from './services/levelMetadata.ts'
import { loadScores } from './services/scores.ts'
import { MAX_SENTENCE_LEVEL, type SentenceLengthFilter } from './services/practiceContent.ts'
import type { Mode } from './types.ts'

const MODES: Mode[] = ['flashcards', 'spelling', 'cloze', 'sentences', 'preferences']

const loadFlashcardsTab = () => import('./components/FlashcardsTab.tsx')
const loadMissingLetterTab = () => import('./components/MissingLetterTab.tsx')
const loadClozeTab = () => import('./components/ClozeTab.tsx')
const loadSentencesTab = () => import('./components/SpeakTab.tsx')
const loadPreferencesTab = () => import('./components/PreferencesTab.tsx')

const FlashcardsTab = lazy(async () => ({ default: (await loadFlashcardsTab()).FlashcardsTab }))
const MissingLetterTab = lazy(async () => ({ default: (await loadMissingLetterTab()).MissingLetterTab }))
const ClozeTab = lazy(async () => ({ default: (await loadClozeTab()).ClozeTab }))
const SentencesTab = lazy(async () => ({ default: (await loadSentencesTab()).SentencesTab }))
const PreferencesTab = lazy(async () => ({ default: (await loadPreferencesTab()).PreferencesTab }))

const PATH_TO_MODE: Record<string, Mode> = {
  '/': 'flashcards',
  '/cards': 'flashcards',
  '/spelling': 'spelling',
  '/missing-letters': 'spelling',
  '/cloze': 'cloze',
  '/phrases': 'sentences',
  '/speak': 'sentences',
  '/sentences': 'sentences',
  '/preferences': 'preferences',
}

const MODE_TO_PATH: Record<Mode, string> = {
  flashcards: '/cards',
  spelling: '/spelling',
  cloze: '/cloze',
  sentences: '/sentences',
  preferences: '/preferences',
}

function getModeFromPath(): Mode {
  return PATH_TO_MODE[window.location.pathname] ?? 'flashcards'
}

function getSentenceLengthFilterFromLocation(): SentenceLengthFilter {
  const params = new URLSearchParams(window.location.search)
  if (params.get('length') === 'short') return 'short'
  if (window.location.pathname === '/phrases') return 'short'
  return 'long'
}

function getPathForMode(mode: Mode, sentenceLengthFilter: SentenceLengthFilter) {
  if (mode !== 'sentences') return MODE_TO_PATH[mode]
  return sentenceLengthFilter === 'short' ? '/sentences?length=short' : '/sentences'
}

function preloadMode(mode: Mode) {
  switch (mode) {
    case 'flashcards':
      void loadFlashcardsTab()
      return
    case 'spelling':
      void loadMissingLetterTab()
      return
    case 'cloze':
      void loadClozeTab()
      return
    case 'sentences':
      void loadSentencesTab()
      return
    case 'preferences':
      void loadPreferencesTab()
  }
}

export default function App() {
  const [mode, setMode] = useState<Mode>(getModeFromPath)
  const [sentenceLengthFilter, setSentenceLengthFilter] = useState<SentenceLengthFilter>(getSentenceLengthFilterFromLocation)
  const { settings, update } = useSettings()
  useApplySettings(settings)
  const [levelOpen, setLevelOpen] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [listenOnly, setListenOnly] = useState(() => {
    try { return localStorage.getItem('freelang-listen-only') === '1' } catch { return false }
  })
  // Live score counter — refreshes from localStorage
  const getScoreScope = () => mode === 'spelling' ? 'spelling' as const : 'flashcards' as const
  const [liveScores, setLiveScores] = useState(() => loadScores(getScoreScope()))
  useEffect(() => {
    const t = setInterval(() => setLiveScores(loadScores(getScoreScope())), 500)
    return () => clearInterval(t)
  })

  const toggleListenOnly = useCallback(() => {
    setListenOnly(prev => {
      const next = !prev
      localStorage.setItem('freelang-listen-only', next ? '1' : '0')
      return next
    })
  }, [])

  const navigate = useCallback((m: Mode) => {
    startTransition(() => setMode(m))
    window.history.pushState(null, '', getPathForMode(m, sentenceLengthFilter))
  }, [sentenceLengthFilter])

  const handleSentenceLengthFilterChange = useCallback((nextFilter: SentenceLengthFilter) => {
    setSentenceLengthFilter(nextFilter)
    if (mode === 'sentences') {
      window.history.replaceState(null, '', getPathForMode('sentences', nextFilter))
    }
  }, [mode])

  useEffect(() => {
    const onPop = () => {
      startTransition(() => setMode(getModeFromPath()))
      setSentenceLengthFilter(getSentenceLengthFilterFromLocation())
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const isWordPracticeMode = mode === 'flashcards' || mode === 'spelling'
  const isSentencePracticeMode = mode === 'cloze' || mode === 'sentences'
  const isPracticeMode = isWordPracticeMode || isSentencePracticeMode
  const isFullscreen = isPracticeMode
  const maxLevel = mode === 'cloze' || mode === 'sentences'
    ? MAX_SENTENCE_LEVEL
    : LEVELS[LEVELS.length - 1]
  const currentLevel = Math.min(settings.cardLevel, maxLevel)
  const levelOptions = LEVELS.filter((level) => level <= maxLevel)
  const currentLevelLabel = LEVEL_LABELS[currentLevel] ?? `Level ${currentLevel}`
  const activeInputMode = isWordPracticeMode ? settings.flashcardInputMode : settings.sentenceInputMode
  const tt = (key: Parameters<typeof t>[1]) => t(settings.interfaceLang, key)
  const statsTitle = isWordPracticeMode
    ? tt('wordStats')
    : mode === 'cloze'
      ? tt('clozeStats')
      : tt('sentenceStats')
  const statsReturnLabel = mode === 'flashcards'
    ? tt('backToCards')
    : mode === 'spelling'
      ? tt('backToSpelling')
      : mode === 'cloze'
        ? tt('backToCloze')
      : tt('backToSentences')
  const inputTitle = mode === 'flashcards'
    ? tt('cardInput')
    : mode === 'spelling'
      ? tt('spellingInput')
      : mode === 'cloze'
        ? tt('clozeInput')
      : tt('sentenceInput')

  const preloadModeButton = useCallback((nextMode: Mode) => {
    preloadMode(nextMode)
  }, [])

  const renderModeContent = () => {
    switch (mode) {
      case 'flashcards':
        return (
          <FlashcardsTab
            nativeLang={settings.nativeLang}
            targetLang={settings.targetLang}
            audioEnabled={settings.flashcardAudio}
            inputMode={settings.flashcardInputMode}
            dictionaryDefaultView={settings.dictionaryDefaultView}
            uiLang={settings.interfaceLang}
            level={currentLevel}
            levelLabel={currentLevelLabel}
            listenOnly={listenOnly}
            onInputModeChange={(flashcardInputMode) => update({ flashcardInputMode })}
            showStats={showStats}
            onShowStatsChange={setShowStats}
          />
        )
      case 'spelling':
        return (
          <MissingLetterTab
            nativeLang={settings.nativeLang}
            targetLang={settings.targetLang}
            audioEnabled={settings.flashcardAudio}
            inputMode={settings.flashcardInputMode}
            uiLang={settings.interfaceLang}
            level={currentLevel}
            levelLabel={currentLevelLabel}
            onInputModeChange={(flashcardInputMode) => update({ flashcardInputMode })}
            showStats={showStats}
            onShowStatsChange={setShowStats}
          />
        )
      case 'cloze':
        return (
          <ClozeTab
            nativeLang={settings.nativeLang}
            targetLang={settings.targetLang}
            level={currentLevel}
            levelLabel={currentLevelLabel}
            inputMode={settings.sentenceInputMode}
            uiLang={settings.interfaceLang}
            showStats={showStats}
            onShowStatsChange={setShowStats}
            onInputModeChange={(sentenceInputMode) => update({ sentenceInputMode })}
          />
        )
      case 'sentences':
        return (
          <SentencesTab
            nativeLang={settings.nativeLang}
            targetLang={settings.targetLang}
            level={currentLevel}
            levelLabel={currentLevelLabel}
            lengthFilter={sentenceLengthFilter}
            inputMode={settings.sentenceInputMode}
            uiLang={settings.interfaceLang}
            showStats={showStats}
            onShowStatsChange={setShowStats}
            onInputModeChange={(sentenceInputMode) => update({ sentenceInputMode })}
            onLengthFilterChange={handleSentenceLengthFilterChange}
          />
        )
      case 'preferences':
        return (
          <section className="rounded-[1.25rem] bg-[var(--panel-quiet)] p-3 sm:p-4 lg:rounded-[1.5rem] lg:p-5">
            <PreferencesTab settings={settings} update={update} />
          </section>
        )
    }
  }

  return (
    <div className={`relative ${isFullscreen ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh] overflow-hidden'}`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-18%] top-[-8%] h-72 w-72 rounded-full bg-[var(--accent-soft)]/35 blur-3xl lg:h-[34rem] lg:w-[34rem]" />
        <div className="absolute right-[-14%] top-[18%] h-72 w-72 rounded-full bg-[var(--sky-soft)]/30 blur-3xl lg:top-[-2%] lg:h-[28rem] lg:w-[28rem]" />
        <div className="absolute bottom-[-10%] left-[10%] h-80 w-80 rounded-full bg-[var(--mint-soft)]/25 blur-3xl lg:left-[45%] lg:h-[26rem] lg:w-[26rem]" />
      </div>

      <div className="absolute right-2 top-2 z-50 hidden lg:block lg:right-8 lg:top-8">
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
                  onMouseEnter={() => preloadModeButton(item)}
                  onFocus={() => preloadModeButton(item)}
                >
                  {{ flashcards: tt('cards'), spelling: tt('spelling'), cloze: tt('cloze'), sentences: tt('sentences'), preferences: tt('preferences') }[item]}
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
                    Level and theme
                  </div>
                  <div className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--glass)] px-3 py-2">
                    <div className="text-sm font-semibold text-[var(--ink)]">Level {currentLevel}</div>
                    <div className="text-xs text-[var(--muted)]">{currentLevelLabel}</div>
                  </div>
                  <div className="mt-3 grid max-h-52 grid-cols-2 gap-1 overflow-y-auto rounded-[0.9rem] border border-[var(--line)] bg-[var(--glass)] p-1">
                    {levelOptions.map((l) => (
                      <button
                        key={l}
                        className={`rounded-[0.75rem] px-2 py-2 text-left ${
                          l === currentLevel
                            ? 'bg-[var(--accent-gradient)] font-semibold text-[var(--ink)]'
                            : 'text-[var(--muted)] hover:bg-[var(--glass-hover)] hover:text-[var(--ink)]'
                        }`}
                        onClick={() => update({ cardLevel: l })}
                      >
                        <div className="text-[0.7rem] font-bold uppercase tracking-[0.12em]">Lv {l}</div>
                        <div className="mt-0.5 text-[0.7rem]">{LEVEL_LABELS[l]}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--glass-soft)] p-3">
                  <div className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">
                    {inputTitle}
                  </div>
                  <FlashcardModeSwitch
                    value={activeInputMode}
                    uiLang={settings.interfaceLang}
                    onChange={(nextMode) => {
                      if (isWordPracticeMode) update({ flashcardInputMode: nextMode })
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
                      ) : mode === 'spelling' ? (
                        <>
                          <div className="flex justify-between"><span>{tt('prompt')}</span><span>{tt('hearWordAgain')}</span></div>
                          <div className="flex justify-between"><span>{tt('answer')}</span><span>{tt('sayFullWordOrLetter')}</span></div>
                        </>
                      ) : mode === 'cloze' ? (
                        <>
                          <div className="flex justify-between"><span>{tt('prompt')}</span><span>{tt('hearSentenceAgain')}</span></div>
                          <div className="flex justify-between"><span>{tt('answer')}</span><span>{tt('sayMissingWordNow')}</span></div>
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
                      ) : mode === 'spelling' ? (
                        <>
                          <div className="flex justify-between"><span>← →</span><span>{tt('swipeForLetter')}</span></div>
                          <div className="flex justify-between"><span>↑ ↓</span><span>Hear letter choices</span></div>
                          <div className="flex justify-between"><span>Space / Enter</span><span>{tt('hearWordAgain')}</span></div>
                        </>
                      ) : mode === 'cloze' ? (
                        <>
                          <div className="flex justify-between"><span>← →</span><span>{tt('swipeForWord')}</span></div>
                          <div className="flex justify-between"><span>↑ ↓</span><span>Hear word choices</span></div>
                          <div className="flex justify-between"><span>Space / Enter</span><span>{tt('hearSentenceAgain')}</span></div>
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

          {/* Mobile header — single line */}
          <header className="mb-1 flex items-center gap-1.5 lg:hidden">
            <LanguagePicker compact label="" value={settings.targetLang} onChange={(code) => update({ targetLang: code })} />

            <div className="flex-1" />

            {isPracticeMode && (
              <div className="relative">
                <button
                  className="flex items-center gap-0.5 rounded-full border border-[var(--line)] bg-[var(--glass)] px-1.5 py-1 text-[0.65rem] font-bold text-[var(--muted)]"
                  onClick={() => setLevelOpen(!levelOpen)}
                >
                  {currentLevel}
                  <ChevronDown className={`h-2.5 w-2.5 transition-transform ${levelOpen ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                </button>
                {levelOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLevelOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-1 max-h-72 w-44 overflow-y-auto rounded-[1rem] border border-[var(--line-strong)] bg-[var(--panel-strong)] p-1 shadow-[var(--shadow-soft)] backdrop-blur-xl">
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
                          <span>{LEVEL_LABELS[l]}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {isPracticeMode && (
              <FlashcardModeSwitch
                value={activeInputMode}
                uiLang={settings.interfaceLang}
                onChange={(nextMode) => {
                  if (isWordPracticeMode) update({ flashcardInputMode: nextMode })
                  else update({ sentenceInputMode: nextMode })
                }}
                compact
              />
            )}


            {isWordPracticeMode && (
              <button
                className={`flex h-7 w-7 items-center justify-center rounded-full ${settings.flashcardAudio ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}
                onClick={() => update({ flashcardAudio: !settings.flashcardAudio })}
              >
                {settings.flashcardAudio ? (
                  <Volume2 className="h-4 w-4" strokeWidth={2} />
                ) : (
                  <VolumeX className="h-4 w-4" strokeWidth={2} />
                )}
              </button>
            )}

            {isWordPracticeMode && (
              <button
                className={`flex h-7 w-7 items-center justify-center rounded-full ${listenOnly ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'text-[var(--muted)]'}`}
                onClick={toggleListenOnly}
              >
                <Headphones className="h-4 w-4" strokeWidth={2} />
              </button>
            )}

            {isPracticeMode && (
              <button
                className="flex items-center gap-1 rounded-full px-1.5 py-1 text-[0.6rem] font-bold"
                onClick={() => setShowStats(!showStats)}
                title={showStats ? tt('play') : tt('stats')}
              >
                <span className="text-[var(--success)]">{liveScores.correct}</span>
                <span className="text-[var(--muted)]">/</span>
                <span className="text-[var(--error)]">{liveScores.total - liveScores.correct}</span>
              </button>
            )}
          </header>

          {/* Content */}
          <main className="min-w-0">
            <Suspense fallback={<ModeLoading mode={mode} />}>
              {renderModeContent()}
            </Suspense>
          </main>
        </div>
      </div>

      {/* Mobile dock */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--dock)]/92 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 backdrop-blur-2xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          <TabButton icon="flashcards" label={tt('cards')} active={mode === 'flashcards'} onClick={() => { navigate('flashcards'); setShowStats(false) }} onPreload={() => preloadModeButton('flashcards')} />
          <TabButton icon="spelling" label={tt('spelling')} active={mode === 'spelling'} onClick={() => { navigate('spelling'); setShowStats(false) }} onPreload={() => preloadModeButton('spelling')} />
          <TabButton icon="cloze" label={tt('cloze')} active={mode === 'cloze'} onClick={() => { navigate('cloze'); setShowStats(false) }} onPreload={() => preloadModeButton('cloze')} />
          <TabButton icon="speak" label={tt('sentences')} active={mode === 'sentences'} onClick={() => { navigate('sentences'); setShowStats(false) }} onPreload={() => preloadModeButton('sentences')} />
          <TabButton icon="preferences" label={tt('prefs')} active={mode === 'preferences'} onClick={() => { navigate('preferences'); setShowStats(false) }} onPreload={() => preloadModeButton('preferences')} />
        </div>
      </nav>
    </div>
  )
}

function TabButton({ icon, label, active, onClick, onPreload }: { icon: string; label: string; active: boolean; onClick: () => void; onPreload?: () => void }) {
  return (
    <button
      className={`relative flex flex-col items-center gap-1 rounded-[1rem] px-2 py-2 text-center ${
        active
          ? 'bg-[var(--ink)] text-[var(--paper)] shadow-[var(--shadow-card)]'
          : 'text-[var(--muted)]'
      }`}
      onClick={onClick}
      onTouchStart={onPreload}
      onMouseEnter={onPreload}
      onFocus={onPreload}
    >
      <TabIcon name={icon} />
      <span className="hidden text-[0.6rem] font-bold uppercase tracking-[0.14em] lg:inline">{label}</span>
    </button>
  )
}

function TabIcon({ name }: { name: string }) {
  switch (name) {
    case 'flashcards':
      return <Layers3 className="h-5 w-5" strokeWidth={1.7} />
    case 'spelling':
      return <Type className="h-5 w-5" strokeWidth={1.7} />
    case 'cloze':
      return <MessageSquare className="h-5 w-5" strokeWidth={1.7} />
    case 'speak':
      return <Mic className="h-5 w-5" strokeWidth={1.7} />
    case 'preferences':
      return <Settings2 className="h-5 w-5" strokeWidth={1.7} />
    default:
      return null
  }
}

function ModeLoading({ mode }: { mode: Mode }) {
  if (mode === 'preferences') {
    return (
      <section className="rounded-[1.25rem] bg-[var(--panel-quiet)] p-3 sm:p-4 lg:rounded-[1.5rem] lg:p-5">
        <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--glass-strong)] px-4 py-12 text-center text-sm text-[var(--muted)]">
          Loading…
        </div>
      </section>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-80px)] items-center justify-center rounded-[1.5rem] border border-[var(--line)] bg-[var(--glass)] text-sm text-[var(--muted)]">
      Loading…
    </div>
  )
}
