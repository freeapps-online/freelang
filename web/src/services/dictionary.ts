import { LANGUAGES } from '../types.ts'

const FREE_DICTIONARY_API = 'https://freedictionaryapi.com/api/v1/entries'
const WIKTAPI_API = 'https://api.wiktapi.dev/v1'
const WIKTAPI_EDITIONS = new Set([
  'cs', 'de', 'el', 'en', 'es', 'fr', 'id', 'it', 'ja', 'ko',
  'ku', 'ms', 'nl', 'pl', 'pt', 'ru', 'simple', 'th', 'tr', 'vi', 'zh',
])

export interface DictionaryTranslation {
  languageCode: string
  languageName: string
  word: string
}

export interface DictionaryForm {
  word: string
  tags: string[]
}

export interface DictionarySense {
  definition: string
  examples: string[]
  synonyms: string[]
  translations: DictionaryTranslation[]
}

export interface DictionaryEntry {
  languageCode: string
  languageName: string
  partOfSpeech: string
  pronunciation?: string
  synonyms: string[]
  forms: DictionaryForm[]
  senses: DictionarySense[]
}

export interface DictionarySource {
  id: string
  label: string
  url: string
}

export interface DictionaryLookupResult {
  queryWord: string
  queryLang: string
  definitionLanguageCode: string
  definitionLanguageName: string
  entries: DictionaryEntry[]
  sources: DictionarySource[]
  sourceUrl?: string
  sourceLicenseName?: string
  sourceLicenseUrl?: string
}

interface FreeDictionarySense {
  definition?: string
  examples?: string[]
  synonyms?: string[]
  translations?: Array<{
    language?: { code?: string; name?: string }
    word?: string
  }>
}

interface FreeDictionaryEntry {
  language?: { code?: string; name?: string }
  partOfSpeech?: string
  pronunciations?: Array<{ text?: string }>
  senses?: FreeDictionarySense[]
  synonyms?: string[]
}

interface FreeDictionaryResponse {
  word?: string
  entries?: FreeDictionaryEntry[]
  source?: {
    url?: string
    license?: {
      name?: string
      url?: string
    }
  }
}

interface WiktapiExampleObject {
  text?: string
}

interface WiktapiFormObject {
  form?: string
  word?: string
  tags?: string[]
}

interface WiktapiRelatedWordObject {
  word?: string
}

interface WiktapiTranslationObject {
  word?: string
  lang_code?: string
  lang?: string
  sense_index?: string | number
}

interface WiktapiSense {
  glosses?: string[]
  examples?: Array<string | WiktapiExampleObject>
  synonyms?: Array<string | WiktapiRelatedWordObject>
  sense_index?: string | number
}

interface WiktapiEntry {
  lang_code?: string
  lang?: string
  pos?: string
  senses?: WiktapiSense[]
  sounds?: Array<{ ipa?: string }>
  translations?: WiktapiTranslationObject[]
  forms?: WiktapiFormObject[]
  synonyms?: Array<string | WiktapiRelatedWordObject>
}

interface WiktapiResponse {
  word?: string
  edition?: string
  entries?: WiktapiEntry[]
}

const cache = new Map<string, Promise<DictionaryLookupResult | null>>()
const languageNames = new Map(LANGUAGES.map((language) => [language.code, language.name]))

function uniqueWords(words: string[]) {
  const seen = new Set<string>()
  return words.filter((word) => {
    const normalized = word.trim()
    if (!normalized) return false
    const key = normalized.toLocaleLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getLanguageName(code: string) {
  return languageNames.get(code) ?? code.toUpperCase()
}

function normalizeExamples(examples: Array<string | WiktapiExampleObject> | undefined) {
  return (examples ?? [])
    .map((example) => typeof example === 'string' ? example : example.text ?? '')
    .filter(Boolean)
    .slice(0, 2)
}

function normalizeRelatedWords(words: Array<string | WiktapiRelatedWordObject> | undefined) {
  return uniqueWords((words ?? [])
    .map((item) => typeof item === 'string' ? item : item.word ?? '')
    .filter(Boolean))
}

function normalizeFreeDictionaryEntries(payload: FreeDictionaryResponse): DictionaryEntry[] {
  return (payload.entries ?? [])
    .map((entry) => {
      const pronunciation = entry.pronunciations?.find((item) => item.text)?.text
      const entrySynonyms = uniqueWords(entry.synonyms ?? [])
      const senses = (entry.senses ?? [])
        .filter((sense) => Boolean(sense.definition))
        .slice(0, 4)
        .map((sense) => ({
          definition: sense.definition ?? '',
          examples: (sense.examples ?? []).filter(Boolean).slice(0, 2),
          synonyms: uniqueWords(sense.synonyms ?? []).slice(0, 8),
          translations: (sense.translations ?? [])
            .filter((translation) => translation.word && translation.language?.code)
            .slice(0, 12)
            .map((translation) => ({
              languageCode: translation.language?.code ?? '',
              languageName: translation.language?.name ?? '',
              word: translation.word ?? '',
            })),
        }))

      return {
        languageCode: entry.language?.code ?? '',
        languageName: entry.language?.name ?? '',
        partOfSpeech: entry.partOfSpeech ?? '',
        pronunciation,
        synonyms: entrySynonyms,
        forms: [],
        senses,
      }
    })
    .filter((entry) => entry.senses.length > 0)
}

function normalizeWiktapiEntries(payload: WiktapiResponse): DictionaryEntry[] {
  return (payload.entries ?? [])
    .map((entry) => {
      const pronunciation = entry.sounds?.find((sound) => sound.ipa)?.ipa
      const entrySynonyms = normalizeRelatedWords(entry.synonyms)
      const forms = (entry.forms ?? [])
        .map((form) => ({
          word: form.form ?? form.word ?? '',
          tags: form.tags ?? [],
        }))
        .filter((form) => Boolean(form.word))
        .slice(0, 8)
      const entryTranslations = (entry.translations ?? [])
        .filter((translation) => translation.word && translation.lang_code)
        .map((translation) => ({
          languageCode: translation.lang_code ?? '',
          languageName: translation.lang ?? '',
          word: translation.word ?? '',
          senseIndex: translation.sense_index == null ? '' : String(translation.sense_index),
        }))
      const senses = (entry.senses ?? [])
        .filter((sense) => (sense.glosses ?? []).length > 0)
        .slice(0, 4)
        .map((sense, index) => {
          const senseIndex = sense.sense_index == null ? '' : String(sense.sense_index)
          const genericTranslations = index === 0
            ? entryTranslations.filter((translation) => !translation.senseIndex)
            : []
          const matchedTranslations = entryTranslations.filter((translation) =>
            translation.senseIndex && translation.senseIndex === senseIndex,
          )
          return {
            definition: (sense.glosses ?? []).join(' ').trim(),
            examples: normalizeExamples(sense.examples),
            synonyms: normalizeRelatedWords(sense.synonyms).slice(0, 8),
            translations: [...genericTranslations, ...matchedTranslations]
              .slice(0, 12)
              .map(({ languageCode, languageName, word }) => ({ languageCode, languageName, word })),
          }
        })

      return {
        languageCode: entry.lang_code ?? '',
        languageName: entry.lang ?? '',
        partOfSpeech: entry.pos ?? '',
        pronunciation,
        synonyms: entrySynonyms,
        forms,
        senses,
      }
    })
    .filter((entry) => entry.senses.length > 0)
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url)
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Dictionary lookup failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

async function fetchWiktapiEntries({
  edition,
  word,
  queryLang,
}: {
  edition: string
  word: string
  queryLang: string
}) {
  const payload = await fetchJson<WiktapiResponse>(
    `${WIKTAPI_API}/${encodeURIComponent(edition)}/word/${encodeURIComponent(word)}?lang=${encodeURIComponent(queryLang)}`,
  )
  if (!payload) return null

  const result: DictionaryLookupResult = {
    queryWord: payload.word ?? word,
    queryLang,
    definitionLanguageCode: edition,
    definitionLanguageName: getLanguageName(edition),
    entries: normalizeWiktapiEntries(payload),
    sources: [
      { id: 'wiktapi', label: 'Wiktapi', url: 'https://wiktapi.dev/' },
      { id: 'wiktionary', label: `${edition}.wiktionary.org`, url: `https://${edition}.wiktionary.org/wiki/${encodeURIComponent(payload.word ?? word)}` },
    ],
    sourceUrl: `https://${edition}.wiktionary.org/wiki/${encodeURIComponent(payload.word ?? word)}`,
    sourceLicenseName: 'CC BY-SA',
    sourceLicenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  }

  return result.entries.length > 0 ? result : null
}

async function fetchFreeDictionaryEntries(language: string, word: string) {
  const payload = await fetchJson<FreeDictionaryResponse>(
    `${FREE_DICTIONARY_API}/${encodeURIComponent(language)}/${encodeURIComponent(word)}?translations=true`,
  )
  if (!payload) return null

  const result: DictionaryLookupResult = {
    queryWord: payload.word ?? word,
    queryLang: language,
    definitionLanguageCode: 'en',
    definitionLanguageName: getLanguageName('en'),
    entries: normalizeFreeDictionaryEntries(payload),
    sources: [
      { id: 'freedictionaryapi', label: 'FreeDictionaryAPI.com', url: 'https://freedictionaryapi.com/' },
      ...(payload.source?.url ? [{ id: 'wiktionary', label: 'en.wiktionary.org', url: payload.source.url }] : []),
    ],
    sourceUrl: payload.source?.url,
    sourceLicenseName: payload.source?.license?.name,
    sourceLicenseUrl: payload.source?.license?.url,
  }

  return result.entries.length > 0 ? result : null
}

function buildLookupPlan({
  englishWord,
  targetWord,
  targetLang,
}: {
  englishWord: string
  targetWord: string
  targetLang: string
}) {
  const plan: Array<() => Promise<DictionaryLookupResult | null>> = []
  const seen = new Set<string>()
  const cleanTargetWord = targetWord.trim()
  const cleanEnglishWord = englishWord.trim()
  const pushLookup = (key: string, lookup: () => Promise<DictionaryLookupResult | null>) => {
    if (seen.has(key)) return
    seen.add(key)
    plan.push(lookup)
  }

  if (cleanTargetWord) {
    if (WIKTAPI_EDITIONS.has(targetLang)) {
      pushLookup(`wiktapi:${targetLang}:${targetLang}:${cleanTargetWord}`, () => fetchWiktapiEntries({
        edition: targetLang,
        word: cleanTargetWord,
        queryLang: targetLang,
      }))
    }

    pushLookup(`wiktapi:en:${targetLang}:${cleanTargetWord}`, () => fetchWiktapiEntries({
      edition: 'en',
      word: cleanTargetWord,
      queryLang: targetLang,
    }))

    pushLookup(`freedictionary:${targetLang}:${cleanTargetWord}`, () => fetchFreeDictionaryEntries(targetLang, cleanTargetWord))
  }

  if (cleanEnglishWord) {
    pushLookup(`wiktapi:en:en:${cleanEnglishWord}`, () => fetchWiktapiEntries({
      edition: 'en',
      word: cleanEnglishWord,
      queryLang: 'en',
    }))
    pushLookup(`freedictionary:en:${cleanEnglishWord}`, () => fetchFreeDictionaryEntries('en', cleanEnglishWord))
  }

  return plan
}

async function resolveDictionaryLookup({
  englishWord,
  targetWord,
  targetLang,
}: {
  englishWord: string
  targetWord: string
  targetLang: string
}) {
  for (const lookup of buildLookupPlan({ englishWord, targetWord, targetLang })) {
    const result = await lookup()
    if (result) return result
  }
  return null
}

export async function lookupCardDictionary({
  englishWord,
  targetWord,
  targetLang,
}: {
  englishWord: string
  targetWord: string
  targetLang: string
}) {
  const cacheKey = [targetLang, targetWord.trim().toLocaleLowerCase(), englishWord.trim().toLocaleLowerCase()].join(':')
  if (!cache.has(cacheKey)) {
    const lookupPromise = resolveDictionaryLookup({ englishWord, targetWord, targetLang })
      .catch((error) => {
        cache.delete(cacheKey)
        throw error
      })
    cache.set(cacheKey, lookupPromise)
  }

  return cache.get(cacheKey) ?? null
}
