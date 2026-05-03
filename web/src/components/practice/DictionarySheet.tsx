import { useState } from 'react'
import { X } from 'lucide-react'
import { t } from '../../services/i18n.ts'
import type { DictionaryViewPreference } from '../../services/settings.ts'
import type { DictionaryLookupResult } from '../../services/dictionary.ts'

type DictionaryStatus = 'idle' | 'loading' | 'ready' | 'error'

export function DictionarySheet({
  uiLang,
  displayText,
  translit,
  targetLang,
  nativeMeaning,
  nativeLang,
  defaultView,
  status,
  data,
  error,
  onClose,
}: {
  uiLang: string
  displayText: string
  translit?: string
  targetLang: string
  nativeMeaning: string
  nativeLang: string
  defaultView: DictionaryViewPreference
  status: DictionaryStatus
  data: DictionaryLookupResult | null
  error: string | null
  onClose: () => void
}) {
  const [view, setView] = useState<DictionaryViewPreference>(defaultView)

  const thesaurusItems = data?.entries.flatMap((entry) => [
    ...entry.synonyms,
    ...entry.senses.flatMap((sense) => sense.synonyms),
  ]) ?? []
  const uniqueSynonyms = [...new Set(thesaurusItems)].filter(Boolean).slice(0, 18)
  const formItems = data?.entries.flatMap((entry) => entry.forms) ?? []
  const uniqueForms = [...new Map(
    formItems.map((form) => [`${form.word}:${form.tags.join(',')}`, form]),
  ).values()]
  const translationItems = data?.entries.flatMap((entry) =>
    entry.senses.flatMap((sense) =>
      sense.translations.filter((translation) =>
        translation.languageCode === nativeLang || translation.languageCode === 'en',
      ),
    ),
  ) ?? []
  const uniqueTranslations = [...new Map(
    translationItems.map((translation) => [`${translation.languageCode}:${translation.word}`, translation]),
  ).values()]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-2 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-[1.5rem] border border-[var(--line-strong)] bg-[var(--panel-strong)] shadow-[var(--shadow-soft)] backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="display-font truncate text-2xl text-[var(--ink)]">{displayText}</div>
            {translit && <div className="truncate text-sm italic text-[var(--muted)]">{translit}</div>}
            <div className="mt-1 text-sm text-[var(--muted)]">{nativeMeaning}</div>
          </div>
          <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--glass)] text-[var(--muted)]" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="max-h-[70dvh] space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--glass)] p-1">
            {([
              ['dictionary', t(uiLang, 'definitionView')],
              ['thesaurus', t(uiLang, 'thesaurusView')],
              ['translation', t(uiLang, 'translationView')],
            ] as const).map(([key, label]) => (
              <button key={key} className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] ${view === key ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--muted)]'}`} onClick={() => setView(key)}>{label}</button>
            ))}
          </div>

          {status === 'loading' && <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm text-[var(--muted)]">{t(uiLang, 'loadingMeaning')}</div>}
          {status === 'error' && <div className="rounded-[1rem] border border-[var(--error)]/20 bg-[var(--error)]/6 px-4 py-3 text-sm text-[var(--error)]">{error ?? t(uiLang, 'meaningUnavailable')}</div>}
          {status === 'ready' && !data && <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm text-[var(--muted)]">{t(uiLang, 'meaningUnavailable')}</div>}
          {status === 'ready' && data && data.definitionLanguageCode !== targetLang && (
            <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--panel-quiet)] px-4 py-3 text-sm text-[var(--muted)]">
              <span className="font-semibold text-[var(--ink)]">{t(uiLang, 'definitionLanguage')}:</span> {data.definitionLanguageName}
            </div>
          )}

          {view === 'dictionary' && data?.entries.map((entry, index) => (
            <div key={`${entry.languageCode}-${entry.partOfSpeech}-${index}`} className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--glass)] p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-deep)]">{entry.partOfSpeech || entry.languageName || data.queryWord}</span>
                {entry.pronunciation && <span className="text-sm text-[var(--muted)]">{entry.pronunciation}</span>}
                {entry.languageName && entry.languageCode !== targetLang && (
                  <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{entry.languageCode}</span>
                )}
              </div>
              {entry.forms.length > 0 && (
                <div className="mt-3">
                  <div className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{t(uiLang, 'wordForms')}</div>
                  <div className="flex flex-wrap gap-2">
                    {entry.forms.map((form) => <span key={`${form.word}-${form.tags.join('-')}`} className="rounded-full border border-[var(--line)] bg-[var(--panel-quiet)] px-3 py-1.5 text-sm text-[var(--ink)]">{form.word}</span>)}
                  </div>
                </div>
              )}
              <div className="mt-3 space-y-3">
                {entry.senses.map((sense, si) => (
                  <div key={`${entry.partOfSpeech}-${si}`} className="space-y-1.5">
                    <div className="text-sm leading-6 text-[var(--ink)]"><span className="mr-2 text-[var(--muted)]">{si + 1}.</span>{sense.definition}</div>
                    {sense.examples.length > 0 && (
                      <div className="rounded-[0.85rem] bg-[var(--panel-quiet)] px-3 py-2 text-xs text-[var(--muted)]">
                        <span className="mr-2 font-semibold text-[var(--ink)]">{t(uiLang, 'examples')}:</span>{sense.examples.join('  ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {view === 'dictionary' && status === 'ready' && data && data.entries.length === 0 && (
            <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm text-[var(--muted)]">{t(uiLang, 'dictionaryEmpty')}</div>
          )}

          {view === 'thesaurus' && (uniqueSynonyms.length > 0 || uniqueForms.length > 0 ? (
            <div className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--glass)] p-4">
              {uniqueSynonyms.length > 0 && (
                <>
                  <div className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-deep)]">{t(uiLang, 'synonyms')}</div>
                  <div className="flex flex-wrap gap-2">{uniqueSynonyms.map((s) => <span key={s} className="rounded-full border border-[var(--line)] bg-[var(--panel-quiet)] px-3 py-1.5 text-sm text-[var(--ink)]">{s}</span>)}</div>
                </>
              )}
              {uniqueForms.length > 0 && (
                <div className={uniqueSynonyms.length > 0 ? 'mt-4' : ''}>
                  <div className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-deep)]">{t(uiLang, 'wordForms')}</div>
                  <div className="flex flex-wrap gap-2">{uniqueForms.map((f) => <span key={`${f.word}-${f.tags.join('-')}`} className="rounded-full border border-[var(--line)] bg-[var(--panel-quiet)] px-3 py-1.5 text-sm text-[var(--ink)]">{f.word}</span>)}</div>
                </div>
              )}
            </div>
          ) : status === 'ready' && <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm text-[var(--muted)]">{t(uiLang, 'thesaurusEmpty')}</div>)}

          {view === 'translation' && (
            <div className="space-y-3">
              <div className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--glass)] p-4">
                <div className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-deep)]">{t(uiLang, 'translationView')}</div>
                <div className="mt-3 flex items-center justify-between gap-4 rounded-[0.9rem] bg-[var(--panel-quiet)] px-4 py-3">
                  <span className="display-font text-lg text-[var(--ink)]">{displayText}</span>
                  <span className="text-sm font-semibold text-[var(--muted)]">{nativeMeaning}</span>
                </div>
              </div>
              {uniqueTranslations.length > 0 ? (
                <div className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--glass)] p-4">
                  <div className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-deep)]">{t(uiLang, 'otherTranslations')}</div>
                  <div className="space-y-2">
                    {uniqueTranslations.map((tr) => (
                      <div key={`${tr.languageCode}-${tr.word}`} className="flex items-center justify-between gap-3 rounded-[0.85rem] bg-[var(--panel-quiet)] px-3 py-2">
                        <span className="text-sm text-[var(--ink)]">{tr.word}</span>
                        <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{tr.languageName || tr.languageCode}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : status === 'ready' && <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm text-[var(--muted)]">{t(uiLang, 'translationEmpty')}</div>}
            </div>
          )}

          <div className="text-xs text-[var(--muted)]">
            {t(uiLang, 'dictionarySource')}:{' '}
            {(data?.sources ?? [{ id: 'freedictionaryapi', label: 'FreeDictionaryAPI.com', url: 'https://freedictionaryapi.com/' }]).map((source, index) => (
              <span key={source.id}>{index > 0 && ' · '}<a className="font-semibold text-[var(--accent)] underline" href={source.url} target="_blank" rel="noreferrer">{source.label}</a></span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
