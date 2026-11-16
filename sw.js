const VERSION = 'gsonify-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];
const LIVE_HOSTS = new Set(['opensky-network.org', 'rata.digitraffic.fi']);
const CDN_HOSTS = new Set(['cdn.jsdelivr.net']);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Live telemetry: never intercepted, never cached. The browser performs the request directly.
  if (LIVE_HOSTS.has(url.hostname)) return;

  // App shell and static CDN libraries: serve from cache instantly, refresh in background.
  if (url.origin === self.location.origin || CDN_HOSTS.has(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req, { ignoreSearch: true });

  const network = fetch(req)
    .then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  if (cached) return cached;
  const res = await network;
  return res || Response.error();
}
