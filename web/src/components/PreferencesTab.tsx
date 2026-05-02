import type { ReactNode } from 'react'
import { LanguagePicker } from './LanguagePicker.tsx'
import type { Settings, ThemePreference, FontSizePreference, MotionPreference, SurfacePreference } from '../services/settings.ts'

export function PreferencesTab({
  settings,
  update,
}: {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--glass-strong)] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="space-y-5">
          <div>
            <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--accent-deep)]">Preferences</div>
            <h3 className="display-font mt-2 text-3xl leading-none text-[var(--ink)]">Tune the app to how you read and practice.</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Appearance settings apply instantly and persist locally on this device. Language defaults stay here too, so the practice surface and the preferences live in one place.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SettingsPanel title="Language defaults" description="Choose the pair that opens across the app.">
              <div className="grid gap-3">
                <LanguagePicker label="Native language" value={settings.nativeLang} onChange={(code) => update({ nativeLang: code })} />
                <LanguagePicker label="Target language" value={settings.targetLang} onChange={(code) => update({ targetLang: code })} />
              </div>
            </SettingsPanel>

            <SettingsPanel title="Theme" description="Keep the warm paper look, go dark, or follow the system.">
              <ChoiceGrid<ThemePreference>
                value={settings.theme}
                onChange={(theme) => update({ theme })}
                options={[
                  { value: 'system', label: 'System', detail: 'Match device appearance' },
                  { value: 'light', label: 'Light', detail: 'Warm paper studio' },
                  { value: 'dark', label: 'Dark', detail: 'Low-glare night mode' },
                ]}
              />
            </SettingsPanel>

            <SettingsPanel title="Label size" description="Size of navigation, buttons, and UI labels.">
              <ChoiceGrid<FontSizePreference>
                value={settings.labelSize}
                onChange={(labelSize) => update({ labelSize })}
                options={[
                  { value: 'small', label: 'Small', detail: 'Compact UI' },
                  { value: 'medium', label: 'Medium', detail: 'Default' },
                  { value: 'large', label: 'Large', detail: 'Bigger labels' },
                  { value: 'xlarge', label: 'XL', detail: 'Maximum' },
                ]}
              />
            </SettingsPanel>

            <SettingsPanel title="Content size" description="Size of words, answers, and card text.">
              <ChoiceGrid<FontSizePreference>
                value={settings.contentSize}
                onChange={(contentSize) => update({ contentSize })}
                options={[
                  { value: 'small', label: 'Small', detail: 'More fits on screen' },
                  { value: 'medium', label: 'Medium', detail: 'Default' },
                  { value: 'large', label: 'Large', detail: 'Easier to read' },
                  { value: 'xlarge', label: 'XL', detail: 'Maximum comfort' },
                ]}
              />
            </SettingsPanel>

            <SettingsPanel title="Motion" description="Reduce animated movement if you want a calmer interface.">
              <ChoiceGrid<MotionPreference>
                value={settings.motion}
                onChange={(motion) => update({ motion })}
                options={[
                  { value: 'full', label: 'Full', detail: 'Standard motion and feedback' },
                  { value: 'reduced', label: 'Reduced', detail: 'Less animation and pulse' },
                ]}
              />
            </SettingsPanel>

            <SettingsPanel title="Surface style" description="Adjust how bold the panels and contrast feel.">
              <ChoiceGrid<SurfacePreference>
                value={settings.surface}
                onChange={(surface) => update({ surface })}
                options={[
                  { value: 'soft', label: 'Soft', detail: 'Gentler layers' },
                  { value: 'bold', label: 'Bold', detail: 'Stronger panel separation' },
                ]}
              />
            </SettingsPanel>

            <SettingsPanel title="Flashcard audio" description="Auto-pronounce each shown card and allow quick replay.">
              <ChoiceGrid<'on' | 'off'>
                value={settings.flashcardAudio ? 'on' : 'off'}
                onChange={(flashcardAudio) => update({ flashcardAudio: flashcardAudio === 'on' })}
                options={[
                  { value: 'on', label: 'On', detail: 'Speak cards immediately' },
                  { value: 'off', label: 'Off', detail: 'Keep cards silent by default' },
                ]}
              />
            </SettingsPanel>
          </div>
        </div>
      </section>

      <aside className="rounded-[1.5rem] border border-[var(--line)] p-4 shadow-[var(--shadow-card)]" style={{ background: 'var(--panel-gradient)' }}>
        <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Live summary</div>
        <div className="mt-4 space-y-3">
          <PreferenceStat label="Theme" value={settings.theme} />
          <PreferenceStat label="Labels" value={settings.labelSize} />
          <PreferenceStat label="Content" value={settings.contentSize} />
          <PreferenceStat label="Motion" value={settings.motion} />
          <PreferenceStat label="Surface" value={settings.surface} />
          <PreferenceStat label="Card audio" value={settings.flashcardAudio ? 'on' : 'off'} />
        </div>
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
