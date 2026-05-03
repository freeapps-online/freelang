import { Suspense, lazy } from 'react'
import { loadFlashcardsTab, loadMissingLetterTab, loadClozeTab, loadSentencesTab, loadPreferencesTab } from '../useAppState.ts'
import { SPEECH_SPEED_VALUES, CARD_DELAY_VALUES, type Settings, type PracticeInputMode } from '../services/settings.ts'
import type { SentenceLengthFilter } from '../services/practiceContent.ts'
import type { Mode } from '../types.ts'

const FlashcardsTab = lazy(async () => ({ default: (await loadFlashcardsTab()).FlashcardsTab }))
const MissingLetterTab = lazy(async () => ({ default: (await loadMissingLetterTab()).MissingLetterTab }))
const ClozeTab = lazy(async () => ({ default: (await loadClozeTab()).ClozeTab }))
const SentencesTab = lazy(async () => ({ default: (await loadSentencesTab()).SentencesTab }))
const PreferencesTab = lazy(async () => ({ default: (await loadPreferencesTab()).PreferencesTab }))

interface TabContentProps {
  mode: Mode
  settings: Settings
  update: (patch: Partial<Settings>) => void
  currentLevel: number
  currentLevelLabel: string
  listenOnly: boolean
  showStats: boolean
  setShowStats: (v: boolean) => void
  sentenceLengthFilter: SentenceLengthFilter
  handleSentenceLengthFilterChange: (f: SentenceLengthFilter) => void
  prefsWrapper?: string
}

export function TabContent({
  mode, settings, update, currentLevel, currentLevelLabel, listenOnly,
  showStats, setShowStats, sentenceLengthFilter, handleSentenceLengthFilterChange,
  prefsWrapper,
}: TabContentProps) {
  const content = (() => {
    switch (mode) {
      case 'flashcards':
        return (
          <FlashcardsTab
            nativeLang={settings.nativeLang} targetLang={settings.targetLang}
            audioEnabled={settings.flashcardAudio} inputMode={settings.flashcardInputMode}
            dictionaryDefaultView={settings.dictionaryDefaultView} uiLang={settings.interfaceLang}
            level={currentLevel} levelLabel={currentLevelLabel} listenOnly={listenOnly}
            onInputModeChange={(m: PracticeInputMode) => update({ flashcardInputMode: m })}
            showStats={showStats} onShowStatsChange={setShowStats}
            speechRate={SPEECH_SPEED_VALUES[settings.speechSpeed]}
            correctDelay={CARD_DELAY_VALUES[settings.cardDelay].correct}
            wrongDelay={CARD_DELAY_VALUES[settings.cardDelay].wrong}
          />
        )
      case 'spelling':
        return (
          <MissingLetterTab
            nativeLang={settings.nativeLang} targetLang={settings.targetLang}
            audioEnabled={settings.flashcardAudio} inputMode={settings.flashcardInputMode}
            uiLang={settings.interfaceLang} level={currentLevel} levelLabel={currentLevelLabel}
            onInputModeChange={(m: PracticeInputMode) => update({ flashcardInputMode: m })}
            showStats={showStats} onShowStatsChange={setShowStats}
          />
        )
      case 'cloze':
        return (
          <ClozeTab
            nativeLang={settings.nativeLang} targetLang={settings.targetLang}
            level={currentLevel} levelLabel={currentLevelLabel}
            inputMode={settings.sentenceInputMode} uiLang={settings.interfaceLang}
            showStats={showStats} onShowStatsChange={setShowStats}
            onInputModeChange={(m: PracticeInputMode) => update({ sentenceInputMode: m })}
          />
        )
      case 'sentences':
        return (
          <SentencesTab
            nativeLang={settings.nativeLang} targetLang={settings.targetLang}
            level={currentLevel} levelLabel={currentLevelLabel}
            lengthFilter={sentenceLengthFilter} inputMode={settings.sentenceInputMode}
            uiLang={settings.interfaceLang} showStats={showStats}
            onShowStatsChange={setShowStats}
            onInputModeChange={(m: PracticeInputMode) => update({ sentenceInputMode: m })}
            onLengthFilterChange={handleSentenceLengthFilterChange}
          />
        )
      case 'preferences':
        return (
          <div className={prefsWrapper}>
            <PreferencesTab settings={settings} update={update} />
          </div>
        )
    }
  })()

  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">Loading...</div>}>
      {content}
    </Suspense>
  )
}
