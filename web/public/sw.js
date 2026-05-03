const CACHE = 'freelang-v5'

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/']))
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)

  // SPA navigation: always network-first, never serve stale index.html
  if (e.request.mode === 'navigate' && url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put('/', clone))
          return res
        })
        .catch(() => caches.match('/'))
    )
    return
  }

  // Hashed assets (contain hash in filename): cache-first (immutable)
  if (url.origin === self.location.origin && url.pathname.match(/\/assets\/.+-[a-zA-Z0-9_-]{8}\./)) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached
        return fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((cache) => cache.put(e.request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // Other assets: network-first
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
