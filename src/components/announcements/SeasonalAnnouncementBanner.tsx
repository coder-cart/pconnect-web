'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import {
  announcementThemeClass,
  seasonalDismissStorageKey,
  type PlatformAnnouncement,
} from '@/lib/platform-announcements';
import { cn } from '@/lib/cn';

export function SeasonalAnnouncementBanner() {
  const [active, setActive] = useState<PlatformAnnouncement | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  const loadActive = useCallback(async () => {
    try {
      const response = await apiRequest<
        ApiResponse<PlatformAnnouncement | null>
      >('/announcements/active');
      const next = response.data ?? null;
      setActive(next);
      if (!next) {
        setDismissed(true);
        return;
      }
      try {
        setDismissed(
          window.localStorage.getItem(seasonalDismissStorageKey(next.id)) ===
            '1',
        );
      } catch {
        setDismissed(false);
      }
    } catch {
      setActive(null);
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    void loadActive();
    function onFocus() {
      void loadActive();
    }
    window.addEventListener('focus', onFocus);
    const intervalId = window.setInterval(() => {
      void loadActive();
    }, 5 * 60 * 1000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(intervalId);
    };
  }, [loadActive]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(media.matches);
    const onChange = () => setReduceMotion(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  if (!active || dismissed) return null;

  function dismiss(item: PlatformAnnouncement) {
    try {
      window.localStorage.setItem(seasonalDismissStorageKey(item.id), '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  const showLeaves = active.animation === 'leaves' && !reduceMotion;
  const showFriday = active.animation === 'friday' && !reduceMotion;

  return (
    <div
      className={cn(
        'seasonal-banner relative overflow-hidden border-b border-[var(--border)] px-3 py-2.5 sm:px-4',
        announcementThemeClass(active.theme),
      )}
      role="status"
      aria-live="polite"
    >
      {showLeaves ? (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <span
              key={index}
              className="seasonal-leaf absolute text-sm opacity-50"
              style={{
                left: `${8 + index * 11}%`,
                animationDelay: `${index * 0.45}s`,
                animationDuration: `${7 + (index % 3)}s`,
              }}
            >
              🍂
            </span>
          ))}
        </div>
      ) : null}
      {showFriday ? (
        <div
          className="pointer-events-none absolute inset-y-0 right-8 flex items-center text-lg opacity-40"
          aria-hidden
        >
          <span className="seasonal-friday-pulse">✨</span>
        </div>
      ) : null}

      <div className="relative mx-auto flex max-w-5xl items-start gap-3">
        <div className="min-w-0 flex-1 text-sm text-[var(--foreground)]">
          <p className="font-semibold leading-[var(--leading-tight)]">
            {active.title}
          </p>
          <p className="mt-0.5 text-[length:var(--text-body)] leading-[var(--leading-body)] text-[var(--muted-foreground)]">
            {active.body}
          </p>
          {active.signoff ? (
            <p className="mt-1 whitespace-pre-line text-[length:var(--text-meta)] text-[var(--muted)]">
              {active.signoff}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 sm:min-h-8 sm:min-w-8"
          aria-label="Dismiss announcement"
          onClick={() => dismiss(active)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
