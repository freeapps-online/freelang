import { useState, useCallback } from 'react'
import { speech } from '../services/speech.ts'
import { useSpeech } from '../hooks.ts'
import { MicButton } from './MicButton.tsx'
import type { PracticeRound } from '../types.ts'

const RATING_LABELS = {
  good: { text: 'Great!', color: 'var(--success)' },
  close: { text: 'Close, try again', color: 'var(--warning)' },
  retry: { text: 'Not quite, listen again', color: 'var(--error)' },
} as const

type Step = 'say-native' | 'listen-target' | 'repeat-target' | 'rated'

export function PracticeTab({ nativeLang, targetLang }: { nativeLang: string; targetLang: string }) {
  const sp = useSpeech()
  const [step, setStep] = useState<Step>('say-native')
  const [round, setRound] = useState<PracticeRound | null>(null)
  const [history, setHistory] = useState<PracticeRound[]>([])

  const handleNativeSpeech = useCallback((text: string) => {
    // For now, use a simple placeholder translation
    // TODO: integrate real translation API
    const translated = `[${targetLang}] ${text}`
    const newRound: PracticeRound = { original: text, translated }
    setRound(newRound)
    setStep('listen-target')

    // Speak the translation
    speech.speak(translated, targetLang).then(() => {
      setStep('repeat-target')
    })
  }, [targetLang])

  const handleRepeatAttempt = useCallback((attempt: string) => {
    if (!round) return

    // Simple similarity check (placeholder — real app would use pronunciation scoring)
    const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim()
    const expected = normalize(round.translated)
    const actual = normalize(attempt)

    // Compare words to compute overlap ratio
    const expectedWords = expected.split(' ')
    const actualWords = actual.split(' ')
    const matches = actualWords.filter(w => expectedWords.includes(w)).length
    const ratio = expectedWords.length > 0 ? matches / expectedWords.length : 0

    let rating: PracticeRound['rating']
    if (ratio >= 0.8) {
      rating = 'good'
    } else if (ratio >= 0.4) {
      rating = 'close'
    } else {
      rating = 'retry'
    }

    const rated = { ...round, userAttempt: attempt, rating }
    setRound(rated)
    setHistory(prev => [rated, ...prev])
    setStep('rated')
  }, [round])

  const reset = useCallback(() => {
    setRound(null)
    setStep('say-native')
  }, [])

  const retryListen = useCallback(() => {
    if (round) {
      setStep('listen-target')
      speech.speak(round.translated, targetLang).then(() => {
        setStep('repeat-target')
      })
    }
  }, [round, targetLang])

  return (
    <div className="flex flex-col items-center px-4 pt-8 gap-6">
      <h2 className="text-lg font-semibold">Practice Mode</h2>
      <p className="text-sm text-[var(--text-muted)] text-center max-w-sm">
        {step === 'say-native' && 'Say something in your language. Hold the mic to speak.'}
        {step === 'listen-target' && 'Listen to the translation...'}
        {step === 'repeat-target' && 'Now repeat what you heard. Hold the mic.'}
        {step === 'rated' && 'See your result below.'}
      </p>

      {/* Current round display */}
      {round && (
        <div className="w-full max-w-sm space-y-3">
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">You said:</div>
            <div className="text-sm">{round.original}</div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">Translation:</div>
            <div className="text-sm">{round.translated}</div>
          </div>
          {round.userAttempt && (
            <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-xs text-[var(--text-muted)] mb-1">Your attempt:</div>
              <div className="text-sm">{round.userAttempt}</div>
            </div>
          )}
        </div>
      )}

      {/* Rating display */}
      {step === 'rated' && round?.rating && (
        <div className="text-lg font-semibold" style={{ color: RATING_LABELS[round.rating].color }}>
          {RATING_LABELS[round.rating].text}
        </div>
      )}

      {/* Mic button */}
      <MicButton
        listening={sp.isListening}
        disabled={sp.isSpeaking || step === 'listen-target'}
        onPress={() => {
          if (step === 'say-native') {
            speech.startListening(nativeLang, handleNativeSpeech)
          } else if (step === 'repeat-target') {
            speech.startListening(targetLang, handleRepeatAttempt)
          }
        }}
        onRelease={() => speech.stopListening()}
      />

      {/* Live transcript */}
      {sp.isListening && sp.transcript && (
        <div className="text-sm text-[var(--text-muted)] italic">"{sp.transcript}"</div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {step === 'rated' && round?.rating !== 'good' && (
          <button
            className="px-4 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-sm"
            onClick={retryListen}
          >
            Listen again
          </button>
        )}
        {(step === 'rated' || step === 'repeat-target') && (
          <button
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium"
            onClick={reset}
          >
            Next phrase
          </button>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="w-full max-w-sm mt-4">
          <h3 className="text-xs text-[var(--text-muted)] font-medium mb-2 uppercase tracking-wider">History</h3>
          <div className="space-y-2">
            {history.slice(0, 10).map((r, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface)] text-sm">
                <span style={{ color: r.rating ? RATING_LABELS[r.rating].color : 'var(--text-muted)' }}>
                  {r.rating === 'good' ? '\u2713' : r.rating === 'close' ? '\u223C' : '\u2717'}
                </span>
                <span className="truncate flex-1">{r.original}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
