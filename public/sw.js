/* Lumens service worker — push + click + offline app-shell cache. */
const VERSION = 'v2';
const SHELL_CACHE = `lumens-shell-${VERSION}`;
const RUNTIME_CACHE = `lumens-runtime-${VERSION}`;
const SHELL_URLS = ['/', '/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

/**
 * Fetch strategy:
 *  - Navigation requests → network-first, fall back to cached shell so the app
 *    opens on flaky/offline networks.
 *  - Same-origin static assets → stale-while-revalidate.
 *  - Supabase REST / RPC and everything else → pass through (no caching of
 *    private user data on disk).
 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then((c) => c.put('/', copy)).catch(() => undefined);
        return res;
      }).catch(() => caches.match('/').then((r) => r || new Response('Offline', { status: 503 }))),
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isStatic = sameOrigin && /\.(?:js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|ico|gif)$/i.test(url.pathname);
  if (!isStatic) return;

  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
        return res;
      }).catch(() => undefined);
      return cached || (await network) || new Response('', { status: 504 });
    }),
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Lumens', body: 'You have a new notification', url: '/' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: { url: data.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) return w.navigate(url).then(() => w.focus()).catch(() => w.focus());
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});