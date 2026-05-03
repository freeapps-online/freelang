import type { FlashCard } from '../types.ts'
import { getCardDisplay } from './vocabulary.ts'

export interface MissingLetterRound {
  card: FlashCard
  displayText: string
  maskedText: string
  missingLetter: string
  correctSide: 'left' | 'right'
  leftOption: string
  rightOption: string
}

function segmentWord(text: string) {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return Array.from(segmenter.segment(text), (part) => part.segment)
  }
  return Array.from(text)
}

function isGuessableSegment(segment: string) {
  return /[\p{L}\p{N}]/u.test(segment)
}

function getScriptBucket(segment: string) {
  const firstCodePoint = segment.codePointAt(0)
  if (firstCodePoint == null) return 'other'
  if ((firstCodePoint >= 0x0041 && firstCodePoint <= 0x024f) || (firstCodePoint >= 0x1e00 && firstCodePoint <= 0x1eff)) return 'latin'
  if (firstCodePoint >= 0x0400 && firstCodePoint <= 0x052f) return 'cyrillic'
  if (firstCodePoint >= 0x0370 && firstCodePoint <= 0x03ff) return 'greek'
  if (firstCodePoint >= 0x0590 && firstCodePoint <= 0x05ff) return 'hebrew'
  if (firstCodePoint >= 0x0600 && firstCodePoint <= 0x06ff) return 'arabic'
  if (firstCodePoint >= 0x0900 && firstCodePoint <= 0x097f) return 'devanagari'
  if (firstCodePoint >= 0x3040 && firstCodePoint <= 0x309f) return 'hiragana'
  if (firstCodePoint >= 0x30a0 && firstCodePoint <= 0x30ff) return 'katakana'
  if (firstCodePoint >= 0x4e00 && firstCodePoint <= 0x9fff) return 'han'
  if (firstCodePoint >= 0xac00 && firstCodePoint <= 0xd7af) return 'hangul'
  if (firstCodePoint >= 0x0030 && firstCodePoint <= 0x0039) return 'digit'
  return 'other'
}

function uniqueSegments(segments: string[]) {
  const seen = new Set<string>()
  return segments.filter((segment) => {
    if (!segment) return false
    if (seen.has(segment)) return false
    seen.add(segment)
    return true
  })
}

function getGuessableSegments(text: string) {
  return segmentWord(text).filter(isGuessableSegment)
}

function isSuitableCard(card: FlashCard, targetLang: string) {
  const displayText = getCardDisplay(card, targetLang).text
  return getGuessableSegments(displayText).length > 0
}

function pickCard(words: FlashCard[], targetLang: string, prePickedCard?: FlashCard, exclude?: FlashCard) {
  const suitableWords = words.filter((card) => card.word !== exclude?.word && isSuitableCard(card, targetLang))
  if (prePickedCard && isSuitableCard(prePickedCard, targetLang)) return prePickedCard
  if (suitableWords.length === 0) return words[0]
  return suitableWords[Math.floor(Math.random() * suitableWords.length)]
}

function pickMaskIndex(segments: string[]) {
  const guessableIndices = segments
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => isGuessableSegment(segment))
    .map(({ index }) => index)

  const preferred = guessableIndices.filter((index) => index > 0 && index < segments.length - 1)
  const pool = preferred.length > 0 ? preferred : guessableIndices
  return pool[Math.floor(Math.random() * pool.length)] ?? 0
}

function pickDistractor(targetSegments: string[], allSegments: string[], correctSegment: string) {
  const sameWordCandidates = uniqueSegments(targetSegments.filter((segment) => isGuessableSegment(segment) && segment !== correctSegment))
  if (sameWordCandidates.length > 0) {
    return sameWordCandidates[Math.floor(Math.random() * sameWordCandidates.length)]
  }

  const targetBucket = getScriptBucket(correctSegment)
  const poolCandidates = uniqueSegments(allSegments.filter((segment) => isGuessableSegment(segment) && segment !== correctSegment))
  const sameBucketCandidates = poolCandidates.filter((segment) => getScriptBucket(segment) === targetBucket)
  const fallbackPool = sameBucketCandidates.length > 0 ? sameBucketCandidates : poolCandidates
  return fallbackPool[Math.floor(Math.random() * fallbackPool.length)] ?? '?'
}

export function createMissingLetterRound({
  words,
  targetLang,
  exclude,
  prePickedCard,
}: {
  words: FlashCard[]
  targetLang: string
  exclude?: FlashCard
  prePickedCard?: FlashCard
}): MissingLetterRound {
  if (words.length === 0) {
    return {
      card: { word: '', emoji: '', translations: {} },
      displayText: '',
      maskedText: '',
      missingLetter: '',
      correctSide: 'left',
      leftOption: '',
      rightOption: '',
    }
  }

  const card = pickCard(words, targetLang, prePickedCard, exclude)
  const displayText = getCardDisplay(card, targetLang).text
  const targetSegments = segmentWord(displayText)
  const maskIndex = pickMaskIndex(targetSegments)
  const missingLetter = targetSegments[maskIndex] ?? ''
  const allSegments = words.flatMap((entry) => segmentWord(getCardDisplay(entry, targetLang).text))
  const distractor = pickDistractor(targetSegments, allSegments, missingLetter)
  const maskedSegments = [...targetSegments]
  maskedSegments[maskIndex] = '▢'
  const correctSide = Math.random() < 0.5 ? 'left' : 'right'

  return {
    card,
    displayText,
    maskedText: maskedSegments.join(''),
    missingLetter,
    correctSide,
    leftOption: correctSide === 'left' ? missingLetter : distractor,
    rightOption: correctSide === 'right' ? missingLetter : distractor,
  }
}
