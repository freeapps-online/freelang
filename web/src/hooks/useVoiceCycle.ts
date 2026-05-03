import { useEffect, useRef, useState } from 'react'
import { speech } from '../services/speech.ts'
import { evaluateVoiceAttempt } from '../services/flashcardsVoice.ts'
import { getCardDisplay } from '../services/vocabulary.ts'
import type { FlashCardRound } from '../types.ts'

type VoiceStep = 'repeat' | 'answer'
type SpeakStatus = 'idle' | 'prompting' | 'listening-repeat' | 'listening-answer' | 'blocked' | 'unsupported'

interface UseVoiceCycleOptions {
  round: FlashCardRound | null
  targetLang: string
  nativeLang: string
  audioEnabled: boolean
  active: boolean // true when speak mode is on and not showing stats
  transitioning: boolean
  onAnswer: (heardTarget: string, heardAnswer: string) => void
}

export function useVoiceCycle({
  round,
  targetLang,
  nativeLang,
  audioEnabled,
  active,
  transitioning,
  onAnswer,
}: UseVoiceCycleOptions) {
  const [, setVoiceStep] = useState<VoiceStep>('repeat')
  const [, setVoiceAttempt] = useState<{ heardTarget: string; heardAnswer: string; repeatMatched: boolean } | null>(null)
  const [, setSpeakStatus] = useState<SpeakStatus>('idle')
  const speakTimer = useRef<number>(0)
  const speakRunId = useRef(0)
  const heardTargetRef = useRef('')

  const reset = () => {
    setVoiceStep('repeat')
    setVoiceAttempt(null)
    heardTargetRef.current = ''
    setSpeakStatus('idle')
  }

  useEffect(() => {
    if (!active || !round || transitioning) return

    const runId = ++speakRunId.current
    const displayText = getCardDisplay(round.card, targetLang).text
    const answerText = round.card.translations[nativeLang] ?? round.card.word

    const handleRecognitionError = (error: string, step: VoiceStep) => {
      if (runId !== speakRunId.current) return
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        setSpeakStatus('blocked')
        return
      }
      if (error === 'Speech recognition not supported') {
        setSpeakStatus('unsupported')
        return
      }
      if (error === 'no-speech') {
        speakTimer.current = window.setTimeout(() => {
          if (runId !== speakRunId.current) return
          if (step === 'repeat') startRepeatListening()
          else startAnswerListening(heardTargetRef.current)
        }, 250)
      }
    }

    const startAnswerListening = (heardTarget: string) => {
      if (runId !== speakRunId.current) return
      setVoiceStep('answer')
      setSpeakStatus('listening-answer')
      speech.startListening(nativeLang, (heardAnswer) => {
        if (runId !== speakRunId.current) return
        onAnswer(heardTarget, heardAnswer)
      }, {
        onError: (error) => handleRecognitionError(error, 'answer'),
      })
    }

    const startRepeatListening = () => {
      if (runId !== speakRunId.current) return
      setVoiceStep('repeat')
      setSpeakStatus('listening-repeat')
      speech.startListening(targetLang, (heardTarget) => {
        if (runId !== speakRunId.current) return
        heardTargetRef.current = heardTarget
        const repeatMatched = evaluateVoiceAttempt(displayText, heardTarget, answerText, answerText).repeatMatched
        setVoiceAttempt({ heardTarget, heardAnswer: '', repeatMatched })
        speakTimer.current = window.setTimeout(() => startAnswerListening(heardTarget), 160)
      }, {
        onError: (error) => handleRecognitionError(error, 'repeat'),
      })
    }

    const runSpeakCycle = async () => {
      setVoiceStep('repeat')
      setVoiceAttempt(null)
      if (audioEnabled) {
        setSpeakStatus('prompting')
        await speech.speak(displayText, targetLang)
        if (runId !== speakRunId.current) return
      }
      startRepeatListening()
    }

    void runSpeakCycle()

    return () => {
      window.clearTimeout(speakTimer.current)
      speech.stopListening()
      speech.stopSpeaking()
    }
  }, [active, audioEnabled, nativeLang, onAnswer, round, targetLang, transitioning])

  return { reset }
}
