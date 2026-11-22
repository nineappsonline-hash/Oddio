/* Oddio online streaming PWA.
 * Browser HTTP caching already handles hashed Next.js JS, CSS and fonts.
 * An additional CacheStorage copy previously accumulated old build chunks,
 * wasting mobile disk/memory and making stale chunk failures harder to debug.
 * This worker clears legacy caches and intentionally does not intercept fetch.
 * Private API responses, user content, and signed audio are never cached.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name.startsWith('oddio-static-'))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});
