'use client';

import { useEffect } from 'react';

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // Bust caches after SW logic changes so laptop clients pick up push fixes.
    void navigator.serviceWorker
      .register(`/sw.js?v=push-visible-1`, { scope: '/' })
      .catch(() => {
      // Install and push stay unavailable if the browser rejects the worker.
    });
  }, []);

  return null;
}
