import type { Sentence } from '../types.ts'

export interface ClozeRound {
  sentence: Sentence
  fullText: string
  maskedText: string
  missingWord: string
  correctSide: 'left' | 'right'
  leftOption: string
  rightOption: string
}

interface WordSegment {
  segment: string
  index: number
}

function segmentWords(text: string): WordSegment[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' })
    return Array.from(segmenter.segment(text))
      .filter((part) => part.isWordLike)
      .map((part) => ({ segment: part.segment, index: part.index }))
  }

  const matches = [...text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)]
  return matches.map((match) => ({ segment: match[0], index: match.index ?? 0 }))
}

function uniqueWords(words: string[]) {
  const seen = new Set<string>()
  return words.filter((word) => {
    const key = word.trim().toLocaleLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function isSuitableSentence(sentence: Sentence, targetLang: string) {
  const text = sentence.text[targetLang] ?? sentence.text.en ?? ''
  return segmentWords(text).length > 1
}

function getScriptBucket(segment: string) {
  const codePoint = segment.codePointAt(0)
  if (codePoint == null) return 'other'
  if ((codePoint >= 0x0041 && codePoint <= 0x024f) || (codePoint >= 0x1e00 && codePoint <= 0x1eff)) return 'latin'
  if (codePoint >= 0x0400 && codePoint <= 0x052f) return 'cyrillic'
  if (codePoint >= 0x0370 && codePoint <= 0x03ff) return 'greek'
  if (codePoint >= 0x0590 && codePoint <= 0x05ff) return 'hebrew'
  if (codePoint >= 0x0600 && codePoint <= 0x06ff) return 'arabic'
  if (codePoint >= 0x0900 && codePoint <= 0x097f) return 'devanagari'
  if (codePoint >= 0x3040 && codePoint <= 0x309f) return 'hiragana'
  if (codePoint >= 0x30a0 && codePoint <= 0x30ff) return 'katakana'
  if (codePoint >= 0x4e00 && codePoint <= 0x9fff) return 'han'
  if (codePoint >= 0xac00 && codePoint <= 0xd7af) return 'hangul'
  return 'other'
}

function pickSentence(sentences: Sentence[], targetLang: string, exclude?: Sentence, prePickedSentence?: Sentence) {
  const suitable = sentences.filter((sentence) => sentence.id !== exclude?.id && isSuitableSentence(sentence, targetLang))
  if (prePickedSentence && isSuitableSentence(prePickedSentence, targetLang)) return prePickedSentence
  if (suitable.length === 0) return sentences[0]
  return suitable[Math.floor(Math.random() * suitable.length)]
}

function pickMaskIndex(words: WordSegment[]) {
  const preferred = words
    .map((word, index) => ({ ...word, index }))
    .filter(({ segment, index }) => segment.length > 1 && index > 0 && index < words.length - 1)
  const pool = preferred.length > 0 ? preferred : words.map((word, index) => ({ ...word, index }))
  return pool[Math.floor(Math.random() * pool.length)]?.index ?? 0
}

function pickDistractor({
  targetWords,
  poolWords,
  missingWord,
}: {
  targetWords: string[]
  poolWords: string[]
  missingWord: string
}) {
  const bucket = getScriptBucket(missingWord)
  const targetWordSet = new Set(targetWords.map((word) => word.trim().toLocaleLowerCase()))
  const uniquePool = uniqueWords(poolWords.filter((word) => word !== missingWord))
  const externalPool = uniquePool.filter((word) => !targetWordSet.has(word.trim().toLocaleLowerCase()))
  const sameBucket = externalPool.filter((word) => getScriptBucket(word) === bucket)
  const similarLength = sameBucket.filter((word) => Math.abs(word.length - missingWord.length) <= 2)
  const candidates = similarLength.length > 0
    ? similarLength
    : sameBucket.length > 0
      ? sameBucket
      : externalPool.length > 0
        ? externalPool
        : uniquePool
  return candidates[Math.floor(Math.random() * candidates.length)] ?? '?'
}

export function createClozeRound({
  sentences,
  targetLang,
  exclude,
  prePickedSentence,
}: {
  sentences: Sentence[]
  targetLang: string
  exclude?: Sentence
  prePickedSentence?: Sentence
}): ClozeRound {
  if (sentences.length === 0) {
    return {
      sentence: { id: '', emoji: '', text: {} },
      fullText: '',
      maskedText: '',
      missingWord: '',
      correctSide: 'left',
      leftOption: '',
      rightOption: '',
    }
  }

  const sentence = pickSentence(sentences, targetLang, exclude, prePickedSentence)
  const fullText = sentence.text[targetLang] ?? sentence.text.en ?? ''
  const words = segmentWords(fullText)
  const maskWordIndex = pickMaskIndex(words)
  const maskedWord = words[maskWordIndex] ?? { segment: '', index: 0 }
  const missingWord = maskedWord.segment
  const placeholder = '▢▢▢'
  const maskedText = `${fullText.slice(0, maskedWord.index)}${placeholder}${fullText.slice(maskedWord.index + maskedWord.segment.length)}`
  const deckWords = sentences.flatMap((item) => segmentWords(item.text[targetLang] ?? item.text.en ?? '').map((word) => word.segment))
  const distractor = pickDistractor({
    targetWords: words.map((word) => word.segment),
    poolWords: deckWords,
    missingWord,
  })
  const correctSide = Math.random() < 0.5 ? 'left' : 'right'

  return {
    sentence,
    fullText,
    maskedText,
    missingWord,
    correctSide,
    leftOption: correctSide === 'left' ? missingWord : distractor,
    rightOption: correctSide === 'right' ? missingWord : distractor,
  }
}
