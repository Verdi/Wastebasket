// Offline support for the Wastebasket web app.
//
// **Network-first for pages, cache-first for everything else.** That split is
// the whole design, and it exists because the previous version got it wrong in
// a way that took months to notice.
//
// The old worker was cache-first over a precache list containing '/' and
// '/index.html', with no revalidation. It worked — and it meant every returning
// visitor kept being served the version they first saw, indefinitely. Nothing
// shipped after that ever reached them, and nothing anywhere said so. It only
// came to light when the site needed to change what lived at the root.
//
// So: a page is always fetched from the network when the network is there, and
// the cached copy is only a fallback for when it is not. An asset — script,
// style, icon — is served from the cache for speed, then quietly refreshed in
// the background for next time. Bump CACHE_VERSION to throw the lot away.
//
// Every path here is RELATIVE. GitHub Pages serves this repo from
// /Wastebasket/, not from the root, and the absolute paths the old worker used
// would each have reached for a file one directory too high.

const CACHE_VERSION = 'v2';
const CACHE_NAME = `wastebasket-${CACHE_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './wastebasket-styles.css',
  './wastebasket-app.js',
  './wastebasket-192.png',
  './wastebasket-512.png',
  './settings/',
  './settings/index.html',
  './settings/settings-app.js',
  './settings/auto-light.svg',
  './settings/auto-dark.svg',
  './settings/light-light.svg',
  './settings/light-dark.svg',
  './settings/dark-light.svg',
  './settings/dark-dark.svg',
  './settings/bottom-light.svg',
  './settings/bottom-dark.svg',
  './settings/top-light.svg',
  './settings/top-dark.svg',
  './wtf/',
  './wtf/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Individually, not addAll: addAll rejects the whole install if any single
    // file 404s, which would mean one renamed icon silently costs offline
    // support entirely.
    await Promise.all(ASSETS.map((url) =>
      cache.add(url).catch(() => console.warn('could not precache', url))
    ));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== CACHE_NAME) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only GETs, and only this origin. A cross-origin request is somebody else's
  // business and caching it here would be presumptuous.
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // A navigation is a page. Always ask the network first, so a deployed change
  // is live on the next visit rather than whenever a cache happens to expire.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, fresh.clone());
        return fresh;
      } catch {
        // Offline. The cached page, or the app's own front door as a last
        // resort — landing on the editor beats a browser error page.
        return (await caches.match(request))
          || (await caches.match('./index.html'))
          || Response.error();
      }
    })());
    return;
  }

  // Everything else: serve from cache, then refresh it for next time.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then((response) => {
      if (response.ok) {
        caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    }).catch(() => cached);
    return cached || network;
  })());
});
