import type { Sentence } from '../types.ts'

export type SentenceContentMode = 'phrases' | 'sentences'

const sentenceGlob = import.meta.glob('../data/sentences*.ts') as Record<string, () => Promise<{ default: Sentence[] }>>
const sentenceModules: Record<number, () => Promise<{ default: Sentence[] }>> = {}

for (const [path, loader] of Object.entries(sentenceGlob)) {
  const match = path.match(/sentences(\d+)\.ts$/)
  if (match) sentenceModules[parseInt(match[1], 10)] = loader
}

export const MAX_SENTENCE_LEVEL = Math.max(...Object.keys(sentenceModules).map(Number), 1)
export const MAX_PHRASE_LEVEL = 3

export const PHRASE_LEVEL_LABELS: Record<number, string> = {
  1: 'Starter',
  2: 'Useful',
  3: 'Quick talk',
}

const loadedSentences = new Map<number, Sentence[]>()
const loadedPhrases = new Map<number, Sentence[]>()

function countEnglishWords(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length
}

async function loadSentenceLevel(level: number): Promise<Sentence[]> {
  const cached = loadedSentences.get(level)
  if (cached) return cached
  const loader = sentenceModules[level]
  if (!loader) return []
  const mod = await loader()
  loadedSentences.set(level, mod.default)
  return mod.default
}

async function loadPhraseLevel(level: number): Promise<Sentence[]> {
  const clampedLevel = Math.min(Math.max(level, 1), MAX_PHRASE_LEVEL)
  const cached = loadedPhrases.get(clampedLevel)
  if (cached) return cached

  const sourceLevels = Array.from({ length: MAX_SENTENCE_LEVEL }, (_, index) => index + 1)
  const levels = await Promise.all(sourceLevels.map(loadSentenceLevel))
  const candidates = levels
    .flatMap((sentences, index) => sentences.map((sentence) => ({ sentence, sourceLevel: index + 1 })))
    .filter(({ sentence }) => countEnglishWords(sentence.text.en ?? '') <= 3)
    .sort((a, b) => a.sourceLevel - b.sourceLevel || a.sentence.id.localeCompare(b.sentence.id))
    .map(({ sentence }) => sentence)

  const chunkSize = Math.max(1, Math.ceil(candidates.length / MAX_PHRASE_LEVEL))
  for (let phraseLevel = 1; phraseLevel <= MAX_PHRASE_LEVEL; phraseLevel += 1) {
    const start = (phraseLevel - 1) * chunkSize
    const end = phraseLevel === MAX_PHRASE_LEVEL ? candidates.length : start + chunkSize
    loadedPhrases.set(phraseLevel, candidates.slice(start, end))
  }

  return loadedPhrases.get(clampedLevel) ?? []
}

export async function loadPracticeDeck(mode: SentenceContentMode, level: number): Promise<Sentence[]> {
  if (mode === 'phrases') return loadPhraseLevel(level)
  const clampedLevel = Math.min(Math.max(level, 1), MAX_SENTENCE_LEVEL)
  return loadSentenceLevel(clampedLevel)
}
