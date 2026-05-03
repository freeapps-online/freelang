import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupCardDictionary } from './dictionary.ts'

describe('dictionary service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prefers the target-language lookup when it exists', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      word: 'hola',
      entries: [{
        language: { code: 'es', name: 'Spanish' },
        partOfSpeech: 'interjection',
        pronunciations: [{ text: '/ola/' }],
        senses: [{ definition: 'Saludo usado al encontrarse con alguien.', examples: ['Hola, Ana.'] }],
      }],
      source: { url: 'https://example.com/hola', license: { name: 'CC BY-SA', url: 'https://example.com/license' } },
    }), { status: 200 }))

    const result = await lookupCardDictionary({
      englishWord: 'hello',
      targetWord: 'hola',
      targetLang: 'es',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result?.queryLang).toBe('es')
    expect(result?.entries[0]?.senses[0]?.definition).toContain('Saludo')
  })

  it('falls back to the english lemma when the target lookup misses', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        word: 'moon',
        entries: [{
          language: { code: 'en', name: 'English' },
          partOfSpeech: 'noun',
          pronunciations: [{ text: '/muːn/' }],
          senses: [{ definition: 'The natural satellite of Earth.', examples: ['The moon is bright tonight.'] }],
        }],
        source: { url: 'https://example.com/moon', license: { name: 'CC BY-SA', url: 'https://example.com/license' } },
      }), { status: 200 }))

    const result = await lookupCardDictionary({
      englishWord: 'moon',
      targetWord: 'луна',
      targetLang: 'ru',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result?.queryLang).toBe('en')
    expect(result?.entries[0]?.senses[0]?.definition).toContain('satellite')
  })
})
