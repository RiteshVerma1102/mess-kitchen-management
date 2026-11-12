// Service Worker for Smart Mess Offline PWA
const CACHE_NAME = 'smart-mess-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/dashboard',
  '/attendance',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // tolerate caching failure during offline installs
      });
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For API endpoints, prefer network first, fail gracefully if offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: { code: 'OFFLINE', message: 'Offline mode active. Operations queued locally.' } }),
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );
    return;
  }

  // For static and page requests, try Network first then fallback to Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => cached || caches.match('/'));
      }),
  );
});

// Listen for sync event from background sync API
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'SYNC_TRIGGERED' }));
      }),
    );
  }
});
