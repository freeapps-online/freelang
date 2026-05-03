import { useSyncExternalStore } from 'react'
import { speech, type SpeechState } from './services/speech.ts'

export function useSpeech(): SpeechState {
  return useSyncExternalStore(
    (cb) => speech.subscribe(cb),
    () => speech.state,
  )
}
