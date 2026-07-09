/// ElitePG Service Worker — Caches app shell for offline/fast loads
const CACHE_NAME = 'elitepg-v1';

// App shell resources to cache on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install: Pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  // Activate immediately (don't wait for old SW to finish)
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch: Network-first strategy for API calls, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase API, Razorpay, and external requests — always go to network
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('razorpay') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('checkout.razorpay.com') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/functions/')
  ) {
    return;
  }

  // For navigation requests (HTML pages) — Network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => {
          // Offline: serve cached index.html (SPA fallback)
          return caches.match('/index.html');
        })
    );
    return;
  }

  // For static assets (JS, CSS, images) — Cache first, network fallback
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|eot)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache, but update in background (stale-while-revalidate)
          const fetchPromise = fetch(request).then((networkResponse) => {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
            return networkResponse;
          }).catch(() => {});
          return cachedResponse;
        }
        // Not in cache, fetch from network and cache it
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        });
      })
    );
    return;
  }
});
