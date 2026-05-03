export interface Language {
  code: string
  name: string
  flag: string
}

export type Mode = 'flashcards' | 'phrases' | 'sentences' | 'preferences'

export interface FlashCard {
  word: string
  emoji: string
  translations: Record<string, string>
  transliterations?: Record<string, string>
}

export interface Sentence {
  id: string
  emoji: string
  text: Record<string, string>
}

export interface FlashCardRound {
  card: FlashCard
  correctSide: 'left' | 'right'
  leftOption: string
  rightOption: string
}

export interface FlashCardScore {
  correct: number
  total: number
  streak: number
  bestStreak: number
}

export interface Message {
  id: string
  text: string
  translation?: string
  speaker: 'user' | 'other' | 'app'
  lang: string
  timestamp: number
  rating?: 'good' | 'close' | 'retry'
}

export interface PracticeRound {
  original: string
  translated: string
  userAttempt?: string
  rating?: 'good' | 'close' | 'retry'
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'es', name: 'Spanish', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'fr', name: 'French', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'de', name: 'German', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'it', name: 'Italian', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'pt', name: 'Portuguese', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'ja', name: 'Japanese', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'ko', name: 'Korean', flag: '\u{1F1F0}\u{1F1F7}' },
  { code: 'zh', name: 'Chinese', flag: '\u{1F1E8}\u{1F1F3}' },
  { code: 'ru', name: 'Russian', flag: '\u{1F1F7}\u{1F1FA}' },
  { code: 'ar', name: 'Arabic', flag: '\u{1F1F8}\u{1F1E6}' },
  { code: 'hi', name: 'Hindi', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'tr', name: 'Turkish', flag: '\u{1F1F9}\u{1F1F7}' },
  { code: 'nl', name: 'Dutch', flag: '\u{1F1F3}\u{1F1F1}' },
  { code: 'pl', name: 'Polish', flag: '\u{1F1F5}\u{1F1F1}' },
  { code: 'uk', name: 'Ukrainian', flag: '\u{1F1FA}\u{1F1E6}' },
]
