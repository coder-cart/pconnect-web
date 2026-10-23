import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';

export type DevicePushStatus =
  | 'unsupported'
  | 'off'
  | 'denied'
  | 'on'
  | 'needs-install';

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      Boolean(
        (window.navigator as Navigator & { standalone?: boolean }).standalone,
      ))
  );
}

export function devicePushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function registerPushWorker() {
  if (!devicePushSupported()) return null;
  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none',
  });
  // Ensure an active worker before pushManager.subscribe.
  await navigator.serviceWorker.ready;
  try {
    await registration.update();
  } catch {
    // Ignore update race; ready worker is enough to subscribe.
  }
  return registration;
}

export async function readDevicePushStatus(): Promise<DevicePushStatus> {
  if (!devicePushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (isIos() && !isStandalone()) return 'needs-install';
  await navigator.serviceWorker.ready.catch(() => undefined);
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? 'on' : 'off';
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

async function persistPushSubscription(
  registration: ServiceWorkerRegistration,
  publicKey: string,
) {
  await navigator.serviceWorker.ready;
  // Replace a stale subscription bound to an old VAPID key / worker.
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    try {
      await existing.unsubscribe();
    } catch {
      // continue and create a fresh subscription
    }
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('The browser did not return a push subscription.');
  }
  await apiRequest('/notifications/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    }),
  });
}

export async function enableDevicePush() {
  const registration = await registerPushWorker();
  if (!registration) {
    throw new Error('This browser cannot receive device alerts.');
  }
  if (isIos() && !isStandalone()) {
    throw new Error(
      'Install Colabdeck to the home screen, then turn device alerts on.',
    );
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('The browser blocked device alerts.');
  }
  const keyResponse = await apiRequest<
    ApiResponse<{ configured: boolean; publicKey: string | null }>
  >('/notifications/push/public-key');
  if (!keyResponse.data.configured || !keyResponse.data.publicKey) {
    throw new Error('Device alerts are not configured on the server.');
  }
  await persistPushSubscription(registration, keyResponse.data.publicKey);
}

/**
 * If the browser already granted permission but the push subscription was
 * dropped (common after PWA reinstall or silent-push violations), restore it
 * without prompting again.
 */
export async function healDevicePushSubscription() {
  if (!devicePushSupported()) return 'unsupported' as DevicePushStatus;
  if (Notification.permission !== 'granted') {
    return readDevicePushStatus();
  }
  if (isIos() && !isStandalone()) return 'needs-install';

  const registration = await registerPushWorker();
  if (!registration) return 'unsupported';

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    const json = existing.toJSON();
    if (json.endpoint && json.keys?.p256dh && json.keys.auth) {
      await apiRequest('/notifications/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        }),
      }).catch(() => undefined);
    }
    return 'on';
  }

  try {
    const keyResponse = await apiRequest<
      ApiResponse<{ configured: boolean; publicKey: string | null }>
    >('/notifications/push/public-key');
    if (!keyResponse.data.configured || !keyResponse.data.publicKey) {
      return 'off';
    }
    await persistPushSubscription(registration, keyResponse.data.publicKey);
    return 'on';
  } catch {
    return 'off';
  }
}

export async function disableDevicePush() {
  if (!devicePushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await apiRequest('/notifications/push/subscribe', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  }).catch(() => undefined);
}
