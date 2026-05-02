const API = 'https://freelang-api.serge-the-dev.workers.dev'

function getDeviceId(): string {
  let id = localStorage.getItem('freelang-device-id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('freelang-device-id', id)
  }
  return id
}

async function post(path: string, body: Record<string, unknown>) {
  try {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId(), ...body }),
    })
    return res.ok ? await res.json() : null
  } catch { return null }
}

async function get(path: string, params?: Record<string, string>) {
  try {
    const url = new URL(`${API}${path}`)
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    const res = await fetch(url)
    return res.ok ? await res.json() : null
  } catch { return null }
}

// Register device on first use
export async function registerDevice(displayName: string, nativeLang: string, targetLang: string) {
  return post('/api/user', { displayName, nativeLang, targetLang })
}

// Report a card answer
export async function reportCardScore(word: string, correct: boolean) {
  return post('/api/score', { word, correct })
}

// Report a sentence attempt
export async function reportSentenceScore(sentenceId: string, score: number) {
  return post('/api/sentence-score', { sentenceId, score })
}

// Get leaderboard
export async function fetchLeaderboard(sort = 'total_score', limit = 50) {
  return get('/api/leaderboard', { sort, limit: String(limit) })
}

// Get my cloud stats
export async function fetchMyStats() {
  return get('/api/my-stats', { deviceId: getDeviceId() })
}

export { getDeviceId }
