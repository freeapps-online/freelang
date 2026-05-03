// Maps digit strings to word equivalents for scoring comparison.
// Covers 0-20 and common multiples. Works bidirectionally.
const DIGIT_TO_WORD: Record<string, string[]> = {
  '0': ['zero'],
  '1': ['one', 'un', 'uno', 'une', 'ein', 'eins', 'один', 'одна', 'одно'],
  '2': ['two', 'dos', 'deux', 'zwei', 'два', 'две'],
  '3': ['three', 'tres', 'trois', 'drei', 'три'],
  '4': ['four', 'cuatro', 'quatre', 'vier', 'четыре'],
  '5': ['five', 'cinco', 'cinq', 'fünf', 'пять'],
  '6': ['six', 'seis', 'sechs', 'шесть'],
  '7': ['seven', 'siete', 'sept', 'sieben', 'семь'],
  '8': ['eight', 'ocho', 'huit', 'acht', 'восемь'],
  '9': ['nine', 'nueve', 'neuf', 'neun', 'девять'],
  '10': ['ten', 'diez', 'dix', 'zehn', 'десять'],
  '11': ['eleven', 'once', 'onze', 'elf', 'одиннадцать'],
  '12': ['twelve', 'doce', 'douze', 'zwölf', 'двенадцать'],
  '13': ['thirteen', 'trece', 'treize', 'dreizehn', 'тринадцать'],
  '14': ['fourteen', 'catorce', 'quatorze', 'vierzehn', 'четырнадцать'],
  '15': ['fifteen', 'quince', 'quinze', 'fünfzehn', 'пятнадцать'],
  '16': ['sixteen', 'dieciséis', 'seize', 'sechzehn', 'шестнадцать'],
  '17': ['seventeen', 'diecisiete', 'dixsept', 'siebzehn', 'семнадцать'],
  '18': ['eighteen', 'dieciocho', 'dixhuit', 'achtzehn', 'восемнадцать'],
  '19': ['nineteen', 'diecinueve', 'dixneuf', 'neunzehn', 'девятнадцать'],
  '20': ['twenty', 'veinte', 'vingt', 'zwanzig', 'двадцать'],
  '30': ['thirty', 'treinta', 'trente', 'dreißig', 'тридцать'],
  '40': ['forty', 'cuarenta', 'quarante', 'vierzig', 'сорок'],
  '50': ['fifty', 'cincuenta', 'cinquante', 'fünfzig', 'пятьдесят'],
  '100': ['hundred', 'cien', 'cent', 'hundert', 'сто'],
  '1000': ['thousand', 'mil', 'mille', 'tausend', 'тысяча'],
}

// Build reverse map: word → digit string
const WORD_TO_DIGIT = new Map<string, string>()
for (const [digit, words] of Object.entries(DIGIT_TO_WORD)) {
  for (const word of words) {
    WORD_TO_DIGIT.set(word, digit)
  }
}

/**
 * Normalize a token for number-aware comparison.
 * Converts digit strings to their word forms, and word forms to digit strings,
 * so that "6" matches "six" and vice versa.
 * Returns an array of equivalent forms for the token.
 */
export function getNumberEquivalents(token: string): string[] {
  const lower = token.toLowerCase()

  // If it's a digit string, return itself + all word equivalents
  if (DIGIT_TO_WORD[lower]) {
    return [lower, ...DIGIT_TO_WORD[lower]]
  }

  // If it's a number word, return itself + the digit form
  const digit = WORD_TO_DIGIT.get(lower)
  if (digit) {
    return [lower, digit]
  }

  return [lower]
}

/**
 * Check if two tokens match, considering number equivalence.
 * "6" matches "six", "шесть" matches "6", etc.
 */
export function tokensMatch(a: string, b: string): boolean {
  const la = a.toLowerCase()
  const lb = b.toLowerCase()
  if (la === lb) return true

  const equivsA = getNumberEquivalents(la)
  return equivsA.includes(lb)
}
