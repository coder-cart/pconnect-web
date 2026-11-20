import { availablePwaRelease } from '@/lib/pwa-update-policy';

const RUNNING_RELEASE = process.env.NEXT_PUBLIC_APP_RELEASE || 'dev';
const DISMISS_KEY = 'colabdeck.pwa.dismissed';
const RELOAD_KEY = 'colabdeck.pwa.reload';
const CHECK_INTERVAL_MS = 10 * 60 * 1000;
const MIN_CHECK_GAP_MS = 30 * 1000;

export type PwaUpdateSnapshot = {
  supported: boolean;
  updateReady: boolean;
  remoteRelease: string | null;
  runningRelease: string;
  registration: ServiceWorkerRegistration | null;
};

const serverSnapshot: PwaUpdateSnapshot = {
  supported: false,
  updateReady: false,
  remoteRelease: null,
  runningRelease: RUNNING_RELEASE,
  registration: null,
};

let snapshot: PwaUpdateSnapshot = serverSnapshot;
let activatedElsewhere = false;
let watcherStarted = false;
let reloading = false;
let lastCheck = 0;
let checkInFlight: Promise<void> | null = null;

const listeners = new Set<() => void>();
const boundRegistrations = new WeakSet<ServiceWorkerRegistration>();

function publish(next: PwaUpdateSnapshot) {
  snapshot = next;
  for (const listener of [...listeners]) listener();
}

export function subscribePwaUpdate(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPwaUpdateSnapshot() {
  return snapshot;
}

export function getServerPwaUpdateSnapshot() {
  return serverSnapshot;
}

export function readDismissedPwaRelease(): string | null {
  try {
    return sessionStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

export function dismissPwaRelease(release: string) {
  try {
    sessionStorage.setItem(DISMISS_KEY, release);
  } catch {
    // Session storage can be blocked; the in-memory dismiss still hides it.
  }
}

function serviceWorkerSupported() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!serviceWorkerSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
  } catch {
    try {
      return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch {
      return null;
    }
  }
}

function hasWaitingWorker(registration: ServiceWorkerRegistration | null) {
  return Boolean(registration?.waiting && navigator.serviceWorker.controller);
}

function publishFromRegistration(
  registration: ServiceWorkerRegistration | null,
  remoteRelease: string | null,
) {
  publish({
    supported: serviceWorkerSupported(),
    updateReady: hasWaitingWorker(registration) || activatedElsewhere,
    remoteRelease,
    runningRelease: RUNNING_RELEASE,
    registration,
  });
}

function bindRegistration(registration: ServiceWorkerRegistration) {
  if (boundRegistrations.has(registration)) return;
  boundRegistrations.add(registration);

  const track = (worker: ServiceWorker | null) => {
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        publishFromRegistration(registration, snapshot.remoteRelease);
      }
    });
  };

  registration.addEventListener('updatefound', () => {
    track(registration.installing);
  });
  track(registration.installing);
  if (hasWaitingWorker(registration)) {
    publishFromRegistration(registration, snapshot.remoteRelease);
  }
}

async function fetchRemoteRelease(): Promise<string | null> {
  try {
    const response = await fetch(`/version.json?ts=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { release?: unknown };
    return typeof body.release === 'string' && body.release ? body.release : null;
  } catch {
    return null;
  }
}

function waitForControllerChange(timeoutMs: number) {
  return new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, timeoutMs);
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function waitForWaitingWorker(
  registration: ServiceWorkerRegistration,
  timeoutMs: number,
) {
  if (registration.waiting) return Promise.resolve(registration.waiting);
  const installing = registration.installing;
  if (!installing) return Promise.resolve(null);

  return new Promise<ServiceWorker | null>((resolve) => {
    const timer = window.setTimeout(() => resolve(registration.waiting), timeoutMs);
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' || installing.state === 'activated') {
        window.clearTimeout(timer);
        resolve(registration.waiting);
      }
      if (installing.state === 'redundant') {
        window.clearTimeout(timer);
        resolve(null);
      }
    });
  });
}

function reloadForUpdate() {
  if (reloading) return;
  try {
    if (sessionStorage.getItem(RELOAD_KEY) !== '1') return;
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    return;
  }
  reloading = true;
  window.location.reload();
}

export async function applyPwaUpdate(
  registration: ServiceWorkerRegistration | null,
) {
  try {
    sessionStorage.setItem(RELOAD_KEY, '1');
  } catch {
    window.location.reload();
    return;
  }

  if (registration) {
    try {
      await registration.update();
    } catch {
      // A reload still fetches the latest HTML when the check is refused.
    }
    const waiting = await waitForWaitingWorker(registration, 4000);
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
      await waitForControllerChange(4000);
    }
  }

  reloadForUpdate();
}

export async function checkForPwaUpdate(force = false) {
  if (!serviceWorkerSupported()) {
    publish({ ...serverSnapshot, supported: false, runningRelease: RUNNING_RELEASE });
    return;
  }
  const now = Date.now();
  if (!force && lastCheck !== 0 && now - lastCheck < MIN_CHECK_GAP_MS) return;
  if (checkInFlight) return checkInFlight;

  lastCheck = now;
  checkInFlight = (async () => {
    const registration = await ensureServiceWorker();
    if (registration) bindRegistration(registration);
    if (registration) {
      try {
        await registration.update();
      } catch {
        // Safari can reject an update while a check is already running.
      }
    }
    const remoteRelease = await fetchRemoteRelease();
    publishFromRegistration(registration, remoteRelease);
  })().finally(() => {
    checkInFlight = null;
  });

  return checkInFlight;
}

export function startPwaUpdateWatcher() {
  if (watcherStarted || typeof window === 'undefined') return;
  if (!serviceWorkerSupported()) return;
  watcherStarted = true;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    reloadForUpdate();
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data as { type?: string; release?: string } | null;
    if (!data || data.type !== 'PWA_ACTIVATED') return;
    if (!data.release || data.release === RUNNING_RELEASE) return;
    try {
      if (sessionStorage.getItem(RELOAD_KEY) === '1') return;
    } catch {
      // Ignore storage and still offer the reload.
    }
    activatedElsewhere = true;
    publishFromRegistration(snapshot.registration, snapshot.remoteRelease);
  });

  const checkIfVisible = () => {
    if (document.visibilityState === 'hidden') return;
    void checkForPwaUpdate(false);
  };

  document.addEventListener('visibilitychange', checkIfVisible);
  window.addEventListener('focus', checkIfVisible);
  window.addEventListener('pageshow', checkIfVisible);
  window.setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    void checkForPwaUpdate(true);
  }, CHECK_INTERVAL_MS);

  void checkForPwaUpdate(true);
}

export function pwaReleaseAvailable(snapshotValue: PwaUpdateSnapshot): string | null {
  return availablePwaRelease({
    updateReady: snapshotValue.updateReady,
    runningRelease: snapshotValue.runningRelease,
    remoteRelease: snapshotValue.remoteRelease,
  });
}
