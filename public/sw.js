self.addEventListener('fetch', () => {
  // Network stays the default. This marks the worker as an installable app.
});

self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = typeof payload.title === 'string' ? payload.title : 'Colabdeck';
  const body = typeof payload.body === 'string' ? payload.body : '';
  const linkUrl = typeof payload.linkUrl === 'string' ? payload.linkUrl : '/';
  const tag = typeof payload.tag === 'string' ? payload.tag : 'colabdeck';

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
        data: { url: linkUrl },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const existing = windows.find((client) => 'focus' in client);
      if (existing) {
        await existing.focus();
        if ('navigate' in existing) {
          await existing.navigate(target);
        }
        return;
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
