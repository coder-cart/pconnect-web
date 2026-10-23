self.addEventListener('fetch', () => {
  // Network stays the default. This marks the worker as an installable app.
});

self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = typeof payload.title === 'string' ? payload.title : 'Colabdeck';
  const body = typeof payload.body === 'string' ? payload.body : '';
  const linkUrl = typeof payload.linkUrl === 'string' ? payload.linkUrl : '/';
  // Stable per conversation+recipient so rapid messages replace one tray entry.
  const tag =
    typeof payload.tag === 'string' && payload.tag
      ? payload.tag
      : 'colabdeck';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const alreadyLooking = windows.some(
        (client) => client.focused && sameTarget(client.url, linkUrl),
      );
      if (alreadyLooking) return;

      await self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag,
        renotify: true,
        data: { url: linkUrl, tag },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || '/',
    self.location.origin,
  ).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      // Prefer an existing Colabdeck window so Windows does not open a second
      // taskbar identity for the same installed PWA.
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

function sameTarget(clientUrl, linkUrl) {
  try {
    const current = new URL(clientUrl);
    const link = new URL(linkUrl, self.location.origin);
    if (current.origin !== link.origin || current.pathname !== link.pathname) {
      return false;
    }
    const channel = link.searchParams.get('channel');
    if (channel) return channel === current.searchParams.get('channel');
    return true;
  } catch {
    return false;
  }
}
