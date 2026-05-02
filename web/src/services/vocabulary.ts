import type { FlashCard, FlashCardRound } from '../types.ts'

const VOCAB: FlashCard[] = [
  { word: 'water', emoji: '\u{1F4A7}', translations: { es: 'agua', fr: 'eau', de: 'Wasser', it: 'acqua', pt: '\u00e1gua', ja: '\u6c34', ko: '\ubb3c', zh: '\u6c34', ru: '\u0432\u043e\u0434\u0430', ar: '\u0645\u0627\u0621', hi: '\u092a\u093e\u0928\u0940', tr: 'su', nl: 'water', pl: 'woda', uk: '\u0432\u043e\u0434\u0430', en: 'water' }, transliterations: { ru: 'voda', uk: 'voda', ja: 'mizu', ko: 'mul', zh: 'shuǐ', ar: 'maa\'', hi: 'paani' } },
  { word: 'sun', emoji: '\u2600\ufe0f', translations: { es: 'sol', fr: 'soleil', de: 'Sonne', it: 'sole', pt: 'sol', ja: '\u592a\u967d', ko: '\ud0dc\uc591', zh: '\u592a\u9633', ru: '\u0441\u043e\u043b\u043d\u0446\u0435', ar: '\u0634\u0645\u0633', hi: '\u0938\u0942\u0930\u091c', tr: 'g\u00fcne\u015f', nl: 'zon', pl: 's\u0142o\u0144ce', uk: '\u0441\u043e\u043d\u0446\u0435', en: 'sun' }, transliterations: { ru: 'solntse', uk: 'sontse', ja: 'taiyō', ko: 'taeyang', zh: 'tàiyáng', ar: 'shams', hi: 'sooraj' } },
  { word: 'moon', emoji: '\u{1F319}', translations: { es: 'luna', fr: 'lune', de: 'Mond', it: 'luna', pt: 'lua', ja: '\u6708', ko: '\ub2ec', zh: '\u6708\u4eae', ru: '\u043b\u0443\u043d\u0430', ar: '\u0642\u0645\u0631', hi: '\u091a\u093e\u0901\u0926', tr: 'ay', nl: 'maan', pl: 'ksi\u0119\u017cyc', uk: '\u043c\u0456\u0441\u044f\u0446\u044c', en: 'moon' }, transliterations: { ru: 'luna', uk: 'misyats\'', ja: 'tsuki', ko: 'dal', zh: 'yuèliàng', ar: 'qamar', hi: 'chaand' } },
  { word: 'house', emoji: '\u{1F3E0}', translations: { es: 'casa', fr: 'maison', de: 'Haus', it: 'casa', pt: 'casa', ja: '\u5bb6', ko: '\uc9d1', zh: '\u623f\u5b50', ru: '\u0434\u043e\u043c', ar: '\u0628\u064a\u062a', hi: '\u0918\u0930', tr: 'ev', nl: 'huis', pl: 'dom', uk: '\u0434\u0456\u043c', en: 'house' }, transliterations: { ru: 'dom', uk: 'dim', ja: 'ie', ko: 'jip', zh: 'fángzi', ar: 'bayt', hi: 'ghar' } },
  { word: 'cat', emoji: '\u{1F431}', translations: { es: 'gato', fr: 'chat', de: 'Katze', it: 'gatto', pt: 'gato', ja: '\u732b', ko: '\uace0\uc591\uc774', zh: '\u732b', ru: '\u043a\u043e\u0442', ar: '\u0642\u0637\u0629', hi: '\u092c\u093f\u0932\u094d\u0932\u0940', tr: 'kedi', nl: 'kat', pl: 'kot', uk: '\u043a\u0456\u0442', en: 'cat' }, transliterations: { ru: 'kot', uk: 'kit', ja: 'neko', ko: 'goyangi', zh: 'māo', ar: 'qitta', hi: 'billi' } },
  { word: 'dog', emoji: '\u{1F436}', translations: { es: 'perro', fr: 'chien', de: 'Hund', it: 'cane', pt: 'c\u00e3o', ja: '\u72ac', ko: '\uac1c', zh: '\u72d7', ru: '\u0441\u043e\u0431\u0430\u043a\u0430', ar: '\u0643\u0644\u0628', hi: '\u0915\u0941\u0924\u094d\u0924\u093e', tr: 'k\u00f6pek', nl: 'hond', pl: 'pies', uk: '\u0441\u043e\u0431\u0430\u043a\u0430', en: 'dog' }, transliterations: { ru: 'sobaka', uk: 'sobaka', ja: 'inu', ko: 'gae', zh: 'gǒu', ar: 'kalb', hi: 'kutta' } },
  { word: 'book', emoji: '\u{1F4D6}', translations: { es: 'libro', fr: 'livre', de: 'Buch', it: 'libro', pt: 'livro', ja: '\u672c', ko: '\ucc45', zh: '\u4e66', ru: '\u043a\u043d\u0438\u0433\u0430', ar: '\u0643\u062a\u0627\u0628', hi: '\u0915\u093f\u0924\u093e\u092c', tr: 'kitap', nl: 'boek', pl: 'ksi\u0105\u017cka', uk: '\u043a\u043d\u0438\u0433\u0430', en: 'book' }, transliterations: { ru: 'kniga', uk: 'knyha', ja: 'hon', ko: 'chaek', zh: 'shū', ar: 'kitaab', hi: 'kitaab' } },
  { word: 'tree', emoji: '\u{1F333}', translations: { es: '\u00e1rbol', fr: 'arbre', de: 'Baum', it: 'albero', pt: '\u00e1rvore', ja: '\u6728', ko: '\ub098\ubb34', zh: '\u6811', ru: '\u0434\u0435\u0440\u0435\u0432\u043e', ar: '\u0634\u062c\u0631\u0629', hi: '\u092a\u0947\u0921\u093c', tr: 'a\u011fa\u00e7', nl: 'boom', pl: 'drzewo', uk: '\u0434\u0435\u0440\u0435\u0432\u043e', en: 'tree' }, transliterations: { ru: 'derevo', uk: 'derevo', ja: 'ki', ko: 'namu', zh: 'shù', ar: 'shajara', hi: 'ped' } },
  { word: 'fire', emoji: '\u{1F525}', translations: { es: 'fuego', fr: 'feu', de: 'Feuer', it: 'fuoco', pt: 'fogo', ja: '\u706b', ko: '\ubd88', zh: '\u706b', ru: '\u043e\u0433\u043e\u043d\u044c', ar: '\u0646\u0627\u0631', hi: '\u0906\u0917', tr: 'ate\u015f', nl: 'vuur', pl: 'ogie\u0144', uk: '\u0432\u043e\u0433\u043e\u043d\u044c', en: 'fire' }, transliterations: { ru: 'ogon\'', uk: 'vohon\'', ja: 'hi', ko: 'bul', zh: 'huǒ', ar: 'naar', hi: 'aag' } },
  { word: 'star', emoji: '\u2b50', translations: { es: 'estrella', fr: '\u00e9toile', de: 'Stern', it: 'stella', pt: 'estrela', ja: '\u661f', ko: '\ubcc4', zh: '\u661f\u661f', ru: '\u0437\u0432\u0435\u0437\u0434\u0430', ar: '\u0646\u062c\u0645\u0629', hi: '\u0924\u093e\u0930\u093e', tr: 'y\u0131ld\u0131z', nl: 'ster', pl: 'gwiazda', uk: '\u0437\u0456\u0440\u043a\u0430', en: 'star' }, transliterations: { ru: 'zvezda', uk: 'zirka', ja: 'hoshi', ko: 'byeol', zh: 'xīngxīng', ar: 'najma', hi: 'taara' } },
  { word: 'flower', emoji: '\u{1F33B}', translations: { es: 'flor', fr: 'fleur', de: 'Blume', it: 'fiore', pt: 'flor', ja: '\u82b1', ko: '\uaf43', zh: '\u82b1', ru: '\u0446\u0432\u0435\u0442\u043e\u043a', ar: '\u0632\u0647\u0631\u0629', hi: '\u092b\u0942\u0932', tr: '\u00e7i\u00e7ek', nl: 'bloem', pl: 'kwiat', uk: '\u043a\u0432\u0456\u0442\u043a\u0430', en: 'flower' }, transliterations: { ru: 'tsvetok', uk: 'kvitka', ja: 'hana', ko: 'kkot', zh: 'huā', ar: 'zahra', hi: 'phool' } },
  { word: 'heart', emoji: '\u2764\ufe0f', translations: { es: 'coraz\u00f3n', fr: 'c\u0153ur', de: 'Herz', it: 'cuore', pt: 'cora\u00e7\u00e3o', ja: '\u5fc3\u81d3', ko: '\uc2ec\uc7a5', zh: '\u5fc3', ru: '\u0441\u0435\u0440\u0434\u0446\u0435', ar: '\u0642\u0644\u0628', hi: '\u0926\u093f\u0932', tr: 'kalp', nl: 'hart', pl: 'serce', uk: '\u0441\u0435\u0440\u0446\u0435', en: 'heart' }, transliterations: { ru: 'serdtse', uk: 'sertse', ja: 'shinzō', ko: 'simjang', zh: 'xīn', ar: 'qalb', hi: 'dil' } },
  { word: 'bread', emoji: '\u{1F35E}', translations: { es: 'pan', fr: 'pain', de: 'Brot', it: 'pane', pt: 'p\u00e3o', ja: '\u30d1\u30f3', ko: '\ube75', zh: '\u9762\u5305', ru: '\u0445\u043b\u0435\u0431', ar: '\u062e\u0628\u0632', hi: '\u0930\u094b\u091f\u0940', tr: 'ekmek', nl: 'brood', pl: 'chleb', uk: '\u0445\u043b\u0456\u0431', en: 'bread' }, transliterations: { ru: 'khleb', uk: 'khlib', ja: 'pan', ko: 'ppang', zh: 'miànbāo', ar: 'khubz', hi: 'roti' } },
  { word: 'fish', emoji: '\u{1F41F}', translations: { es: 'pez', fr: 'poisson', de: 'Fisch', it: 'pesce', pt: 'peixe', ja: '\u9b5a', ko: '\ubb3c\uace0\uae30', zh: '\u9c7c', ru: '\u0440\u044b\u0431\u0430', ar: '\u0633\u0645\u0643\u0629', hi: '\u092e\u091b\u0932\u0940', tr: 'bal\u0131k', nl: 'vis', pl: 'ryba', uk: '\u0440\u0438\u0431\u0430', en: 'fish' }, transliterations: { ru: 'ryba', uk: 'ryba', ja: 'sakana', ko: 'mulgogi', zh: 'yú', ar: 'samaka', hi: 'machli' } },
  { word: 'apple', emoji: '\u{1F34E}', translations: { es: 'manzana', fr: 'pomme', de: 'Apfel', it: 'mela', pt: 'ma\u00e7\u00e3', ja: '\u308a\u3093\u3054', ko: '\uc0ac\uacfc', zh: '\u82f9\u679c', ru: '\u044f\u0431\u043b\u043e\u043a\u043e', ar: '\u062a\u0641\u0627\u062d\u0629', hi: '\u0938\u0947\u092c', tr: 'elma', nl: 'appel', pl: 'jab\u0142ko', uk: '\u044f\u0431\u043b\u0443\u043a\u043e', en: 'apple' }, transliterations: { ru: 'yabloko', uk: 'yabluko', ja: 'ringo', ko: 'sagwa', zh: 'píngguǒ', ar: 'tuffaaha', hi: 'seb' } },
  { word: 'mountain', emoji: '\u26f0\ufe0f', translations: { es: 'monta\u00f1a', fr: 'montagne', de: 'Berg', it: 'montagna', pt: 'montanha', ja: '\u5c71', ko: '\uc0b0', zh: '\u5c71', ru: '\u0433\u043e\u0440\u0430', ar: '\u062c\u0628\u0644', hi: '\u092a\u0939\u093e\u0921\u093c', tr: 'da\u011f', nl: 'berg', pl: 'g\u00f3ra', uk: '\u0433\u043e\u0440\u0430', en: 'mountain' }, transliterations: { ru: 'gora', uk: 'hora', ja: 'yama', ko: 'san', zh: 'shān', ar: 'jabal', hi: 'pahaad' } },
  { word: 'rain', emoji: '\u{1F327}\ufe0f', translations: { es: 'lluvia', fr: 'pluie', de: 'Regen', it: 'pioggia', pt: 'chuva', ja: '\u96e8', ko: '\ube44', zh: '\u96e8', ru: '\u0434\u043e\u0436\u0434\u044c', ar: '\u0645\u0637\u0631', hi: '\u092c\u093e\u0930\u093f\u0936', tr: 'ya\u011fmur', nl: 'regen', pl: 'deszcz', uk: '\u0434\u043e\u0449', en: 'rain' }, transliterations: { ru: 'dozhd\'', uk: 'doshch', ja: 'ame', ko: 'bi', zh: 'yǔ', ar: 'matar', hi: 'baarish' } },
  { word: 'snow', emoji: '\u2744\ufe0f', translations: { es: 'nieve', fr: 'neige', de: 'Schnee', it: 'neve', pt: 'neve', ja: '\u96ea', ko: '\ub208', zh: '\u96ea', ru: '\u0441\u043d\u0435\u0433', ar: '\u062b\u0644\u062c', hi: '\u092c\u0930\u094d\u0966', tr: 'kar', nl: 'sneeuw', pl: '\u015bnieg', uk: '\u0441\u043d\u0456\u0433', en: 'snow' }, transliterations: { ru: 'sneg', uk: 'snih', ja: 'yuki', ko: 'nun', zh: 'xuě', ar: 'thalj', hi: 'barf' } },
  { word: 'hand', emoji: '\u270b', translations: { es: 'mano', fr: 'main', de: 'Hand', it: 'mano', pt: 'm\u00e3o', ja: '\u624b', ko: '\uc190', zh: '\u624b', ru: '\u0440\u0443\u043a\u0430', ar: '\u064a\u062f', hi: '\u0939\u093e\u0925', tr: 'el', nl: 'hand', pl: 'r\u0119ka', uk: '\u0440\u0443\u043a\u0430', en: 'hand' }, transliterations: { ru: 'ruka', uk: 'ruka', ja: 'te', ko: 'son', zh: 'shǒu', ar: 'yad', hi: 'haath' } },
  { word: 'eye', emoji: '\u{1F441}\ufe0f', translations: { es: 'ojo', fr: '\u0153il', de: 'Auge', it: 'occhio', pt: 'olho', ja: '\u76ee', ko: '\ub208', zh: '\u773c\u775b', ru: '\u0433\u043b\u0430\u0437', ar: '\u0639\u064a\u0646', hi: '\u0906\u0901\u0916', tr: 'g\u00f6z', nl: 'oog', pl: 'oko', uk: '\u043e\u043a\u043e', en: 'eye' }, transliterations: { ru: 'glaz', uk: 'oko', ja: 'me', ko: 'nun', zh: 'yǎnjīng', ar: 'ayn', hi: 'aankh' } },
  { word: 'music', emoji: '\u{1F3B5}', translations: { es: 'm\u00fasica', fr: 'musique', de: 'Musik', it: 'musica', pt: 'm\u00fasica', ja: '\u97f3\u697d', ko: '\uc74c\uc545', zh: '\u97f3\u4e50', ru: '\u043c\u0443\u0437\u044b\u043a\u0430', ar: '\u0645\u0648\u0633\u064a\u0642\u0649', hi: '\u0938\u0902\u0917\u0940\u0924', tr: 'm\u00fczik', nl: 'muziek', pl: 'muzyka', uk: '\u043c\u0443\u0437\u0438\u043a\u0430', en: 'music' }, transliterations: { ru: 'muzyka', uk: 'muzyka', ja: 'ongaku', ko: 'eumak', zh: 'yīnyuè', ar: 'moosiqa', hi: 'sangeet' } },
  { word: 'bird', emoji: '\u{1F426}', translations: { es: 'p\u00e1jaro', fr: 'oiseau', de: 'Vogel', it: 'uccello', pt: 'p\u00e1ssaro', ja: '\u9ce5', ko: '\uc0c8', zh: '\u9e1f', ru: '\u043f\u0442\u0438\u0446\u0430', ar: '\u0637\u0627\u0626\u0631', hi: '\u092a\u0915\u094d\u0937\u0940', tr: 'ku\u015f', nl: 'vogel', pl: 'ptak', uk: '\u043f\u0442\u0430\u0445', en: 'bird' }, transliterations: { ru: 'ptitsa', uk: 'ptakh', ja: 'tori', ko: 'sae', zh: 'niǎo', ar: 'taa\'ir', hi: 'pakshi' } },
  { word: 'clock', emoji: '\u{1F570}\ufe0f', translations: { es: 'reloj', fr: 'horloge', de: 'Uhr', it: 'orologio', pt: 'rel\u00f3gio', ja: '\u6642\u8a08', ko: '\uc2dc\uacc4', zh: '\u949f', ru: '\u0447\u0430\u0441\u044b', ar: '\u0633\u0627\u0639\u0629', hi: '\u0918\u0921\u093c\u0940', tr: 'saat', nl: 'klok', pl: 'zegar', uk: '\u0433\u043e\u0434\u0438\u043d\u043d\u0438\u043a', en: 'clock' }, transliterations: { ru: 'chasy', uk: 'hodynnyk', ja: 'tokei', ko: 'sigye', zh: 'zhōng', ar: 'saa\'a', hi: 'ghadi' } },
  { word: 'key', emoji: '\u{1F511}', translations: { es: 'llave', fr: 'cl\u00e9', de: 'Schl\u00fcssel', it: 'chiave', pt: 'chave', ja: '\u9375', ko: '\uc5f4\uc1e0', zh: '\u94a5\u5319', ru: '\u043a\u043b\u044e\u0447', ar: '\u0645\u0641\u062a\u0627\u062d', hi: '\u091a\u093e\u092c\u0940', tr: 'anahtar', nl: 'sleutel', pl: 'klucz', uk: '\u043a\u043b\u044e\u0447', en: 'key' }, transliterations: { ru: 'klyuch', uk: 'klyuch', ja: 'kagi', ko: 'yeolsoe', zh: 'yàoshi', ar: 'miftaah', hi: 'chaabi' } },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function getFlashCardRound(_nativeLang: string, targetLang: string, exclude?: FlashCard): FlashCardRound {
  // Pick a random card (different from the last one)
  const pool = exclude ? VOCAB.filter(c => c.word !== exclude.word) : VOCAB
  const card = pool[Math.floor(Math.random() * pool.length)]

  // Get the correct translation
  const correct = card.translations[targetLang] ?? card.translations.en
  const correctTranslit = card.transliterations?.[targetLang]

  // Pick a wrong answer from a different card
  const others = VOCAB.filter(c => c.word !== card.word)
  const wrongCard = others[Math.floor(Math.random() * others.length)]
  const wrong = wrongCard.translations[targetLang] ?? wrongCard.translations.en
  const wrongTranslit = wrongCard.transliterations?.[targetLang]

  // Randomly assign left/right
  const correctSide = Math.random() < 0.5 ? 'left' : 'right' as const
  return {
    card,
    correctSide,
    leftOption: correctSide === 'left' ? correct : wrong,
    rightOption: correctSide === 'right' ? correct : wrong,
    leftTranslit: correctSide === 'left' ? correctTranslit : wrongTranslit,
    rightTranslit: correctSide === 'right' ? correctTranslit : wrongTranslit,
  }
}

export function getCardDisplay(card: FlashCard, nativeLang: string): { text: string; emoji: string } {
  return {
    text: card.translations[nativeLang] ?? card.word,
    emoji: card.emoji,
  }
}

export { shuffle }
