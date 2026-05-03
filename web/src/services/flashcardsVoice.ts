export interface VoiceAttemptEvaluation {
  repeatMatched: boolean
  answerMatched: boolean
}

export function normalizeSpeech(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isSpeechMatch(expected: string, heard: string): boolean {
  return normalizeSpeech(expected) === normalizeSpeech(heard)
}

export function evaluateVoiceAttempt(expectedTarget: string, heardTarget: string, expectedAnswer: string, heardAnswer: string): VoiceAttemptEvaluation {
  return {
    repeatMatched: isSpeechMatch(expectedTarget, heardTarget),
    answerMatched: isSpeechMatch(expectedAnswer, heardAnswer),
  }
}
