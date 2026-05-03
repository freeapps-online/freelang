import type { UiLocale } from './i18n.ts'

const STORAGE_KEY = 'freelang-settings'

export type ThemePreference = 'system' | 'light' | 'dark'
export type FontSizePreference = 'small' | 'medium' | 'large' | 'xlarge'
export type MotionPreference = 'full' | 'reduced'
export type SurfacePreference = 'soft' | 'bold'
export type PracticeInputMode = 'keyboard' | 'speak'
export type DictionaryViewPreference = 'dictionary' | 'thesaurus' | 'translation'
export type SpeechSpeedPreference = 'slow' | 'normal' | 'fast'
export type CardDelayPreference = 'none' | 'short' | 'medium' | 'long'

export const SPEECH_SPEED_VALUES: Record<SpeechSpeedPreference, number> = {
  slow: 0.7,
  normal: 0.9,
  fast: 1.1,
}

export const CARD_DELAY_VALUES: Record<CardDelayPreference, { correct: number; wrong: number }> = {
  none: { correct: 200, wrong: 500 },
  short: { correct: 400, wrong: 1100 },
  medium: { correct: 700, wrong: 1600 },
  long: { correct: 1200, wrong: 2200 },
}

export interface Settings {
  interfaceLang: UiLocale
  nativeLang: string
  targetLang: string
  theme: ThemePreference
  labelSize: FontSizePreference
  contentSize: FontSizePreference
  motion: MotionPreference
  surface: SurfacePreference
  flashcardAudio: boolean
  flashcardInputMode: PracticeInputMode
  sentenceInputMode: PracticeInputMode
  dictionaryDefaultView: DictionaryViewPreference
  cardLevel: number
  speechSpeed: SpeechSpeedPreference
  cardDelay: CardDelayPreference
}

const defaults: Settings = {
  interfaceLang: 'en',
  nativeLang: 'en',
  targetLang: 'es',
  theme: 'system',
  labelSize: 'medium',
  contentSize: 'medium',
  motion: 'full',
  surface: 'soft',
  flashcardAudio: true,
  flashcardInputMode: 'keyboard',
  sentenceInputMode: 'keyboard',
  dictionaryDefaultView: 'dictionary',
  cardLevel: 1,
  speechSpeed: 'normal',
  cardDelay: 'short',
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
      ?? localStorage.getItem('lango-settings') // migrate old key
    if (raw) {
      const parsed = JSON.parse(raw)
      // migrate old fontSize to new split
      if (parsed.fontSize && !parsed.labelSize) {
        parsed.labelSize = parsed.fontSize
        parsed.contentSize = parsed.fontSize
        delete parsed.fontSize
      }
      return { ...defaults, ...parsed }
    }
  } catch { /* ignore */ }
  return defaults
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
