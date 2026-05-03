# FreeLanguageApp Architecture

## Two Apps

| | Free App | Pro App |
|---|---|---|
| Domain | freelanguageapp.online | prolanguageapp.online |
| Repo | languagua-app/freelanguageapp → freeapps-online/freelang | languagua-app/prolanguageapp |
| Hosting | Cloudflare Pages | Cloudflare Pages |
| Backend | Cloudflare Workers + D1 | Cloudflare Workers + D1 (planned) |
| Auth | Anonymous (device ID) | Google Sign-In (Firebase, migrating to CF) |
| Cost | Free tier only | Free tier + paid features |

## Free App — Tabs

### 1. Cards (Flashcards)
- **What**: Show a word in target language, swipe left/right to choose the native language meaning
- **Content**: 1000 words across 20 levels, 50 words per level
- **Levels**: Basics, Daily Life, Actions, Society, Nature, Food, Sports, School, Shopping, Home, Health, City, Environment, Animals, Feelings, Work, Media, Time, Relationships, Abstract
- **Smart selection**: Weighted by error rate + time since last seen. Words you struggle with appear more often
- **Transliteration**: Runtime library (`transliteration` npm) for non-Latin scripts — no baked data
- **Audio**: Browser TTS, tap card to replay, mute toggle in top bar
- **Listen-only mode**: Hides card text, forces answer from audio only
- **Dictionary**: Tap emoji to look up word definition/synonyms/translations
- **Stats**: Per-word correct/wrong tracking in localStorage, sortable stats panel
- **Cloud**: Anonymous device-ID, scores reported to Cloudflare D1

### 2. Spelling (Missing Letters)
- **What**: Word shown with missing letters, swipe to choose the correct letter
- **Content**: Same 1000 words as flashcards
- **Scoring**: Same per-word stats system

### 3. Cloze (Fill in the Blank)
- **What**: Sentence with a missing word, swipe to choose the correct word
- **Content**: Sentence data with gaps
- **Voice mode**: Say the missing word instead of swiping

### 4. Sentences (Speak)
- **What**: Hear a sentence in target language, speak it back, get word-by-word scoring
- **Content**: 400 sentences across 20 levels, 20 sentences per level
- **Scoring**: Web Speech API transcribes user attempt, compared word-by-word
- **Real-time**: Shows transcription as you speak (blue italic)
- **Word diff**: Green (correct) / red (wrong) per word, shows what was misheard
- **Smart selection**: Weighted by average score + time since last seen
- **Stats**: Per-sentence tracking (attempts, best/avg/last score)

### 5. Preferences
- Theme (system/light/dark), label size, content size, motion, surface
- Language defaults (native + target)
- Audio toggle, input mode (keyboard/voice)
- Pro app promotion link

## Pro App — Tabs

### 1. Practice
- Voice loop: speak in native → hear translation → repeat in target → score
- **Requires**: Translation API (not yet integrated)

### 2. Translate
- Dual-mic live translation between two people
- **Requires**: Translation API (not yet integrated)

### 3. Conversation
- AI chat partner in target language
- **Requires**: LLM API (not yet integrated)

### 4. Leaderboard
- Real-time scoreboard with Google Sign-In
- Sort by score, words learned, best streak
- Firebase Firestore (migrating to Cloudflare D1)

### 5. Preferences
- Same as free app + account management

## Tech Stack

### Frontend
- React 19 + TypeScript 6
- Vite 8 (build tool)
- Tailwind CSS v4 (styling — `@layer base` required for cascade)
- No router library — History API + `window.location.pathname`

### Backend
- **Cloudflare Workers**: REST API (`freelang-api.serge-the-dev.workers.dev`)
- **Cloudflare D1**: SQLite database (users, word_stats, sentence_stats)
- **Firebase** (pro app only): Auth + Firestore (planned migration to CF)

### Data
- Vocabulary: TypeScript files in `web/src/data/level{1-20}.ts`
- Sentences: TypeScript files in `web/src/data/sentences{1-20}.ts`
- Each file code-split by Vite (lazy loaded ~7-8KB gzipped each)
- All preloaded in background via `requestIdleCallback`

### PWA
- Service worker: network-first for assets, SPA fallback for navigation
- Manifest: standalone, portrait, starts at /cards
- Works offline after first visit

## Mobile UI Rules

1. **Top bar**: ALL control buttons (flag, level, mode, mute, headphones, stats)
2. **Middle**: ONLY cards + feedback text + action buttons (mic/speaker/next)
3. **Bottom bar**: Tab navigation (icons only, no labels)
4. **No vertical scroll** on practice tabs (`overflow: hidden`)
5. **No text selection** (`user-select: none`, except inputs)
6. **No zoom** (`touch-action: manipulation`)
7. **Dark Reader blocked** (`<meta name="darkreader-lock">`)

## Cloud API

### Endpoints (Workers)
- `POST /api/user` — Register/update anonymous user (device ID)
- `POST /api/score` — Report card answer (word, correct/wrong)
- `POST /api/sentence-score` — Report sentence attempt (id, score)
- `GET /api/leaderboard` — Top users sorted by score/words/streak
- `GET /api/my-stats` — User's word + sentence stats from cloud

### Database (D1)
- `users` — id, display_name, total_score, words_learned, streak, etc.
- `word_stats` — user_id, word, correct, wrong, last_seen
- `sentence_stats` — user_id, sentence_id, attempts, best_score, total_score

## Key Design Decisions

- **No registration for free app** — anonymous device ID, zero friction
- **All data local-first** — localStorage for stats, cloud sync is fire-and-forget
- **Code-split vocabulary** — each level loads on demand, cached by service worker
- **Runtime transliteration** — npm library, not baked into word data
- **Browser TTS** — free, works offline. Kokoro TTS reserved for pro app
- **Cloudflare free tier** — hard limits, no surprise charges
- **Single codebase** — responsive, not separate mobile/desktop apps
