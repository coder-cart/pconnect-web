/* Colabdeck service worker — installable PWA + web push */
const SW_VERSION = 'push-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Network stays the default. This marks the worker as an installable app.
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
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag,
      renotify: true,
      // Keep the Windows toast visible until the user interacts — otherwise
      // banners vanish quickly and it looks like push "isn't working".
      requireInteraction: true,
      data: { url: linkUrl, tag, sw: SW_VERSION },
    }),
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
