// Tombstone. Installed 2026-09-19.
//
// This file used to be a cache-first service worker for the Wastebasket web
// app. Its precache list included '/' and '/index.html', and its fetch handler
// never revalidated — so every returning visitor kept being served the old
// editor from the root, forever.
//
// The sales site is moving to that root. Without this file, the new page would
// look correct in a fresh browser and be invisible to everyone who had been to
// the site before. That is the worst shape a bug can have, and it makes no
// noise.
//
// So this replaces it rather than deleting it: a worker that clears every
// cache, unregisters itself, and reloads any open tab. The browser always
// fetches the worker script from the network rather than from its own cache,
// which is what lets this reach people at all.
//
// DO NOT DELETE THIS FILE until you are confident no browser still has the old
// worker registered. An empty 404 is a less reliable way to say the same thing.
//
// Reloading an open tab is safe here: the web app writes the draft to
// localStorage on every keystroke (wastebasket-app.js, handleInput), and
// localStorage survives a reload. Nothing typed is lost.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      await caches.delete(key);
    }

    await self.registration.unregister();

    // includeUncontrolled, because skipWaiting activates this worker without
    // it taking control of pages the OLD worker was already driving. Without
    // this flag those are exactly the tabs that would be missed — and they are
    // the ones holding the stale root.
    const tabs = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    for (const tab of tabs) {
      tab.navigate(tab.url);
    }
  })());
});

// No fetch handler on purpose. With none, every request goes to the network
// normally, which is the whole point.
