import { beforeEach, describe, expect, it } from 'vitest'
import { loadSettings, saveSettings } from './settings.ts'

describe('settings service', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults when storage is empty', () => {
    expect(loadSettings()).toEqual({
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
    })
  })

  it('migrates the legacy lango key and fontSize setting', () => {
    localStorage.setItem('lango-settings', JSON.stringify({
      nativeLang: 'fr',
      targetLang: 'de',
      fontSize: 'large',
      flashcardAudio: false,
    }))

    const settings = loadSettings()

    expect(settings).toMatchObject({
      interfaceLang: 'en',
      nativeLang: 'fr',
      targetLang: 'de',
      labelSize: 'large',
      contentSize: 'large',
      flashcardAudio: false,
      flashcardInputMode: 'keyboard',
      sentenceInputMode: 'keyboard',
      dictionaryDefaultView: 'dictionary',
    })
    expect('fontSize' in settings).toBe(false)
  })

  it('saves settings under the current storage key', () => {
    const next = {
      interfaceLang: 'ru' as const,
      nativeLang: 'it',
      targetLang: 'ja',
      theme: 'dark' as const,
      labelSize: 'small' as const,
      contentSize: 'xlarge' as const,
      motion: 'reduced' as const,
      surface: 'bold' as const,
      flashcardAudio: false,
      flashcardInputMode: 'speak' as const,
      sentenceInputMode: 'speak' as const,
      dictionaryDefaultView: 'translation' as const,
      cardLevel: 7,
      speechSpeed: 'fast' as const,
      cardDelay: 'long' as const,
    }

    saveSettings(next)

    expect(JSON.parse(localStorage.getItem('freelang-settings') ?? 'null')).toEqual(next)
    expect(loadSettings()).toEqual(next)
  })
})
