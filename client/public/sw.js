// Service worker of the Inventory app. It exists to make the app installable and to keep two kinds of
// responses on the device, and nothing else:
//   1. the build's immutable static files (`/_next/static/...`, content-hashed, so they never go stale);
//   2. the offline page shown when a page cannot be loaded because the network is down.
// Pages (HTML and RSC payloads), the API, GraphQL, sockets and every authenticated response are never read from
// or written to a cache here, so nothing of a signed-in visitor stays on the device after sign-out.
//
// A new version of this file does not interrupt open tabs: it waits and takes over the next time the app is opened.

const STATIC_CACHE = 'inventory-static-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png'];
// The cache is trimmed to this many static files, oldest first, so old deployments cannot pile up.
const MAX_STATIC_ENTRIES = 150;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith('inventory-') && name !== STATIC_CACHE)
            .map((name) => caches.delete(name)),
        ),
      ),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  const removable = keys.filter((key) => !PRECACHE.includes(new URL(key.url).pathname));
  for (const key of removable.slice(0, Math.max(0, removable.length - MAX_STATIC_ENTRIES)))
    await cache.delete(key);
}

async function staticFile(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // Only complete same-origin answers are kept.
  if (response.ok && response.type === 'basic') {
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

async function page(request) {
  try {
    return await fetch(request);
  } catch {
    const offline = await caches.match(OFFLINE_URL);
    return offline ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(page(request));
    return;
  }
  // A worker's entry script is not handed out from the cache: its parameters travel in the URL fragment, which a
  // cached response drops, so a second worker would start with the first one's parameters.
  if (request.destination === 'worker' || request.destination === 'sharedworker') return;
  // The icons of the offline page: they must show without a network.
  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
    return;
  }
  if (url.pathname.startsWith('/_next/static/')) event.respondWith(staticFile(request));
});
