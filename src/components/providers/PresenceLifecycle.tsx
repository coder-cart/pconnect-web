'use client';

import { useEffect, useRef } from 'react';
import { apiRequest } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/auth';
import type { PresenceAvailability } from '@/lib/user-presence';

const DEBOUNCE_MS = 400;

/**
 * Keeps server presence in sync with tab/PWA visibility:
 * Active while the app is visible; Away when hidden/suspended.
 */
export function PresenceLifecycle() {
  const lastSentRef = useRef<PresenceAvailability | null>(null);
  const pendingRef = useRef<PresenceAvailability | null>(null);
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    function clearTimer() {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    async function sendPresence(next: PresenceAvailability) {
      if (lastSentRef.current === next) {
        return;
      }
      if (inFlightRef.current) {
        pendingRef.current = next;
        return;
      }
      inFlightRef.current = true;
      try {
        await apiRequest<ApiResponse<unknown>>('/users/me', {
          method: 'PATCH',
          body: JSON.stringify({ presenceStatus: next }),
        });
        lastSentRef.current = next;
      } catch {
        // Best-effort; next visibility event can retry.
      } finally {
        inFlightRef.current = false;
        const queued = pendingRef.current;
        pendingRef.current = null;
        if (queued && queued !== lastSentRef.current) {
          void sendPresence(queued);
        }
      }
    }

    function schedule(next: PresenceAvailability) {
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void sendPresence(next);
      }, DEBOUNCE_MS);
    }

    function markActive() {
      if (document.visibilityState === 'hidden') return;
      schedule('active');
    }

    function markAway() {
      schedule('away');
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        markActive();
      } else {
        markAway();
      }
    }

    function onPageShow() {
      markActive();
    }

    function onPageHide() {
      markAway();
    }

    function onFocus() {
      markActive();
    }

    function onBlur() {
      // Only treat blur as away when the document is actually hidden
      // (avoids marking away when focus moves to a child iframe/devtools).
      if (document.visibilityState === 'hidden') {
        markAway();
      }
    }

    // Initial: user just opened the authenticated shell.
    markActive();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);

    return () => {
      clearTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      // Leaving the app shell — mark away so peers do not stay Active.
      void sendPresence('away');
    };
  }, []);

  return null;
}
