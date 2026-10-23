'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { BRAND } from '@/lib/branding';

const DISMISS_KEY = 'pconnect.notifications.optIn.dismissed';

export function NotificationOptInPrompt() {
  const { pushStatus, pushBusy, enablePush } = useNotifications();
  const [visible, setVisible] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(DISMISS_KEY) === '1') return;
    if (pushStatus === 'unsupported' || pushStatus === 'on' || pushStatus === 'denied') {
      return;
    }
    // Wait until status is known, then show once per device.
    if (pushStatus === 'off' || pushStatus === 'needs-install') {
      const timer = window.setTimeout(() => setVisible(true), 1200);
      return () => window.clearTimeout(timer);
    }
  }, [pushStatus]);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  async function handleEnable() {
    setHint(null);
    try {
      await enablePush();
      window.localStorage.setItem(DISMISS_KEY, '1');
      setVisible(false);
    } catch (error) {
      setHint(
        error instanceof Error
          ? error.message
          : 'Could not enable notifications. You can try again from Account.',
      );
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-3 bottom-[max(0.75rem,var(--safe-bottom))] z-50 mx-auto w-[min(100%,24rem)] animate-fade-in rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-md)] sm:inset-x-auto sm:right-4 sm:left-auto"
      role="dialog"
      aria-labelledby="notif-opt-in-title"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
          <Bell className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="notif-opt-in-title"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            Stay up to date in {BRAND.name}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            Enable notifications for new messages, order updates, and delivery
            alerts — even when this tab is in the background.
          </p>
          {pushStatus === 'needs-install' ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              On iPhone, install Colabdeck to the Home Screen first, then enable
              alerts.
            </p>
          ) : null}
          {hint ? (
            <p className="mt-2 text-xs text-[var(--danger)]">{hint}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void handleEnable()} disabled={pushBusy}>
              Enable Notifications
            </Button>
            <Button size="sm" variant="secondary" onClick={dismiss} disabled={pushBusy}>
              Not Now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
