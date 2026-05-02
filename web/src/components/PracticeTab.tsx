import { useState, useCallback } from 'react'
import { speech } from '../services/speech.ts'
import { useSpeech } from '../hooks.ts'
import { MicButton } from './MicButton.tsx'
import type { PracticeRound } from '../types.ts'

const RATING_LABELS = {
  good: { text: 'Great accent match', color: 'var(--success)' },
  close: { text: 'Close enough to refine', color: 'var(--warning)' },
  retry: { text: 'Listen once more and retry', color: 'var(--error)' },
} as const

const STEPS = [
  { key: 'say-native', label: '1. Speak naturally' },
  { key: 'listen-target', label: '2. Hear the translation' },
  { key: 'repeat-target', label: '3. Repeat the target phrase' },
  { key: 'rated', label: '4. Review the score' },
] as const

type Step = 'say-native' | 'listen-target' | 'repeat-target' | 'rated'

export function PracticeTab({ nativeLang, targetLang }: { nativeLang: string; targetLang: string }) {
  const sp = useSpeech()
  const [step, setStep] = useState<Step>('say-native')
  const [round, setRound] = useState<PracticeRound | null>(null)
  const [history, setHistory] = useState<PracticeRound[]>([])

  const handleNativeSpeech = useCallback((text: string) => {
    const translated = `[${targetLang}] ${text}`
    const newRound: PracticeRound = { original: text, translated }
    setRound(newRound)
    setStep('listen-target')

    speech.speak(translated, targetLang).then(() => {
      setStep('repeat-target')
    })
  }, [targetLang])

  const handleRepeatAttempt = useCallback((attempt: string) => {
    if (!round) return

    const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim()
    const expected = normalize(round.translated)
    const actual = normalize(attempt)
    const expectedWords = expected.split(' ')
    const actualWords = actual.split(' ')
    const matches = actualWords.filter((word) => expectedWords.includes(word)).length
    const ratio = expectedWords.length > 0 ? matches / expectedWords.length : 0

    let rating: PracticeRound['rating']
    if (ratio >= 0.8) rating = 'good'
    else if (ratio >= 0.4) rating = 'close'
    else rating = 'retry'

    const rated = { ...round, userAttempt: attempt, rating }
    setRound(rated)
    setHistory((prev) => [rated, ...prev])
    setStep('rated')
  }, [round])

  const reset = useCallback(() => {
    setRound(null)
    setStep('say-native')
  }, [])

  const retryListen = useCallback(() => {
    if (!round) return
    setStep('listen-target')
    speech.speak(round.translated, targetLang).then(() => {
      setStep('repeat-target')
    })
  }, [round, targetLang])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_19rem]">
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--glass-strong)] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--accent-deep)]">Practice flow</div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {STEPS.map((item) => {
                const active = item.key === step
                return (
                  <div
                    key={item.key}
                    className={`rounded-[1rem] border px-3 py-2.5 text-sm ${
                      active
                        ? 'border-[var(--accent-soft)] bg-[var(--accent-soft)]/45 text-[var(--ink)]'
                        : 'border-[var(--line)] bg-[var(--panel-quiet)] text-[var(--muted)]'
                    }`}
                  >
                    {item.label}
                  </div>
                )
              })}
            </div>
          </div>

          <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
            {step === 'say-native' && 'Start with your own phrase. Keep it natural and short.'}
            {step === 'listen-target' && 'The app is speaking the translated phrase back to you.'}
            {step === 'repeat-target' && 'Repeat what you just heard. Aim for rhythm and clarity first.'}
            {step === 'rated' && 'You have a result. Review it, replay it, or move on fast.'}
          </p>

          <div className="grid gap-3">
            <RoundCard title="You said" value={round?.original ?? 'Nothing captured yet. Hold the mic and say a phrase in your native language.'} />
            <RoundCard title="Target phrase" value={round?.translated ?? 'The translated phrase will appear here after your first take.'} accent />
            {round?.userAttempt && <RoundCard title="Your repeat" value={round.userAttempt} />}
          </div>

          <div className="rounded-[1.35rem] border border-[var(--line)] bg-[var(--warm-gradient)] px-4 py-5 text-center">
            <div className="mb-4 flex justify-center">
              <MicButton
                listening={sp.isListening}
                disabled={sp.isSpeaking || step === 'listen-target'}
                onPress={() => {
                  if (step === 'say-native') speech.startListening(nativeLang, handleNativeSpeech)
                  if (step === 'repeat-target') speech.startListening(targetLang, handleRepeatAttempt)
                }}
                onRelease={() => speech.stopListening()}
              />
            </div>
            <div className="text-sm font-semibold text-[var(--ink)]">
              {step === 'say-native' ? 'Hold to record your phrase' : step === 'repeat-target' ? 'Hold to repeat the target phrase' : 'Listening mode is locked while audio plays'}
            </div>
            {sp.isListening && sp.transcript && (
              <div className="mt-3 rounded-full bg-[var(--glass)] px-4 py-2 text-sm italic text-[var(--muted)]">
                “{sp.transcript}”
              </div>
            )}
          </div>

          {step === 'rated' && round?.rating && (
            <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-sm font-semibold" style={{ color: RATING_LABELS[round.rating].color }}>
              {RATING_LABELS[round.rating].text}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {step === 'rated' && round?.rating !== 'good' && (
              <button
                className="rounded-full border border-[var(--line)] bg-[var(--glass)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--glass-hover)]"
                onClick={retryListen}
              >
                Listen again
              </button>
            )}
            {(step === 'rated' || step === 'repeat-target') && (
              <button
                className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper)] hover:-translate-y-0.5"
                onClick={reset}
              >
                Next phrase
              </button>
            )}
          </div>
        </div>
      </section>

      <aside className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel-quiet)] p-4 shadow-[var(--shadow-card)]">
        <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Recent rounds</div>
        <div className="mt-3 space-y-2">
          {history.length === 0 && (
            <div className="rounded-[1.1rem] border border-dashed border-[var(--line)] px-4 py-6 text-sm leading-6 text-[var(--muted)]">
              Your latest speaking rounds will collect here.
            </div>
          )}
          {history.slice(0, 8).map((item, index) => (
            <div key={index} className="rounded-[1.1rem] border border-[var(--line)] bg-[var(--glass)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm font-semibold text-[var(--ink)]">{item.original}</div>
                <div className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: item.rating ? RATING_LABELS[item.rating].color : 'var(--muted)' }}>
                  {item.rating ?? 'saved'}
                </div>
              </div>
              <div className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.translated}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

function RoundCard({ title, value, accent }: { title: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-[1.25rem] border p-4 ${
      accent
        ? 'border-[var(--accent-soft)] bg-[var(--accent-gradient)]'
        : 'border-[var(--line)] bg-[var(--panel-quiet)]'
    }`}>
      <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{title}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--ink)]">{value}</div>
    </div>
  )
}
