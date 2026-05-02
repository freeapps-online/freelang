const STORAGE_KEY = 'lango-settings'

export type ThemePreference = 'system' | 'light' | 'dark'
export type FontSizePreference = 'small' | 'medium' | 'large' | 'xlarge'
export type MotionPreference = 'full' | 'reduced'
export type SurfacePreference = 'soft' | 'bold'

export interface Settings {
  nativeLang: string
  targetLang: string
  theme: ThemePreference
  fontSize: FontSizePreference
  motion: MotionPreference
  surface: SurfacePreference
  flashcardAudio: boolean
}

const defaults: Settings = {
  nativeLang: 'en',
  targetLang: 'es',
  theme: 'system',
  fontSize: 'medium',
  motion: 'full',
  surface: 'soft',
  flashcardAudio: true,
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaults, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return defaults
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
