import { useEffect, useRef } from 'react'
import { speech } from '../services/speech.ts'

/**
 * Speaks the given word whenever it changes (new card appeared).
 * Only speaks when enabled and not mid-transition.
 */
export function useCardAudio(
  word: string,
  lang: string,
  enabled: boolean,
  transitioning: boolean,
) {
  const prevWordRef = useRef('')

  useEffect(() => {
    if (!enabled || transitioning || !word) return
    // Speak when word changes or transitioning goes from true→false with a new word
    prevWordRef.current = word
    void speech.speak(word, lang)
  }, [enabled, word, lang, transitioning])
}
