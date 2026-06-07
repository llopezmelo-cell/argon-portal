// Service Worker — ARGon Portal
// Offline-first: cachea la app y los documentos

const CACHE_VERSION = 'argon-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const DOCS_CACHE   = `${CACHE_VERSION}-docs`
const DATA_CACHE   = `${CACHE_VERSION}-data`

// Archivos estáticos a cachear siempre
const STATIC_ASSETS = [
  '/',
  '/login',
  '/dashboard',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ── Instalación ────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ── Activación: limpiar caches viejos ─────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('argon-') && k !== STATIC_CACHE && k !== DOCS_CACHE && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch: estrategia por tipo de recurso ─────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // PDFs de documentos → cache first (offline-first)
  if (url.pathname.startsWith('/api/documents/') || url.hostname.includes('supabase')) {
    event.respondWith(cacheFirst(event.request, DOCS_CACHE))
    return
  }

  // API de datos → network first con fallback a cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request, DATA_CACHE))
    return
  }

  // Recursos estáticos → cache first
  event.respondWith(cacheFirst(event.request, STATIC_CACHE))
})

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Sin conexión', { status: 503 })
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response(JSON.stringify({ error: 'Sin conexión', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// ── Push notifications ─────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'argon-notif',
      data: data.url,
      actions: data.actions || [],
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// ── Sync en background (cuando vuelve la conexión) ────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData())
  }
})

async function syncData() {
  try {
    await fetch('/api/sync', { method: 'POST' })
  } catch {
    // Reintentar en próxima oportunidad
  }
}
