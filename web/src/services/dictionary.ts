const API = 'https://freedictionaryapi.com/api/v1/entries'

export interface DictionarySense {
  definition: string
  examples: string[]
  synonyms: string[]
  translations: Array<{
    languageCode: string
    languageName: string
    word: string
  }>
}

export interface DictionaryEntry {
  languageCode: string
  languageName: string
  partOfSpeech: string
  pronunciation?: string
  senses: DictionarySense[]
}

export interface DictionaryLookupResult {
  queryWord: string
  queryLang: string
  entries: DictionaryEntry[]
  sourceUrl?: string
  sourceLicenseName?: string
  sourceLicenseUrl?: string
}

interface ApiSense {
  definition?: string
  examples?: string[]
  synonyms?: string[]
  translations?: Array<{
    language?: { code?: string; name?: string }
    word?: string
  }>
}

interface ApiEntry {
  language?: { code?: string; name?: string }
  partOfSpeech?: string
  pronunciations?: Array<{ text?: string }>
  senses?: ApiSense[]
}

interface ApiResponse {
  word?: string
  entries?: ApiEntry[]
  source?: {
    url?: string
    license?: {
      name?: string
      url?: string
    }
  }
}

const cache = new Map<string, DictionaryLookupResult | null>()

function normalizeEntries(payload: ApiResponse): DictionaryEntry[] {
  return (payload.entries ?? [])
    .map((entry) => {
      const pronunciation = entry.pronunciations?.find((item) => item.text)?.text
      const senses = (entry.senses ?? [])
        .filter((sense) => Boolean(sense.definition))
        .slice(0, 3)
        .map((sense) => ({
          definition: sense.definition ?? '',
          examples: (sense.examples ?? []).slice(0, 2),
          synonyms: (sense.synonyms ?? []).slice(0, 5),
          translations: (sense.translations ?? [])
            .filter((translation) => translation.word && translation.language?.code)
            .slice(0, 8)
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
        senses,
      }
    })
    .filter((entry) => entry.senses.length > 0)
}

async function fetchEntries(language: string, word: string) {
  const cacheKey = `${language}:${word.trim().toLowerCase()}`
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null

  const response = await fetch(`${API}/${encodeURIComponent(language)}/${encodeURIComponent(word)}?translations=true`)
  if (response.status === 404) {
    cache.set(cacheKey, null)
    return null
  }
  if (!response.ok) {
    throw new Error(`Dictionary lookup failed: ${response.status}`)
  }

  const payload = await response.json() as ApiResponse
  const result: DictionaryLookupResult = {
    queryWord: payload.word ?? word,
    queryLang: language,
    entries: normalizeEntries(payload),
    sourceUrl: payload.source?.url,
    sourceLicenseName: payload.source?.license?.name,
    sourceLicenseUrl: payload.source?.license?.url,
  }

  const normalizedResult = result.entries.length > 0 ? result : null
  cache.set(cacheKey, normalizedResult)
  return normalizedResult
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
  const primary = targetWord.trim() ? await fetchEntries(targetLang, targetWord) : null
  if (primary) return primary
  return fetchEntries('en', englishWord)
}
