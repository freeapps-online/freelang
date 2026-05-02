-- Users: anonymous for free app (device_id), registered for pro app
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'Learner',
  avatar_url TEXT,
  native_lang TEXT NOT NULL DEFAULT 'en',
  target_lang TEXT NOT NULL DEFAULT 'es',
  total_score INTEGER NOT NULL DEFAULT 0,
  words_learned INTEGER NOT NULL DEFAULT 0,
  sentences_practiced INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Per-word stats
CREATE TABLE IF NOT EXISTS word_stats (
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  correct INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, word),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Per-sentence stats
CREATE TABLE IF NOT EXISTS sentence_stats (
  user_id TEXT NOT NULL,
  sentence_id TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, sentence_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_score ON users(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_users_words ON users(words_learned DESC);
CREATE INDEX IF NOT EXISTS idx_users_streak ON users(best_streak DESC);
