import type { FlashCard, FlashCardRound } from '../types.ts'
import { LEVEL_LABELS, LEVELS } from './levelMetadata.ts'

const levelModules: Record<number, () => Promise<{ default: FlashCard[] }>> = {
  1: () => import('../data/level1.ts'),
  2: () => import('../data/level2.ts'),
  3: () => import('../data/level3.ts'),
  4: () => import('../data/level4.ts'),
  5: () => import('../data/level5.ts'),
  6: () => import('../data/level6.ts'),
  7: () => import('../data/level7.ts'),
  8: () => import('../data/level8.ts'),
  9: () => import('../data/level9.ts'),
  10: () => import('../data/level10.ts'),
  11: () => import('../data/level11.ts'),
  12: () => import('../data/level12.ts'),
  13: () => import('../data/level13.ts'),
  14: () => import('../data/level14.ts'),
  15: () => import('../data/level15.ts'),
  16: () => import('../data/level16.ts'),
  17: () => import('../data/level17.ts'),
  18: () => import('../data/level18.ts'),
  19: () => import('../data/level19.ts'),
  20: () => import('../data/level20.ts'),
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

import { getTranslit } from './translit.ts'

export function getCardDisplay(card: FlashCard, targetLang: string): { text: string; emoji: string; translit?: string } {
  const text = card.translations[targetLang] ?? card.word
  return {
    text,
    emoji: card.emoji,
    translit: card.transliterations?.[targetLang] ?? getTranslit(text, targetLang) ?? undefined,
  }
}

export { LEVEL_LABELS, LEVELS }
