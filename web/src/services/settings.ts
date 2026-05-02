const STORAGE_KEY = 'lango-settings'

export interface Settings {
  nativeLang: string
  targetLang: string
}

const defaults: Settings = {
  nativeLang: 'en',
  targetLang: 'es',
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
