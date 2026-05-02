const STORAGE_KEY = 'freelang-settings'

export type ThemePreference = 'system' | 'light' | 'dark'
export type FontSizePreference = 'small' | 'medium' | 'large' | 'xlarge'
export type MotionPreference = 'full' | 'reduced'
export type SurfacePreference = 'soft' | 'bold'

export interface Settings {
  nativeLang: string
  targetLang: string
  theme: ThemePreference
  labelSize: FontSizePreference
  contentSize: FontSizePreference
  motion: MotionPreference
  surface: SurfacePreference
  flashcardAudio: boolean
}

const defaults: Settings = {
  nativeLang: 'en',
  targetLang: 'es',
  theme: 'system',
  labelSize: 'medium',
  contentSize: 'medium',
  motion: 'full',
  surface: 'soft',
  flashcardAudio: true,
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
