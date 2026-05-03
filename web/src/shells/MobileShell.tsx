import { useState } from 'react'
import { ChevronDown, Headphones, Layers3, MessageSquare, Mic, Settings2, Type, Volume2, VolumeX } from 'lucide-react'
import { FlashcardModeSwitch } from '../components/FlashcardModeSwitch.tsx'
import { TabContent } from '../components/TabContent.tsx'
import { LanguagePicker } from '../components/LanguagePicker.tsx'
import { LEVEL_LABELS } from '../services/levelMetadata.ts'
import { preloadMode } from '../useAppState.ts'
import type { useAppState } from '../useAppState.ts'
import type { Mode } from '../types.ts'

type AppState = ReturnType<typeof useAppState>

export function MobileShell({ state }: { state: AppState }) {
  const {
    mode, settings, update, navigate, showStats, setShowStats,
    listenOnly, toggleListenOnly, liveScores, sentenceLengthFilter,
    handleSentenceLengthFilterChange, isPracticeMode, isWordPracticeMode,
    currentLevel, levelOptions, activeInputMode,
  } = state

  const [levelOpen, setLevelOpen] = useState(false)
  const currentLevelLabel = LEVEL_LABELS[currentLevel] ?? `Level ${currentLevel}`


  return (
    <div className="flex h-[100dvh] flex-col">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-18%] top-[-8%] h-72 w-72 rounded-full bg-[var(--accent-soft)]/35 blur-3xl" />
        <div className="absolute right-[-14%] top-[18%] h-72 w-72 rounded-full bg-[var(--sky-soft)]/30 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[10%] h-80 w-80 rounded-full bg-[var(--mint-soft)]/25 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 shrink-0 flex items-center gap-1.5 px-1 pt-1 pb-1">
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
            {settings.flashcardAudio ? <Volume2 className="h-4 w-4" strokeWidth={2} /> : <VolumeX className="h-4 w-4" strokeWidth={2} />}
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
          >
            <span className="text-[var(--success)]">{liveScores.correct}</span>
            <span className="text-[var(--muted)]">/</span>
            <span className="text-[var(--error)]">{liveScores.total - liveScores.correct}</span>
          </button>
        )}

        <button
          className={`flex h-7 w-7 items-center justify-center rounded-full ${mode === 'preferences' ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}
          onClick={() => { navigate('preferences'); setShowStats(false) }}
        >
          <Settings2 className="h-4 w-4" strokeWidth={2} />
        </button>
      </header>

      {/* Content — fills space between header and dock */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <TabContent
          mode={mode} settings={settings} update={update}
          currentLevel={currentLevel} currentLevelLabel={currentLevelLabel}
          listenOnly={listenOnly} showStats={showStats} setShowStats={setShowStats}
          sentenceLengthFilter={sentenceLengthFilter}
          handleSentenceLengthFilterChange={handleSentenceLengthFilterChange}
          prefsWrapper="overflow-y-auto p-2"
        />
      </main>

      {/* Bottom dock — practice modes only */}
      <nav className="relative z-10 shrink-0 border-t border-[var(--line)] bg-[var(--dock)]/92 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 backdrop-blur-2xl">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {(['flashcards', 'spelling', 'cloze', 'sentences'] as Mode[]).map((m) => (
            <button
              key={m}
              className={`relative flex flex-col items-center gap-1 rounded-[1rem] px-2 py-2 text-center ${
                mode === m ? 'bg-[var(--ink)] text-[var(--paper)] shadow-[var(--shadow-card)]' : 'text-[var(--muted)]'
              }`}
              onClick={() => { navigate(m); setShowStats(false) }}
              onTouchStart={() => preloadMode(m)}
            >
              <TabIcon name={m} />
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function TabIcon({ name }: { name: string }) {
  switch (name) {
    case 'flashcards': return <Layers3 className="h-5 w-5" strokeWidth={1.7} />
    case 'spelling': return <Type className="h-5 w-5" strokeWidth={1.7} />
    case 'cloze': return <MessageSquare className="h-5 w-5" strokeWidth={1.7} />
    case 'sentences': return <Mic className="h-5 w-5" strokeWidth={1.7} />
    default: return null
  }
}
