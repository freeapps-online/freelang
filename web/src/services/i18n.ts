import { LANGUAGES } from '../types.ts'
import en from '../locales/en.json'
import es from '../locales/es.json'
import fr from '../locales/fr.json'
import de from '../locales/de.json'
import it from '../locales/it.json'
import pt from '../locales/pt.json'
import ja from '../locales/ja.json'
import ko from '../locales/ko.json'
import zh from '../locales/zh.json'
import ru from '../locales/ru.json'
import ar from '../locales/ar.json'
import hi from '../locales/hi.json'
import tr from '../locales/tr.json'
import nl from '../locales/nl.json'
import pl from '../locales/pl.json'
import uk from '../locales/uk.json'

export type UiLocale = typeof UI_LANGUAGE_CODES[number]

export const UI_LANGUAGE_CODES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko',
  'zh', 'ru', 'ar', 'hi', 'tr', 'nl', 'pl', 'uk',
] as const

export const UI_LANGUAGES = LANGUAGES.filter((language) =>
  UI_LANGUAGE_CODES.includes(language.code as UiLocale),
)

export type TranslationKey = keyof typeof en

const MESSAGES: Record<UiLocale, Partial<Record<TranslationKey, string>>> = {
  en,
  es,
  fr,
  de,
  it,
  pt,
  ja,
  ko,
  zh,
  ru,
  ar,
  hi,
  tr,
  nl,
  pl,
  uk,
}

export function t(locale: string, key: TranslationKey): string {
  const resolved = UI_LANGUAGE_CODES.includes(locale as UiLocale) ? locale as UiLocale : 'en'
  return MESSAGES[resolved]?.[key] ?? en[key]
}
