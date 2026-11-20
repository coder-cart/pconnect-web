/* Colabdeck service worker — installable PWA, web push, and safe updates.
 *
 * Each release rewrites SW_RELEASE_STAMP and /pwa-release.js so the browser
 * sees a new worker. This worker does not cache HTML or API responses. Hashed
 * /_next/static files stay on the HTTP cache; their names change per build.
 */
importScripts('/pwa-release.js');

// Rewritten by scripts/stamp-pwa-version.mjs. The worker file itself must
// change on every release so every browser treats it as a new installation.
const SW_RELEASE_STAMP = "dev";
const SW_VERSION =
  typeof self.PWA_RELEASE === 'string' && self.PWA_RELEASE
    ? self.PWA_RELEASE
    : SW_RELEASE_STAMP;
const CACHE_PREFIX = 'colabdeck-';
const CACHE_NAME = `${CACHE_PREFIX}${SW_VERSION}`;
const REVALIDATE_PATHS = new Set([
  '/sw.js',
  '/pwa-release.js',
  '/version.json',
  '/manifest.webmanifest',
]);

self.addEventListener('install', () => {
  // Stay waiting until the page posts SKIP_WAITING. A first install has no
  // active worker, so the browser activates this one on its own.
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data === 'SKIP_WAITING' || (data && data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        );
        const cache = await caches.open(CACHE_NAME);
        await cache.put(
          new Request('/pwa-cache-version'),
          new Response(SW_VERSION, {
            headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
          }),
        );
      } catch {
        // Cache Storage can be unavailable. Activation still claims clients.
      }

      await self.clients.claim();
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of windows) {
        client.postMessage({ type: 'PWA_ACTIVATED', release: SW_VERSION });
      }
    })(),
  );
});

function fetchFreshDocument(request) {
  // A navigation Request cannot be copied with cache: 'no-store'. Fetch the
  // URL directly so the reload after an update cannot reuse cached HTML.
  return fetch(request.url, {
    cache: 'no-store',
    credentials: 'include',
    redirect: 'manual',
  }).catch(() => fetch(request));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetchFreshDocument(request));
    return;
  }

  if (REVALIDATE_PATHS.has(url.pathname)) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    try {
      payload = { body: event.data ? event.data.text() : '' };
    } catch {
      payload = {};
    }
  }

  const title =
    typeof payload.title === 'string' && payload.title
      ? payload.title
      : 'Colabdeck';
  const body = typeof payload.body === 'string' ? payload.body : '';
  const linkUrl =
    typeof payload.linkUrl === 'string' && payload.linkUrl
      ? payload.linkUrl
      : '/chat';
  const tag =
    typeof payload.tag === 'string' && payload.tag
      ? payload.tag
      : `colabdeck-${Date.now()}`;

  // Always show a notification. Chrome requires a user-visible notification for
  // userVisibleOnly subscriptions. Never skip or instantly close — that drops
  // the browser push subscription (especially on desktop).
  event.waitUntil(
    (async () => {
      try {
        await self.registration.showNotification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-96.png',
          tag,
          renotify: true,
          // Keep the Windows toast visible until the user interacts — otherwise
          // banners vanish quickly and it looks like push "isn't working".
          requireInteraction: true,
          data: { url: linkUrl, tag, sw: SW_VERSION },
        });
      } catch (error) {
        // Fallback without icons if asset/options fail — still must be visible.
        console.error('[sw] showNotification failed', error);
        await self.registration.showNotification(title || 'Colabdeck', {
          body: body || 'New update',
          tag,
          renotify: true,
          requireInteraction: true,
          data: { url: linkUrl, tag, sw: SW_VERSION },
        });
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || '/chat',
    self.location.origin,
  ).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (!('focus' in client)) continue;
        try {
          const focused = await client.focus();
          if (focused && 'navigate' in focused) {
            await focused.navigate(target);
            return;
          }
          if ('navigate' in client) {
            await client.navigate(target);
          }
          return;
        } catch {
          // try next client
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
