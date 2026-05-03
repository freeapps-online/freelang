import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupCardDictionary } from './dictionary.ts'

describe('dictionary service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prefers a monolingual Wiktapi entry when the target edition exists', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      word: 'hola-monolingual',
      edition: 'es',
      entries: [{
        lang_code: 'es',
        lang: 'Spanish',
        pos: 'interjection',
        sounds: [{ ipa: '[ˈo.la]' }],
        forms: [{ form: '¡hola-monolingual!', tags: ['canonical'] }],
        synonyms: [{ word: 'saludo' }],
        translations: [{ lang_code: 'en', lang: 'English', word: 'hello', sense_index: '1' }],
        senses: [{
          glosses: ['Saludo usado al encontrarse con alguien.'],
          examples: [{ text: 'Hola, Ana.' }],
          synonyms: [{ word: 'buenas' }],
          sense_index: '1',
        }],
      }],
    }), { status: 200 }))

    const result = await lookupCardDictionary({
      englishWord: 'hello-monolingual',
      targetWord: 'hola-monolingual',
      targetLang: 'es',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result?.queryLang).toBe('es')
    expect(result?.definitionLanguageCode).toBe('es')
    expect(result?.entries[0]?.senses[0]?.definition).toContain('Saludo')
    expect(result?.entries[0]?.synonyms).toContain('saludo')
    expect(result?.entries[0]?.forms[0]?.word).toBe('¡hola-monolingual!')
  })

  it('falls back to English-language Wiktapi definitions for the target word', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        word: 'привет-fallback',
        edition: 'en',
        entries: [{
          lang_code: 'ru',
          lang: 'Russian',
          pos: 'interjection',
          sounds: [{ ipa: '[prʲɪˈvʲet]' }],
          senses: [{
            glosses: ['hello; hi'],
            examples: [{ text: 'Привет, Маша.' }],
            sense_index: '1',
          }],
        }],
      }), { status: 200 }))

    const result = await lookupCardDictionary({
      englishWord: 'hello-fallback',
      targetWord: 'привет-fallback',
      targetLang: 'ru',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result?.queryLang).toBe('ru')
    expect(result?.definitionLanguageCode).toBe('en')
    expect(result?.entries[0]?.senses[0]?.definition).toContain('hello')
  })

  it('falls back to the english lemma when target-word lookups miss', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        word: 'moon-lemma',
        edition: 'en',
        entries: [{
          lang_code: 'en',
          lang: 'English',
          pos: 'noun',
          sounds: [{ ipa: '/muːn/' }],
          senses: [{
            glosses: ['The natural satellite of Earth.'],
            examples: [{ text: 'The moon is bright tonight.' }],
            sense_index: '1',
          }],
        }],
      }), { status: 200 }))

    const result = await lookupCardDictionary({
      englishWord: 'moon-lemma',
      targetWord: 'луна-lemma',
      targetLang: 'ru',
    })

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(result?.queryLang).toBe('en')
    expect(result?.definitionLanguageCode).toBe('en')
    expect(result?.entries[0]?.senses[0]?.definition).toContain('satellite')
  })

  it('keeps FreeDictionaryAPI as a fallback for unsupported monolingual editions', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        word: 'مرحبا-free',
        entries: [{
          language: { code: 'ar', name: 'Arabic' },
          partOfSpeech: 'interjection',
          pronunciations: [{ text: '[marħaba]' }],
          senses: [{
            definition: 'hello',
            examples: ['مرحبا يا صديقي'],
            synonyms: ['أهلًا'],
            translations: [{ language: { code: 'en', name: 'English' }, word: 'hello' }],
          }],
          synonyms: ['تحية'],
        }],
        source: { url: 'https://en.wiktionary.org/wiki/%D9%85%D8%B1%D8%AD%D8%A8%D8%A7', license: { name: 'CC BY-SA', url: 'https://example.com/license' } },
      }), { status: 200 }))

    const result = await lookupCardDictionary({
      englishWord: 'hello-free',
      targetWord: 'مرحبا-free',
      targetLang: 'ar',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result?.queryLang).toBe('ar')
    expect(result?.sources[0]?.id).toBe('freedictionaryapi')
    expect(result?.entries[0]?.synonyms).toContain('تحية')
    expect(result?.entries[0]?.senses[0]?.synonyms).toContain('أهلًا')
  })
})
