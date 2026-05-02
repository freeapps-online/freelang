import { transliterate } from 'transliteration'

// Languages that use non-Latin scripts
const NON_LATIN = new Set(['ja', 'ko', 'zh', 'ru', 'uk', 'ar', 'hi'])

export function getTranslit(text: string, lang: string): string | null {
  if (!NON_LATIN.has(lang)) return null
  return transliterate(text)
}
