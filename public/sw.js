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
      // Only treat as "already reading" when the same conversation is visible.
      const alreadyLooking = windows.some(
        (client) =>
          client.visibilityState === 'visible' &&
          client.focused &&
          sameConversation(client.url, linkUrl),
      );

      // Chrome requires a visible notification for userVisibleOnly push.
      // Skipping showNotification causes the browser to drop the subscription
      // after repeated silent pushes — that broke laptop alerts while mobile still worked.
      await self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag,
        renotify: !alreadyLooking,
        silent: alreadyLooking,
        data: { url: linkUrl, tag },
      });

      if (alreadyLooking) {
        const open = await self.registration.getNotifications({ tag });
        for (const note of open) {
          note.close();
        }
      }
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

/** True only when the open window is the same chat channel as the push link. */
function sameConversation(clientUrl, linkUrl) {
  try {
    const current = new URL(clientUrl);
    const link = new URL(linkUrl, self.location.origin);
    if (current.origin !== link.origin) return false;

    const linkChannel = link.searchParams.get('channel');
    if (linkChannel) {
      return (
        current.pathname === '/chat' &&
        current.searchParams.get('channel') === linkChannel
      );
    }

    return (
      current.pathname === link.pathname &&
      current.search === link.search
    );
  } catch {
    return false;
  }
}
