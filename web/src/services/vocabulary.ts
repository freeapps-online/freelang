import type { FlashCard, FlashCardRound } from '../types.ts'

const levelModules: Record<number, () => Promise<{ default: FlashCard[] }>> = {
  1: () => import('../data/level1.ts'),
  2: () => import('../data/level2.ts'),
  3: () => import('../data/level3.ts'),
  4: () => import('../data/level4.ts'),
  5: () => import('../data/level5.ts'),
}

const loadedLevels: Map<number, FlashCard[]> = new Map()

export async function loadLevel(level: number): Promise<FlashCard[]> {
  const cached = loadedLevels.get(level)
  if (cached) return cached

  const loader = levelModules[level]
  if (!loader) return loadedLevels.get(1) ?? []

  const mod = await loader()
  loadedLevels.set(level, mod.default)
  return mod.default
}

export function getLoadedWords(level: number): FlashCard[] {
  return loadedLevels.get(level) ?? []
}

export function getFlashCardRound(nativeLang: string, _targetLang: string, words: FlashCard[], _exclude?: FlashCard, prePickedCard?: FlashCard): FlashCardRound {
  if (words.length === 0) return { card: { word: '', emoji: '', translations: {} }, correctSide: 'left', leftOption: '', rightOption: '' }

  const card = prePickedCard ?? words[Math.floor(Math.random() * words.length)]
  const correct = card.translations[nativeLang] ?? card.word

  const others = words.filter(c => c.word !== card.word)
  const wrongCard = others[Math.floor(Math.random() * others.length)]
  const wrong = wrongCard.translations[nativeLang] ?? wrongCard.word

  const correctSide = Math.random() < 0.5 ? 'left' : 'right' as const
  return {
    card,
    correctSide,
    leftOption: correctSide === 'left' ? correct : wrong,
    rightOption: correctSide === 'right' ? correct : wrong,
  }
}

export function getCardDisplay(card: FlashCard, targetLang: string): { text: string; emoji: string; translit?: string } {
  return {
    text: card.translations[targetLang] ?? card.word,
    emoji: card.emoji,
    translit: card.transliterations?.[targetLang],
  }
}

export const LEVEL_LABELS: Record<number, string> = {
  1: 'Basics',
  2: 'Daily Life',
  3: 'Actions',
  4: 'Society',
  5: 'Nature',
}

export const LEVELS = [1, 2, 3, 4, 5]
