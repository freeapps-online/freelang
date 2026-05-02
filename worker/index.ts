interface Env {
  DB: D1Database
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Device-Id',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)
    const path = url.pathname

    try {
      // Register / get user (anonymous — device ID based)
      if (path === '/api/user' && request.method === 'POST') {
        const { deviceId, displayName, nativeLang, targetLang } = await request.json() as {
          deviceId: string; displayName?: string; nativeLang?: string; targetLang?: string
        }
        if (!deviceId) return json({ error: 'deviceId required' }, 400)

        // Upsert user
        await env.DB.prepare(`
          INSERT INTO users (id, display_name, native_lang, target_lang)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            display_name = COALESCE(excluded.display_name, display_name),
            native_lang = COALESCE(excluded.native_lang, native_lang),
            target_lang = COALESCE(excluded.target_lang, target_lang),
            updated_at = datetime('now')
        `).bind(deviceId, displayName ?? 'Learner', nativeLang ?? 'en', targetLang ?? 'es').run()

        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(deviceId).first()
        return json(user)
      }

      // Update score after card answer
      if (path === '/api/score' && request.method === 'POST') {
        const { deviceId, word, correct } = await request.json() as {
          deviceId: string; word: string; correct: boolean
        }
        if (!deviceId || !word) return json({ error: 'deviceId and word required' }, 400)

        // Update word stats
        await env.DB.prepare(`
          INSERT INTO word_stats (user_id, word, correct, wrong, last_seen)
          VALUES (?, ?, ?, ?, datetime('now'))
          ON CONFLICT(user_id, word) DO UPDATE SET
            correct = correct + ?,
            wrong = wrong + ?,
            last_seen = datetime('now')
        `).bind(deviceId, word, correct ? 1 : 0, correct ? 0 : 1, correct ? 1 : 0, correct ? 0 : 1).run()

        // Update user totals
        if (correct) {
          await env.DB.prepare(`
            UPDATE users SET
              total_score = total_score + 10,
              streak = streak + 1,
              best_streak = MAX(best_streak, streak + 1),
              updated_at = datetime('now')
            WHERE id = ?
          `).bind(deviceId).run()
        } else {
          await env.DB.prepare(`
            UPDATE users SET streak = 0, updated_at = datetime('now') WHERE id = ?
          `).bind(deviceId).run()
        }

        return json({ ok: true })
      }

      // Update sentence score
      if (path === '/api/sentence-score' && request.method === 'POST') {
        const { deviceId, sentenceId, score } = await request.json() as {
          deviceId: string; sentenceId: string; score: number
        }
        if (!deviceId || !sentenceId) return json({ error: 'deviceId and sentenceId required' }, 400)

        await env.DB.prepare(`
          INSERT INTO sentence_stats (user_id, sentence_id, attempts, best_score, total_score, last_seen)
          VALUES (?, ?, 1, ?, ?, datetime('now'))
          ON CONFLICT(user_id, sentence_id) DO UPDATE SET
            attempts = attempts + 1,
            best_score = MAX(best_score, ?),
            total_score = total_score + ?,
            last_seen = datetime('now')
        `).bind(deviceId, sentenceId, score, score, score, score).run()

        await env.DB.prepare(`
          UPDATE users SET
            sentences_practiced = sentences_practiced + 1,
            total_score = total_score + ?,
            updated_at = datetime('now')
          WHERE id = ?
        `).bind(Math.round(score / 10), deviceId).run()

        return json({ ok: true })
      }

      // Leaderboard
      if (path === '/api/leaderboard') {
        const sort = url.searchParams.get('sort') ?? 'total_score'
        const allowed = ['total_score', 'words_learned', 'best_streak', 'sentences_practiced']
        const col = allowed.includes(sort) ? sort : 'total_score'
        const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100)

        const { results } = await env.DB.prepare(
          `SELECT id, display_name, avatar_url, total_score, words_learned, sentences_practiced, streak, best_streak, games_played, games_won
           FROM users WHERE total_score > 0 ORDER BY ${col} DESC LIMIT ?`
        ).bind(limit).all()

        return json(results)
      }

      // My stats
      if (path === '/api/my-stats') {
        const deviceId = url.searchParams.get('deviceId')
        if (!deviceId) return json({ error: 'deviceId required' }, 400)

        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(deviceId).first()
        if (!user) return json({ error: 'not found' }, 404)

        const { results: wordStats } = await env.DB.prepare(
          'SELECT * FROM word_stats WHERE user_id = ? ORDER BY last_seen DESC'
        ).bind(deviceId).all()

        const { results: sentenceStats } = await env.DB.prepare(
          'SELECT * FROM sentence_stats WHERE user_id = ? ORDER BY last_seen DESC'
        ).bind(deviceId).all()

        return json({ user, wordStats, sentenceStats })
      }

      return json({ error: 'not found' }, 404)
    } catch (e) {
      return json({ error: String(e) }, 500)
    }
  },
}
