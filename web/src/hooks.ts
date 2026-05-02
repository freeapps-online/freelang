import { useState, useEffect, useSyncExternalStore, useCallback } from 'react'
import { speech, type SpeechState } from './services/speech.ts'
import { loadSettings, saveSettings, type Settings } from './services/settings.ts'

export function useSpeech(): SpeechState {
  return useSyncExternalStore(
    (cb) => speech.subscribe(cb),
    () => speech.state,
  )
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  return { settings, update }
}

export function useDebounce(value: string, ms = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}
