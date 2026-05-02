import { useState, useCallback } from 'react'
import { speech } from '../services/speech.ts'
import { useSpeech } from '../hooks.ts'
import { MicButton } from './MicButton.tsx'
import { LANGUAGES, type Message } from '../types.ts'

type ActiveMic = 'native' | 'target' | null

export function TranslateTab({ nativeLang, targetLang }: { nativeLang: string; targetLang: string }) {
  const sp = useSpeech()
  const [messages, setMessages] = useState<Message[]>([])
  const [activeMic, setActiveMic] = useState<ActiveMic>(null)

  const nativeLanguage = LANGUAGES.find((lang) => lang.code === nativeLang)
  const targetLanguage = LANGUAGES.find((lang) => lang.code === targetLang)

  const addMessage = useCallback((text: string, speaker: 'user' | 'other', lang: string) => {
    const isNative = lang === nativeLang
    const translation = isNative ? `[${targetLang}] ${text}` : `[${nativeLang}] ${text}`

    const message: Message = {
      id: Date.now().toString(),
      text,
      translation,
      speaker,
      lang,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, message])
  }, [nativeLang, targetLang])

  const handleStartNative = useCallback(() => {
    setActiveMic('native')
    speech.startListening(nativeLang, (text) => {
      addMessage(text, 'user', nativeLang)
      setActiveMic(null)
    })
  }, [nativeLang, addMessage])

  const handleStartTarget = useCallback(() => {
    setActiveMic('target')
    speech.startListening(targetLang, (text) => {
      addMessage(text, 'other', targetLang)
      setActiveMic(null)
    })
  }, [targetLang, addMessage])

  const handleRelease = useCallback(() => {
    speech.stopListening()
    setActiveMic(null)
  }, [])

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--glass-strong)] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="flex h-full flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--accent-deep)]">Live exchange</div>
              <h3 className="display-font mt-2 text-3xl leading-none text-[var(--ink)]">Two speakers, one shared thread.</h3>
            </div>
            <div className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-4 py-2 text-sm font-semibold text-[var(--muted)]">
              Pass the phone when needed
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SpeakerCard title="You" subtitle={nativeLanguage?.name ?? nativeLang} flag={nativeLanguage?.flag ?? ''} accent="var(--accent)" active={activeMic === 'native'} />
            <SpeakerCard title="Them" subtitle={targetLanguage?.name ?? targetLang} flag={targetLanguage?.flag ?? ''} accent="var(--sky)" active={activeMic === 'target'} />
          </div>

          <div className="min-h-[19rem] flex-1 space-y-3 overflow-y-auto rounded-[1.4rem] border border-[var(--line)] bg-[var(--panel-quiet)] p-4">
            {messages.length === 0 && (
              <div className="rounded-[1.2rem] border border-dashed border-[var(--line)] bg-[var(--glass-soft)] px-4 py-8 text-center text-sm leading-6 text-[var(--muted)]">
                Start a real conversation. Use the left mic for your language and the right mic for theirs.
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className={`flex flex-col ${message.speaker === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[88%] rounded-[1.3rem] px-4 py-3 text-sm leading-6 shadow-[var(--shadow-card)] ${
                  message.speaker === 'user'
                    ? 'bg-[var(--ink)] text-[var(--paper)]'
                    : 'border border-[var(--line)] bg-[var(--glass)] text-[var(--ink)]'
                }`}>
                  {message.text}
                </div>
                {message.translation && (
                  <div className="mt-2 max-w-[88%] rounded-[1rem] bg-[var(--sky-soft)]/45 px-4 py-2 text-xs leading-5 text-[var(--sky-deep)]">
                    {message.translation}
                  </div>
                )}
              </div>
            ))}
          </div>

          {sp.isListening && sp.transcript && (
            <div className="rounded-full bg-[var(--glass)] px-4 py-2 text-center text-sm italic text-[var(--muted)]">
              “{sp.transcript}”
            </div>
          )}
        </div>
      </section>

      <aside className="rounded-[1.5rem] border border-[var(--line)] p-4 shadow-[var(--shadow-card)]" style={{ background: 'var(--mint-gradient)' }}>
        <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Mic controls</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <MicWell
            label="You speak"
            detail={`${nativeLanguage?.flag ?? ''} ${nativeLanguage?.name ?? nativeLang}`}
            listening={activeMic === 'native'}
            disabled={sp.isSpeaking || activeMic === 'target'}
            onPress={handleStartNative}
            onRelease={handleRelease}
          />
          <MicWell
            label="Other speaker"
            detail={`${targetLanguage?.flag ?? ''} ${targetLanguage?.name ?? targetLang}`}
            listening={activeMic === 'target'}
            disabled={sp.isSpeaking || activeMic === 'native'}
            onPress={handleStartTarget}
            onRelease={handleRelease}
          />
        </div>
      </aside>
    </div>
  )
}

function SpeakerCard({
  title,
  subtitle,
  flag,
  accent,
  active,
}: {
  title: string
  subtitle: string
  flag: string
  accent: string
  active: boolean
}) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--glass)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{title}</div>
          <div className="mt-1 text-sm font-semibold text-[var(--ink)]">{flag} {subtitle}</div>
        </div>
        <div
          className="h-3 w-3 rounded-full"
          style={{ background: active ? accent : 'rgba(111,101,93,0.35)' }}
        />
      </div>
    </div>
  )
}

function MicWell({
  label,
  detail,
  listening,
  disabled,
  onPress,
  onRelease,
}: {
  label: string
  detail: string
  listening: boolean
  disabled?: boolean
  onPress: () => void
  onRelease: () => void
}) {
  return (
    <div className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-5 text-center">
      <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--ink)]">{detail}</div>
      <div className="mt-4 flex justify-center">
        <MicButton listening={listening} disabled={disabled} onPress={onPress} onRelease={onRelease} />
      </div>
    </div>
  )
}
