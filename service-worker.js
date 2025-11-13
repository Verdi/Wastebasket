const CACHE_NAME = 'wastebasket-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/wastebasket-styles.css',
  '/wastebasket-app.js',
  '/wastebasket-192.png',
  '/wastebasket-512.png',
  '/settings/index.html',
  '/settings/settings-app.js',
  '/wtf/index.html',
  '/settings/auto-light.svg',
  '/settings/auto-dark.svg',
  '/settings/light-light.svg',
  '/settings/light-dark.svg',
  '/settings/dark-light.svg',
  '/settings/dark-dark.svg',
  '/settings/bottom-light.svg',
  '/settings/top-light.svg',
  '/settings/bottom-dark.svg',
  '/settings/top-dark.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
