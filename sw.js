// sw.js
// Lets the app itself open with zero connectivity, once it's been loaded
// at least once. Network-first: always tries to fetch the latest deployed
// version when online (so field engineers get updates automatically), and
// falls back to the last cached copy when there's no connection at all —
// which is the normal, expected state for a lot of tower-site inspections.
//
// API calls (/api/...) are deliberately never touched here — those are
// handled by the app's own offline-queue logic (IndexedDB + background
// sync), not by this cache.

const CACHE_NAME = 'pat-inspector-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // fine if this fails once — it'll get cached on first successful visit anyway
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  if (req.method !== 'GET') return;
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('/index.html'))
      )
  );
});
