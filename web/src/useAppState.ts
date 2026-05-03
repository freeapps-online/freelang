import { startTransition, useState, useEffect, useCallback } from 'react'
import { useApplySettings, useSettings } from './hooks.ts'
import { loadScores } from './services/scores.ts'
import { MAX_SENTENCE_LEVEL, type SentenceLengthFilter } from './services/practiceContent.ts'
import { LEVELS } from './services/levelMetadata.ts'
import type { Mode } from './types.ts'

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

export const loadFlashcardsTab = () => import('./components/FlashcardsTab.tsx')
export const loadMissingLetterTab = () => import('./components/MissingLetterTab.tsx')
export const loadClozeTab = () => import('./components/ClozeTab.tsx')
export const loadSentencesTab = () => import('./components/SpeakTab.tsx')
export const loadPreferencesTab = () => import('./components/PreferencesTab.tsx')

export function preloadMode(mode: Mode) {
  switch (mode) {
    case 'flashcards': void loadFlashcardsTab(); return
    case 'spelling': void loadMissingLetterTab(); return
    case 'cloze': void loadClozeTab(); return
    case 'sentences': void loadSentencesTab(); return
    case 'preferences': void loadPreferencesTab()
  }
}

export function useAppState() {
  const [mode, setMode] = useState<Mode>(getModeFromPath)
  const [sentenceLengthFilter, setSentenceLengthFilter] = useState<SentenceLengthFilter>(getSentenceLengthFilterFromLocation)
  const { settings, update } = useSettings()
  useApplySettings(settings)
  const [showStats, setShowStats] = useState(false)
  const [listenOnly, setListenOnly] = useState(() => {
    try { return localStorage.getItem('freelang-listen-only') === '1' } catch { return false }
  })

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
  const maxLevel = isSentencePracticeMode ? MAX_SENTENCE_LEVEL : LEVELS[LEVELS.length - 1]
  const currentLevel = Math.min(settings.cardLevel, maxLevel)
  const levelOptions = LEVELS.filter((level) => level <= maxLevel)
  const activeInputMode = isWordPracticeMode ? settings.flashcardInputMode : settings.sentenceInputMode

  return {
    mode,
    settings,
    update,
    navigate,
    showStats,
    setShowStats,
    listenOnly,
    toggleListenOnly,
    liveScores,
    sentenceLengthFilter,
    handleSentenceLengthFilterChange,
    isPracticeMode,
    isWordPracticeMode,
    isSentencePracticeMode,
    currentLevel,
    levelOptions,
    activeInputMode,
  }
}
