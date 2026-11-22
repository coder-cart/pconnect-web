'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/Button';
import { BRAND } from '@/lib/branding';
import {
  pwaUpdateBlockMessage,
  resolvePwaUpdateDecision,
} from '@/lib/pwa-update-policy';
import {
  applyPwaUpdate,
  dismissPwaRelease,
  getPwaUpdateSnapshot,
  getServerPwaUpdateSnapshot,
  pwaReleaseAvailable,
  readDismissedPwaRelease,
  startPwaUpdateWatcher,
  subscribePwaUpdate,
} from '@/lib/pwa-registration';
import { getPwaWorkHold, subscribePwaWork } from '@/lib/pwa-work-guard';

function composerIsFocused() {
  const active = document.activeElement;
  if (!active || !('closest' in active)) return false;
  return Boolean(active.closest('[data-chat-composer]'));
}

export function RegisterServiceWorker() {
  const update = useSyncExternalStore(
    subscribePwaUpdate,
    getPwaUpdateSnapshot,
    getServerPwaUpdateSnapshot,
  );
  const workHold = useSyncExternalStore(
    subscribePwaWork,
    getPwaWorkHold,
    () => null,
  );
  const [dismissReady, setDismissReady] = useState(false);
  const [dismissedRelease, setDismissedRelease] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [latched, setLatched] = useState(false);
  const [applying, setApplying] = useState(false);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);

  useEffect(() => {
    startPwaUpdateWatcher();
    setDismissedRelease(readDismissedPwaRelease());
    setDismissReady(true);
  }, []);

  useEffect(() => {
    function syncTyping() {
      window.setTimeout(() => setTyping(composerIsFocused()), 0);
    }
    document.addEventListener('focusin', syncTyping);
    document.addEventListener('focusout', syncTyping);
    return () => {
      document.removeEventListener('focusin', syncTyping);
      document.removeEventListener('focusout', syncTyping);
    };
  }, []);

  const availableRelease = pwaReleaseAvailable(update);
  const decision = resolvePwaUpdateDecision({
    supported: update.supported,
    availableRelease,
    dismissedRelease,
    workHold: workHold !== null,
    userIsBusyTyping: typing,
    popupLatched: latched,
  });

  useEffect(() => {
    if (decision === 'hidden') {
      setLatched(false);
      return;
    }
    if (decision === 'prompt') setLatched(true);
  }, [decision]);

  useEffect(() => {
    if (workHold === null && !typing) setBlockMessage(null);
  }, [workHold, typing]);

  if (!dismissReady || decision !== 'prompt' || !availableRelease) return null;

  async function handleUpdate() {
    const blocked = pwaUpdateBlockMessage(workHold, typing);
    if (blocked) {
      setBlockMessage(blocked);
      return;
    }
    setApplying(true);
    setBlockMessage(null);
    try {
      await applyPwaUpdate(update.registration);
    } catch {
      setApplying(false);
      setBlockMessage('The update could not start. Stay on this page and try again.');
    }
  }

  function handleLater() {
    if (!availableRelease) return;
    dismissPwaRelease(availableRelease);
    setDismissedRelease(availableRelease);
    setLatched(false);
  }

  return (
    <div
      className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-[70] mx-auto w-[min(100%,26rem)] animate-fade-in rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-md)]"
      role="dialog"
      aria-live="polite"
      aria-labelledby="pwa-update-title"
      aria-describedby="pwa-update-body"
    >
      <div className="flex items-start gap-3">
        <img
          src={BRAND.mark}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-full object-contain"
        />
        <div className="min-w-0 flex-1">
          <h2
            id="pwa-update-title"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            {BRAND.name} update
          </h2>
          <p
            id="pwa-update-body"
            className="mt-1 text-xs leading-relaxed text-[var(--muted)]"
          >
            A new version of Colabdeck is available. Update now to get the latest
            improvements and features.
          </p>
          {blockMessage ? (
            <p className="mt-2 text-xs text-[var(--warning)]">{blockMessage}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void handleUpdate()} disabled={applying}>
              {applying ? 'Updating…' : 'Update Now'}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleLater} disabled={applying}>
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
