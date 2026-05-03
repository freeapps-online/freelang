import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getTranslit } from '../src/services/translit.ts'
import { LEVEL_LABELS } from '../src/services/vocabulary.ts'
import { LANGUAGES, type FlashCard, type Sentence } from '../src/types.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const webRoot = path.resolve(__dirname, '..')
const dataDir = path.join(webRoot, 'src', 'data')
const publicDir = path.join(webRoot, 'public')
const learnDir = path.join(publicDir, 'learn')
const siteUrl = 'https://freelanguageapp.online'

const targetLanguages = LANGUAGES.filter((language) => language.code !== 'en')
const rtlLanguages = new Set(['ar'])

type WordAggregate = {
  key: string
  emoji: string
  levels: number[]
  translations: Record<string, string>
  transliterations?: Record<string, string>
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sentenceContainsWord(sentence: string, word: string): boolean {
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escapedWord}\\b`, 'i').test(sentence)
}

function textDir(langCode: string): 'ltr' | 'rtl' {
  return rtlLanguages.has(langCode) ? 'rtl' : 'ltr'
}

function languagePath(languageName: string): string {
  return `/learn/${slugify(languageName)}/`
}

function levelPath(languageName: string, level: number): string {
  return `${languagePath(languageName)}level-${level}-${slugify(LEVEL_LABELS[level])}/`
}

function wordPath(languageName: string, wordKey: string): string {
  return `${languagePath(languageName)}words/${slugify(wordKey)}/`
}

function pageUrl(pathname: string): string {
  return `${siteUrl}${pathname}`
}

function asDir(...segments: string[]): string {
  return path.join(learnDir, ...segments)
}

function descriptionForLevel(languageName: string, level: number, wordCount: number, sentenceCount: number): string {
  return `Study ${wordCount} ${languageName} words and ${sentenceCount} example sentences in Level ${level} ${LEVEL_LABELS[level]}. Free written lesson, vocabulary list, transliterations, and practice prompts.`
}

function introForLanguage(languageName: string, totalWords: number, totalSentences: number): string {
  return `Explore ${languageName} with structured vocabulary lists, short example sentences, and level-by-level study guides built from our app dataset. This hub currently includes ${totalWords} words and ${totalSentences} translated example sentences.`
}

function renderLayout({
  title,
  description,
  pathname,
  heading,
  eyebrow,
  body,
  jsonLd,
}: {
  title: string
  description: string
  pathname: string
  heading: string
  eyebrow: string
  body: string
  jsonLd?: object
}): string {
  const canonical = pageUrl(pathname)
  const jsonLdMarkup = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:site_name" content="FreeLanguageApp.online" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <style>
      :root {
        color-scheme: light;
        --paper: #fffdf8;
        --ink: #15120f;
        --muted: #6b6257;
        --line: rgba(21, 18, 15, 0.09);
        --panel: rgba(255, 255, 255, 0.88);
        --accent: #da5b37;
        --accent-soft: #f7ddc9;
        --shadow: 0 18px 45px rgba(85, 58, 26, 0.08);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Manrope, system-ui, sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(218, 91, 55, 0.08), transparent 24%),
          radial-gradient(circle at top right, rgba(77, 112, 220, 0.08), transparent 24%),
          linear-gradient(180deg, #fffdf8 0%, #fbf7ef 100%);
        line-height: 1.6;
      }
      a { color: inherit; }
      .shell { width: min(1120px, calc(100% - 2rem)); margin: 0 auto; padding: 1.25rem 0 3rem; }
      .nav {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
        padding: 1rem 1.2rem;
        border: 1px solid var(--line);
        border-radius: 1.25rem;
        background: rgba(255,255,255,0.72);
        backdrop-filter: blur(18px);
        box-shadow: var(--shadow);
      }
      .brand { font-weight: 800; letter-spacing: -0.02em; text-decoration: none; }
      .nav-links { display: flex; flex-wrap: wrap; gap: 0.8rem; font-size: 0.95rem; color: var(--muted); }
      .hero {
        margin-top: 1.25rem;
        border: 1px solid var(--line);
        border-radius: 1.8rem;
        padding: 1.75rem;
        background: linear-gradient(135deg, rgba(218, 91, 55, 0.12), rgba(255,255,255,0.92));
        box-shadow: var(--shadow);
      }
      .eyebrow { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
      h1 { margin: 0.55rem 0 0; font-size: clamp(2rem, 5vw, 3.7rem); line-height: 0.98; letter-spacing: -0.05em; font-family: Fraunces, Georgia, serif; }
      .lead { max-width: 54rem; margin: 1rem 0 0; font-size: 1.02rem; color: var(--muted); }
      .actions { display: flex; flex-wrap: wrap; gap: 0.8rem; margin-top: 1.2rem; }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.85rem 1.05rem;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 700;
      }
      .button-primary { background: var(--ink); color: white; }
      .button-secondary { background: white; border: 1px solid var(--line); }
      .grid { display: grid; gap: 1rem; }
      .grid-2 { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
      .grid-3 { grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
      .card {
        border: 1px solid var(--line);
        border-radius: 1.35rem;
        padding: 1rem 1.05rem;
        background: var(--panel);
        box-shadow: var(--shadow);
      }
      section { margin-top: 1.15rem; }
      h2 { margin: 0 0 0.6rem; font-size: 1.45rem; letter-spacing: -0.03em; }
      h3 { margin: 0 0 0.35rem; font-size: 1.05rem; letter-spacing: -0.02em; }
      p { margin: 0.45rem 0; }
      .muted { color: var(--muted); }
      .stats { display: grid; gap: 0.8rem; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
      .stat-value { font-size: 1.8rem; font-weight: 800; line-height: 1; }
      .pill { display: inline-block; padding: 0.32rem 0.62rem; border-radius: 999px; background: var(--accent-soft); font-size: 0.76rem; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 0.7rem 0.55rem; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
      th { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
      ul.clean { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }
      .sentence { padding: 0.95rem 1rem; border: 1px solid var(--line); border-radius: 1rem; background: rgba(255,255,255,0.7); }
      .sentence strong { display: block; }
      .small { font-size: 0.92rem; }
      footer { margin-top: 2rem; color: var(--muted); font-size: 0.92rem; }
      .word-grid { display: grid; gap: 0.85rem; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
      .word-card { border: 1px solid var(--line); border-radius: 1rem; padding: 0.9rem; background: rgba(255,255,255,0.72); }
      .word-main { display: flex; align-items: center; gap: 0.65rem; font-size: 1.05rem; font-weight: 700; }
      .emoji { font-size: 1.35rem; }
      .breadcrumbs { margin-top: 0.8rem; color: var(--muted); font-size: 0.9rem; }
      .breadcrumbs a { text-decoration: none; }
      @media (max-width: 640px) {
        .shell { width: min(100% - 1rem, 1120px); }
        .hero { padding: 1.2rem; border-radius: 1.35rem; }
        .nav { padding: 0.9rem 1rem; }
      }
    </style>
    ${jsonLdMarkup}
  </head>
  <body>
    <div class="shell">
      <nav class="nav">
        <a class="brand" href="/">FreeLanguageApp.online</a>
        <div class="nav-links">
          <a href="/learn/">Learn Hub</a>
          <a href="/cards">Flashcards</a>
          <a href="/speak">Speak Practice</a>
          <a href="/preferences">Preferences</a>
        </div>
      </nav>
      <header class="hero">
        <div class="eyebrow">${escapeHtml(eyebrow)}</div>
        <h1>${escapeHtml(heading)}</h1>
        <p class="lead">${escapeHtml(description)}</p>
        <div class="actions">
          <a class="button button-primary" href="/cards">Open Flashcards</a>
          <a class="button button-secondary" href="/speak">Try Speak Mode</a>
        </div>
      </header>
      ${body}
      <footer>
        <p>These lesson pages are generated from the same vocabulary and sentence datasets used inside FreeLanguageApp.online.</p>
      </footer>
    </div>
  </body>
</html>`
}

async function loadModules<T>(prefix: 'level' | 'sentences'): Promise<Record<number, T[]>> {
  const files = (await readdir(dataDir))
    .filter((file) => new RegExp(`^${prefix}\\d+\\.ts$`).test(file))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0))

  const modules: Record<number, T[]> = {}
  for (const file of files) {
    const match = file.match(/(\d+)/)
    if (!match) continue
    const level = Number(match[1])
    const moduleUrl = pathToFileURL(path.join(dataDir, file)).href
    const mod = await import(moduleUrl)
    modules[level] = mod.default as T[]
  }
  return modules
}

function buildWordIndex(levelWords: Record<number, FlashCard[]>): WordAggregate[] {
  const map = new Map<string, WordAggregate>()
  for (const [levelText, words] of Object.entries(levelWords)) {
    const level = Number(levelText)
    for (const word of words) {
      const existing = map.get(word.word)
      if (existing) {
        if (!existing.levels.includes(level)) existing.levels.push(level)
      } else {
        map.set(word.word, {
          key: word.word,
          emoji: word.emoji,
          levels: [level],
          translations: word.translations,
          transliterations: word.transliterations,
        })
      }
    }
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

async function writeGeneratedFile(filePath: string, content: string) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, content, 'utf8')
}

function renderWordCards(words: WordAggregate[], languageCode: string): string {
  return `<div class="word-grid">${words.map((word) => {
    const target = word.translations[languageCode] ?? word.key
    const translit = word.transliterations?.[languageCode] ?? getTranslit(target, languageCode)
    return `<article class="word-card">
      <div class="word-main"><span class="emoji">${escapeHtml(word.emoji)}</span><span dir="${textDir(languageCode)}">${escapeHtml(target)}</span></div>
      <div class="small muted">${escapeHtml(word.key)}</div>
      ${translit ? `<div class="small">Transliteration: ${escapeHtml(translit)}</div>` : ''}
      <div class="small muted">Appears in levels ${word.levels.join(', ')}</div>
    </article>`
  }).join('')}</div>`
}

function renderSentences(sentences: Sentence[], languageCode: string): string {
  return `<div class="grid">${sentences.map((sentence) => {
    const target = sentence.text[languageCode] ?? sentence.text.en ?? ''
    return `<article class="sentence">
      <strong dir="${textDir(languageCode)}">${escapeHtml(sentence.emoji)} ${escapeHtml(target)}</strong>
      <div class="muted">${escapeHtml(sentence.text.en ?? '')}</div>
    </article>`
  }).join('')}</div>`
}

async function generate() {
  const levelWords = await loadModules<FlashCard>('level')
  const levelSentences = await loadModules<Sentence>('sentences')
  const wordIndex = buildWordIndex(levelWords)

  await rm(learnDir, { recursive: true, force: true })

  const urls: string[] = []
  const totalSentenceCount = Object.values(levelSentences).reduce((sum, sentences) => sum + sentences.length, 0)

  const learnHubPath = '/learn/'
  urls.push(pageUrl(learnHubPath))
  await writeGeneratedFile(path.join(learnDir, 'index.html'), renderLayout({
    title: 'Free Language Lessons by Level and Topic | FreeLanguageApp.online',
    description: `Browse static lesson pages built from our flashcard and phrase datasets. Study ${targetLanguages.length} target languages with vocabulary levels, example sentences, and word guides.`,
    pathname: learnHubPath,
    heading: 'Free language lesson pages built from real app data',
    eyebrow: 'Learn Hub',
    body: `
      <section class="card">
        <h2>Language guides</h2>
        <p class="muted">These pages turn our existing flashcard and sentence datasets into search-friendly written lessons. Each language hub includes level-based vocabulary, example sentences, and linked word guides.</p>
        <div class="grid grid-3">
          ${targetLanguages.map((language) => {
            const wordCount = wordIndex.filter((word) => word.translations[language.code]).length
            return `<a class="card" href="${languagePath(language.name)}">
              <div class="pill">${escapeHtml(language.name)}</div>
              <h3>${escapeHtml(language.flag)} Learn ${escapeHtml(language.name)}</h3>
              <p class="muted small">${wordCount} translated words, ${totalSentenceCount} sentence examples, 20 levels.</p>
            </a>`
          }).join('')}
        </div>
      </section>`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Free language lessons by level and topic',
      url: pageUrl(learnHubPath),
      description: 'Static lesson pages built from the FreeLanguageApp.online dataset.',
    },
  }))

  for (const language of targetLanguages) {
    const langWords = wordIndex.filter((word) => word.translations[language.code])
    const langHubPath = languagePath(language.name)
    const commonWordsPath = `${langHubPath}common-words/`
    const sentenceGuidePath = `${langHubPath}example-sentences/`

    urls.push(pageUrl(langHubPath), pageUrl(commonWordsPath), pageUrl(sentenceGuidePath))

    const featuredWords = langWords.slice(0, 8)
    await writeGeneratedFile(asDir(slugify(language.name), 'index.html'), renderLayout({
      title: `Learn ${language.name} Vocabulary, Sentences, and Levels | FreeLanguageApp.online`,
      description: introForLanguage(language.name, langWords.length, totalSentenceCount),
      pathname: langHubPath,
      heading: `Learn ${language.name} with free level-by-level lesson pages`,
      eyebrow: `${language.name} Guide`,
      body: `
        <section class="card">
          <div class="stats">
            <div><div class="stat-value">${langWords.length}</div><div class="muted small">unique words</div></div>
            <div><div class="stat-value">${totalSentenceCount}</div><div class="muted small">example sentences</div></div>
            <div><div class="stat-value">${Object.keys(levelWords).length}</div><div class="muted small">study levels</div></div>
          </div>
        </section>
        <section class="grid grid-2">
          <a class="card" href="${commonWordsPath}">
            <h2>Common ${escapeHtml(language.name)} words</h2>
            <p class="muted">Alphabetical vocabulary guide with transliterations and level links.</p>
          </a>
          <a class="card" href="${sentenceGuidePath}">
            <h2>${escapeHtml(language.name)} example sentences</h2>
            <p class="muted">Browse the short phrase dataset grouped for reading and pattern spotting.</p>
          </a>
        </section>
        <section class="card">
          <h2>Featured ${escapeHtml(language.name)} words</h2>
          <p class="muted">A quick sample of the vocabulary inventory already available in the app.</p>
          ${renderWordCards(featuredWords, language.code)}
        </section>
        <section class="card">
          <h2>All 20 levels</h2>
          <div class="grid grid-2">
            ${Object.keys(levelWords).map((levelText) => {
              const level = Number(levelText)
              const words = levelWords[level]
              const sentences = levelSentences[level] ?? []
              return `<a class="card" href="${levelPath(language.name, level)}">
                <div class="pill">Level ${level}</div>
                <h3>${escapeHtml(LEVEL_LABELS[level])}</h3>
                <p class="muted small">${words.length} words, ${sentences.length} sentences, transliterations where available.</p>
              </a>`
            }).join('')}
          </div>
        </section>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'LearningResource',
        name: `Learn ${language.name} vocabulary, sentences, and levels`,
        educationalLevel: 'beginner to intermediate',
        inLanguage: language.code,
        url: pageUrl(langHubPath),
      },
    }))

    await writeGeneratedFile(asDir(slugify(language.name), 'common-words', 'index.html'), renderLayout({
      title: `${language.name} Common Words List with Transliteration | FreeLanguageApp.online`,
      description: `Browse ${langWords.length} ${language.name} vocabulary items from our current dataset, with English meanings, transliterations where available, and links back to level lessons.`,
      pathname: commonWordsPath,
      heading: `${language.name} common words from our flashcard dataset`,
      eyebrow: `${language.name} Vocabulary Guide`,
      body: `
        <section class="card">
          <div class="breadcrumbs"><a href="/learn/">Learn Hub</a> / <a href="${langHubPath}">${escapeHtml(language.name)}</a> / Common words</div>
          <p class="muted">Use this page as a reading-first reference before moving into the app’s interactive flashcards.</p>
        </section>
        <section class="card">
          <h2>Vocabulary list</h2>
          ${renderWordCards(langWords, language.code)}
        </section>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `${language.name} common words list with transliteration`,
        inLanguage: 'en',
        url: pageUrl(commonWordsPath),
      },
    }))

    const allSentences = Object.keys(levelSentences)
      .flatMap((levelText) => (levelSentences[Number(levelText)] ?? []).map((sentence) => ({ level: Number(levelText), sentence })))

    await writeGeneratedFile(asDir(slugify(language.name), 'example-sentences', 'index.html'), renderLayout({
      title: `${language.name} Example Sentences by Level | FreeLanguageApp.online`,
      description: `Read ${totalSentenceCount} short ${language.name} example sentences from our lesson dataset, with English meanings and links back to the matching vocabulary levels.`,
      pathname: sentenceGuidePath,
      heading: `${language.name} example sentences for reading practice`,
      eyebrow: `${language.name} Sentence Guide`,
      body: `
        <section class="card">
          <div class="breadcrumbs"><a href="/learn/">Learn Hub</a> / <a href="${langHubPath}">${escapeHtml(language.name)}</a> / Example sentences</div>
          <p class="muted">These short sentences are designed to stay readable and level-appropriate. They mirror the speaking practice dataset inside the app.</p>
        </section>
        <section class="card">
          <h2>Sentence bank</h2>
          <ul class="clean">
            ${allSentences.map(({ level, sentence }) => {
              const target = sentence.text[language.code] ?? sentence.text.en ?? ''
              return `<li class="sentence">
                <div class="pill">Level ${level} · ${escapeHtml(LEVEL_LABELS[level])}</div>
                <strong dir="${textDir(language.code)}">${escapeHtml(sentence.emoji)} ${escapeHtml(target)}</strong>
                <div class="muted">${escapeHtml(sentence.text.en ?? '')}</div>
                <div class="small"><a href="${levelPath(language.name, level)}">Open the full level lesson</a></div>
              </li>`
            }).join('')}
          </ul>
        </section>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `${language.name} example sentences by level`,
        url: pageUrl(sentenceGuidePath),
      },
    }))

    for (const levelText of Object.keys(levelWords)) {
      const level = Number(levelText)
      const words = levelWords[level]
      const sentences = levelSentences[level] ?? []
      const currentWords = words.filter((word) => word.translations[language.code])
      const currentSentences = sentences.filter((sentence) => sentence.text[language.code])
      const pathName = levelPath(language.name, level)
      urls.push(pageUrl(pathName))

      await writeGeneratedFile(asDir(slugify(language.name), `level-${level}-${slugify(LEVEL_LABELS[level])}`, 'index.html'), renderLayout({
        title: `Learn ${language.name} Level ${level} ${LEVEL_LABELS[level]} | FreeLanguageApp.online`,
        description: descriptionForLevel(language.name, level, currentWords.length, currentSentences.length),
        pathname: pathName,
        heading: `${language.name} Level ${level}: ${LEVEL_LABELS[level]}`,
        eyebrow: `Level ${level} Lesson`,
        body: `
          <section class="card">
            <div class="breadcrumbs"><a href="/learn/">Learn Hub</a> / <a href="${langHubPath}">${escapeHtml(language.name)}</a> / Level ${level}</div>
            <p class="muted">This lesson combines the written vocabulary list and the matching sentence pack from the app’s current dataset. Use it as a quick reading guide, then jump into flashcards for active recall.</p>
          </section>
          <section class="card">
            <h2>${escapeHtml(language.name)} words for ${escapeHtml(LEVEL_LABELS[level])}</h2>
            ${renderWordCards(currentWords.map((word) => ({
              key: word.word,
              emoji: word.emoji,
              levels: [level],
              translations: word.translations,
              transliterations: word.transliterations,
            })), language.code)}
          </section>
          <section class="card">
            <h2>${escapeHtml(language.name)} example sentences</h2>
            ${renderSentences(currentSentences, language.code)}
          </section>
          <section class="card">
            <h2>Next step</h2>
            <p class="muted">After reading this lesson, use the app to hear the words, repeat them aloud, and practice active recall with keyboard or voice mode.</p>
            <div class="actions">
              <a class="button button-primary" href="/cards">Practice these flashcards</a>
              <a class="button button-secondary" href="${commonWordsPath}">Browse all ${escapeHtml(language.name)} words</a>
            </div>
          </section>`,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'LearningResource',
          name: `Learn ${language.name} Level ${level} ${LEVEL_LABELS[level]}`,
          educationalLevel: `Level ${level}`,
          inLanguage: language.code,
          url: pageUrl(pathName),
        },
      }))
    }

    for (const word of langWords) {
      const pathName = wordPath(language.name, word.key)
      urls.push(pageUrl(pathName))

      const target = word.translations[language.code] ?? word.key
      const translit = word.transliterations?.[language.code] ?? getTranslit(target, language.code)
      const matchingSentences = Object.values(levelSentences)
        .flatMap((sentences) => sentences)
        .filter((sentence) => sentenceContainsWord(sentence.text.en ?? '', word.key))
        .slice(0, 6)

      await writeGeneratedFile(asDir(slugify(language.name), 'words', slugify(word.key), 'index.html'), renderLayout({
        title: `${target} meaning in ${language.name} | FreeLanguageApp.online`,
        description: `Learn how to say ${word.key} in ${language.name}. Includes the translated word, transliteration when available, level links, and matching example sentences from the dataset.`,
        pathname: pathName,
        heading: `${word.key} in ${language.name}`,
        eyebrow: `${language.name} Word Guide`,
        body: `
          <section class="card">
            <div class="breadcrumbs"><a href="/learn/">Learn Hub</a> / <a href="${langHubPath}">${escapeHtml(language.name)}</a> / <a href="${commonWordsPath}">Common words</a> / ${escapeHtml(word.key)}</div>
            <div class="word-main"><span class="emoji">${escapeHtml(word.emoji)}</span><span dir="${textDir(language.code)}">${escapeHtml(target)}</span></div>
            <p class="muted">English meaning: ${escapeHtml(word.key)}</p>
            ${translit ? `<p>Transliteration: <strong>${escapeHtml(translit)}</strong></p>` : ''}
            <p class="small muted">Appears in level${word.levels.length === 1 ? '' : 's'} ${word.levels.join(', ')}.</p>
          </section>
          <section class="card">
            <h2>Translation set</h2>
            <table>
              <thead><tr><th>Language</th><th>Translation</th></tr></thead>
              <tbody>
                ${LANGUAGES.map((entry) => `<tr><td>${escapeHtml(entry.name)}</td><td dir="${textDir(entry.code)}">${escapeHtml(word.translations[entry.code] ?? word.key)}</td></tr>`).join('')}
              </tbody>
            </table>
          </section>
          <section class="card">
            <h2>Where to study this word</h2>
            <ul class="clean">
              ${word.levels.map((level) => `<li><a href="${levelPath(language.name, level)}">Level ${level}: ${escapeHtml(LEVEL_LABELS[level])}</a></li>`).join('')}
            </ul>
          </section>
          ${matchingSentences.length > 0 ? `<section class="card">
            <h2>Example sentences</h2>
            ${renderSentences(matchingSentences, language.code)}
          </section>` : ''}
        `,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'DefinedTerm',
          name: target,
          description: `${word.key} in ${language.name}`,
          inDefinedTermSet: pageUrl(commonWordsPath),
          url: pageUrl(pathName),
        },
      }))
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}
</urlset>
`

  await writeGeneratedFile(path.join(publicDir, 'sitemap.xml'), sitemap)
  await writeGeneratedFile(path.join(publicDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`)

  console.log(`Generated ${urls.length} SEO pages and sitemap entries.`)
}

await generate()
