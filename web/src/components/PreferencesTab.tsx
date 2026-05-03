import type { ReactNode } from 'react'
import { InterfaceLanguagePicker } from './InterfaceLanguagePicker.tsx'
import { LanguagePicker } from './LanguagePicker.tsx'
import { t } from '../services/i18n.ts'
import type { Settings, ThemePreference, FontSizePreference, MotionPreference, SurfacePreference, PracticeInputMode, DictionaryViewPreference } from '../services/settings.ts'

export function PreferencesTab({
  settings,
  update,
}: {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}) {
  const tt = (key: Parameters<typeof t>[1]) => t(settings.interfaceLang, key)

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--glass-strong)] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="space-y-5">
          {/* Interface language — first so non-English speakers can find it immediately */}
          <div className="flex items-center justify-between">
            <InterfaceLanguagePicker value={settings.interfaceLang} onChange={(interfaceLang) => update({ interfaceLang })} />
            <div className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">
              v{__BUILD_TIME__} ({__BUILD_HASH__})
            </div>
          </div>

          <div>
            <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--accent-deep)]">{tt('preferences')}</div>
            <h3 className="display-font mt-2 text-3xl leading-none text-[var(--ink)]">{tt('preferencesHeading')}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              {tt('preferencesBody')}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SettingsPanel title={tt('languageDefaults')} description={tt('languageDefaultsDesc')}>
              <div className="grid gap-3">
                <LanguagePicker label={tt('nativeLanguage')} value={settings.nativeLang} onChange={(code) => update({ nativeLang: code })} />
                <LanguagePicker label={tt('targetLanguage')} value={settings.targetLang} onChange={(code) => update({ targetLang: code })} />
              </div>
            </SettingsPanel>

            <SettingsPanel title={tt('theme')} description={tt('themeDesc')}>
              <ChoiceGrid<ThemePreference>
                value={settings.theme}
                onChange={(theme) => update({ theme })}
                options={[
                  { value: 'system', label: tt('system'), detail: tt('matchDeviceAppearance') },
                  { value: 'light', label: tt('light'), detail: tt('warmPaperStudio') },
                  { value: 'dark', label: tt('dark'), detail: tt('lowGlareNightMode') },
                ]}
              />
            </SettingsPanel>

            <SettingsPanel title={tt('labelSize')} description={tt('labelSizeDesc')}>
              <ChoiceGrid<FontSizePreference>
                value={settings.labelSize}
                onChange={(labelSize) => update({ labelSize })}
                options={[
                  { value: 'small', label: tt('small'), detail: tt('compactUi') },
                  { value: 'medium', label: tt('medium'), detail: tt('default') },
                  { value: 'large', label: tt('large'), detail: tt('biggerLabels') },
                  { value: 'xlarge', label: tt('xl'), detail: tt('maximum') },
                ]}
              />
            </SettingsPanel>

            <SettingsPanel title={tt('contentSize')} description={tt('contentSizeDesc')}>
              <ChoiceGrid<FontSizePreference>
                value={settings.contentSize}
                onChange={(contentSize) => update({ contentSize })}
                options={[
                  { value: 'small', label: tt('small'), detail: tt('moreFitsOnScreen') },
                  { value: 'medium', label: tt('medium'), detail: tt('default') },
                  { value: 'large', label: tt('large'), detail: tt('easierToRead') },
                  { value: 'xlarge', label: tt('xl'), detail: tt('maximumComfort') },
                ]}
              />
            </SettingsPanel>

            <SettingsPanel title={tt('motion')} description={tt('motionDesc')}>
              <ChoiceGrid<MotionPreference>
                value={settings.motion}
                onChange={(motion) => update({ motion })}
                options={[
                  { value: 'full', label: tt('full'), detail: tt('standardMotionFeedback') },
                  { value: 'reduced', label: tt('reduced'), detail: tt('lessAnimationPulse') },
                ]}
              />
            </SettingsPanel>

            <SettingsPanel title={tt('surfaceStyle')} description={tt('surfaceStyleDesc')}>
              <ChoiceGrid<SurfacePreference>
                value={settings.surface}
                onChange={(surface) => update({ surface })}
                options={[
                  { value: 'soft', label: tt('soft'), detail: tt('gentlerLayers') },
                  { value: 'bold', label: tt('bold'), detail: tt('strongerPanelSeparation') },
                ]}
              />
            </SettingsPanel>

            <SettingsPanel title={tt('flashcardAudio')} description={tt('flashcardAudioDesc')}>
              <ChoiceGrid<'on' | 'off'>
                value={settings.flashcardAudio ? 'on' : 'off'}
                onChange={(flashcardAudio) => update({ flashcardAudio: flashcardAudio === 'on' })}
                options={[
                  { value: 'on', label: tt('on'), detail: tt('speakCardsImmediately') },
                  { value: 'off', label: tt('off'), detail: tt('keepCardsSilent') },
                ]}
              />
            </SettingsPanel>

            <SettingsPanel title={tt('cardMode')} description={tt('cardModeDesc')}>
              <ChoiceGrid<PracticeInputMode>
                value={settings.flashcardInputMode}
                onChange={(flashcardInputMode) => update({ flashcardInputMode })}
                options={[
                  { value: 'keyboard', label: tt('keyboard'), detail: tt('swipeTapArrowKeys') },
                  { value: 'speak', label: tt('speak'), detail: tt('repeatAnswerAutoAdvance') },
                ]}
              />
            </SettingsPanel>

            <SettingsPanel title={tt('sentenceMode')} description={tt('sentenceModeDesc')}>
              <ChoiceGrid<PracticeInputMode>
                value={settings.sentenceInputMode}
                onChange={(sentenceInputMode) => update({ sentenceInputMode })}
                options={[
                  { value: 'keyboard', label: tt('keyboard'), detail: tt('tapNextHoldRecord') },
                  { value: 'speak', label: tt('speak'), detail: tt('promptListenScoreMoveOn') },
                ]}
              />
            </SettingsPanel>

            <SettingsPanel title={tt('dictionaryView')} description={tt('dictionaryViewDesc')}>
              <ChoiceGrid<DictionaryViewPreference>
                value={settings.dictionaryDefaultView}
                onChange={(dictionaryDefaultView) => update({ dictionaryDefaultView })}
                options={[
                  { value: 'dictionary', label: tt('definitionView'), detail: tt('showDefinitionsExamples') },
                  { value: 'thesaurus', label: tt('thesaurusView'), detail: tt('showSynonymsRelatedWords') },
                  { value: 'translation', label: tt('translationView'), detail: tt('showTranslationsFirst') },
                ]}
              />
            </SettingsPanel>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-[1.5rem] border border-[var(--line)] p-4 shadow-[var(--shadow-card)]" style={{ background: 'var(--panel-gradient)' }}>
          <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">{tt('liveSummary')}</div>
          <div className="mt-4 space-y-3">
            <PreferenceStat label={tt('theme')} value={settings.theme} />
            <PreferenceStat label={tt('labels')} value={settings.labelSize} />
            <PreferenceStat label={tt('contentSize')} value={settings.contentSize} />
            <PreferenceStat label={tt('flashcardAudio')} value={settings.flashcardAudio ? tt('on') : tt('off')} />
            <PreferenceStat label={tt('cardMode')} value={settings.flashcardInputMode === 'speak' ? tt('speak') : tt('keyboard')} />
            <PreferenceStat label={tt('sentenceMode')} value={settings.sentenceInputMode === 'speak' ? tt('speak') : tt('keyboard')} />
            <PreferenceStat label={tt('dictionaryView')} value={tt(({
              dictionary: 'definitionView',
              thesaurus: 'thesaurusView',
              translation: 'translationView',
            } as const)[settings.dictionaryDefaultView])} />
          </div>
        </div>

        <a
          href="https://prolanguageapp.pages.dev"
          target="_blank"
          rel="noopener"
          className="block rounded-[1.5rem] border border-[var(--accent-soft)] p-4 shadow-[var(--shadow-card)]"
          style={{ background: 'var(--accent-gradient)' }}
        >
          <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--accent-deep)]">{tt('upgradeToPro')}</div>
          <div className="mt-2 text-sm font-semibold text-[var(--ink)]">{tt('aiTranslationConversationTts')}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">prolanguageapp.online</div>
        </a>
      </aside>
    </div>
  )
}

function SettingsPanel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--panel-quiet)] p-4">
      <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{title}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function PreferenceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--glass)] p-4">
      <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-sm font-semibold capitalize text-[var(--ink)]">{value}</div>
    </div>
  )
}

function ChoiceGrid<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string; detail: string }>
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            className={`rounded-[1.1rem] border px-4 py-3 text-left ${
              active
                ? 'border-[var(--accent-soft)] shadow-[var(--shadow-card)]'
                : 'border-[var(--line)] bg-[var(--glass)] hover:bg-[var(--glass-hover)]'
            }`}
            style={active ? { background: 'var(--accent-gradient)' } : undefined}
            onClick={() => onChange(option.value)}
          >
            <div className="text-sm font-semibold text-[var(--ink)]">{option.label}</div>
            <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{option.detail}</div>
          </button>
        )
      })}
    </div>
  )
}
