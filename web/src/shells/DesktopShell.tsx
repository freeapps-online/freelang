import { Settings2 } from 'lucide-react'
import { FlashcardModeSwitch } from '../components/FlashcardModeSwitch.tsx'
import { TabContent } from '../components/TabContent.tsx'
import { LanguagePicker } from '../components/LanguagePicker.tsx'
import { t } from '../services/i18n.ts'
import { LEVEL_LABELS } from '../services/levelMetadata.ts'
import { preloadMode } from '../useAppState.ts'
import type { useAppState } from '../useAppState.ts'
import type { Mode } from '../types.ts'

const PRACTICE_MODES: Mode[] = ['flashcards', 'spelling', 'cloze', 'sentences']

type AppState = ReturnType<typeof useAppState>

export function DesktopShell({ state }: { state: AppState }) {
  const {
    mode, settings, update, navigate, showStats, setShowStats,
    listenOnly, sentenceLengthFilter, handleSentenceLengthFilterChange,
    isPracticeMode, isWordPracticeMode, currentLevel, levelOptions, activeInputMode,
  } = state

  const tt = (key: Parameters<typeof t>[1]) => t(settings.interfaceLang, key)
  const currentLevelLabel = LEVEL_LABELS[currentLevel] ?? `Level ${currentLevel}`
  const statsTitle = isWordPracticeMode ? tt('wordStats') : mode === 'cloze' ? tt('clozeStats') : tt('sentenceStats')
  const statsReturnLabel = mode === 'flashcards' ? tt('backToCards') : mode === 'spelling' ? tt('backToSpelling') : mode === 'cloze' ? tt('backToCloze') : tt('backToSentences')
  const inputTitle = mode === 'flashcards' ? tt('cardInput') : mode === 'spelling' ? tt('spellingInput') : mode === 'cloze' ? tt('clozeInput') : tt('sentenceInput')


  return (
    <div className="relative h-[100dvh] overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-18%] top-[-8%] h-[34rem] w-[34rem] rounded-full bg-[var(--accent-soft)]/35 blur-3xl" />
        <div className="absolute right-[-14%] top-[-2%] h-[28rem] w-[28rem] rounded-full bg-[var(--sky-soft)]/30 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[45%] h-[26rem] w-[26rem] rounded-full bg-[var(--mint-soft)]/25 blur-3xl" />
      </div>

      <div className="relative mx-auto h-full max-w-[1540px] overflow-hidden px-8 py-8">
        <div className="grid h-full grid-cols-[17rem_minmax(0,1fr)] gap-7">
          {/* Sidebar */}
          <aside className="flex flex-col gap-5 overflow-y-auto rounded-[2rem] border border-[var(--line)] bg-[var(--glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--glass)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--accent-deep)]">
              <img src="/logo.svg" alt="" className="h-4 w-4 rounded-[0.35rem]" />
              FreeLanguageApp.online
            </div>

            <div className="grid gap-3">
              <LanguagePicker label={tt('native')} value={settings.nativeLang} onChange={(code) => update({ nativeLang: code })} />
              <LanguagePicker label={tt('target')} value={settings.targetLang} onChange={(code) => update({ targetLang: code })} />
            </div>

            <nav className="space-y-1">
              {PRACTICE_MODES.map((item) => (
                <button
                  key={item}
                  className={`w-full rounded-[1rem] px-4 py-3 text-left text-sm font-semibold transition duration-200 ${
                    mode === item
                      ? 'border border-[var(--accent-soft)] bg-[var(--accent-gradient)] text-[var(--ink)] shadow-[var(--shadow-card)]'
                      : 'border border-transparent text-[var(--muted)] hover:bg-[var(--glass-hover)] hover:text-[var(--ink)]'
                  }`}
                  onClick={() => { navigate(item); setShowStats(false) }}
                  onMouseEnter={() => preloadMode(item)}
                  onFocus={() => preloadMode(item)}
                >
                  {{ flashcards: tt('cards'), spelling: tt('spelling'), cloze: tt('cloze'), sentences: tt('sentences') }[item as 'flashcards' | 'spelling' | 'cloze' | 'sentences']}
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

            {/* Settings button — always at bottom */}
            <div className={isPracticeMode ? '' : 'mt-auto'}>
              <button
                className={`flex w-full items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold transition duration-200 ${
                  mode === 'preferences'
                    ? 'border border-[var(--line-strong)] bg-[var(--glass-hover)] text-[var(--ink)]'
                    : 'border border-transparent text-[var(--muted)] hover:bg-[var(--glass-hover)] hover:text-[var(--ink)]'
                }`}
                onClick={() => { navigate('preferences'); setShowStats(false) }}
                onMouseEnter={() => preloadMode('preferences')}
              >
                <Settings2 className="h-4 w-4" strokeWidth={1.7} />
                {tt('preferences')}
              </button>
            </div>

            {isPracticeMode && (
              <div className="space-y-3">
                <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--glass-soft)] p-3">
                  <div className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Level</div>
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
                  <div className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">{inputTitle}</div>
                  <FlashcardModeSwitch
                    value={activeInputMode}
                    uiLang={settings.interfaceLang}
                    onChange={(nextMode) => {
                      if (isWordPracticeMode) update({ flashcardInputMode: nextMode })
                      else update({ sentenceInputMode: nextMode })
                    }}
                  />
                </div>
              </div>
            )}
          </aside>

          {/* Main content */}
          <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <TabContent
              mode={mode} settings={settings} update={update}
              currentLevel={currentLevel} currentLevelLabel={currentLevelLabel}
              listenOnly={listenOnly} showStats={showStats} setShowStats={setShowStats}
              sentenceLengthFilter={sentenceLengthFilter}
              handleSentenceLengthFilterChange={handleSentenceLengthFilterChange}
              prefsWrapper="overflow-y-auto rounded-[1.5rem] bg-[var(--panel-quiet)] p-5"
            />
          </main>
        </div>
      </div>
    </div>
  )
}
