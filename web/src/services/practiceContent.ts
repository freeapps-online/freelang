import type { Sentence } from '../types.ts'

export type SentenceLengthFilter = 'short' | 'long'
export const SHORT_SENTENCE_WORD_LIMIT = 3

const sentenceGlob = import.meta.glob('../data/sentences*.ts') as Record<string, () => Promise<{ default: Sentence[] }>>
const sentenceModules: Record<number, () => Promise<{ default: Sentence[] }>> = {}

for (const [path, loader] of Object.entries(sentenceGlob)) {
  const match = path.match(/sentences(\d+)\.ts$/)
  if (match) sentenceModules[parseInt(match[1], 10)] = loader
}

export const MAX_SENTENCE_LEVEL = Math.max(...Object.keys(sentenceModules).map(Number), 1)

const loadedSentences = new Map<number, Sentence[]>()

export function countEnglishWords(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length
}

export function matchesSentenceLengthFilter(sentence: Sentence, filter: SentenceLengthFilter) {
  const wordCount = countEnglishWords(sentence.text.en ?? '')
  return filter === 'short'
    ? wordCount <= SHORT_SENTENCE_WORD_LIMIT
    : wordCount > SHORT_SENTENCE_WORD_LIMIT
}

export function filterSentencesByLength(sentences: Sentence[], filter: SentenceLengthFilter) {
  return sentences.filter((sentence) => matchesSentenceLengthFilter(sentence, filter))
}

export async function loadPracticeDeck(level: number): Promise<Sentence[]> {
  const cached = loadedSentences.get(level)
  if (cached) return cached
  const loader = sentenceModules[level]
  if (!loader) return []
  const mod = await loader()
  loadedSentences.set(level, mod.default)
  return mod.default
}
