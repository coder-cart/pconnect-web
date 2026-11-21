'use client';

import { useEffect, useRef } from 'react';

function isTouchLikeViewport() {
  if (typeof window === 'undefined') {
    return false;
  }
  return (
    window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    window.matchMedia('(max-width: 1023px)').matches
  );
}

/**
 * Syncs a chat pane height to the visible visual viewport on touch / narrow
 * devices so the soft keyboard does not cover the composer or yank the list.
 */
export function useChatKeyboardViewport(enabled: boolean) {
  const paneRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !isTouchLikeViewport()) {
      return;
    }

    const root = document.documentElement;
    const vv = window.visualViewport;

    function sync() {
      const pane = paneRef.current;
      if (!pane) {
        return;
      }

      if (!vv) {
        root.style.setProperty('--chat-keyboard-inset', '0px');
        pane.style.height = '';
        pane.style.maxHeight = '';
        return;
      }

      const paneTop = pane.getBoundingClientRect().top;
      const visibleBottom = vv.offsetTop + vv.height;
      const available = Math.max(0, Math.round(visibleBottom - paneTop));
      const layoutBottom = window.innerHeight;
      const inset = Math.max(0, Math.round(layoutBottom - visibleBottom));

      root.style.setProperty('--chat-keyboard-inset', `${inset}px`);
      root.style.setProperty('--chat-vv-height', `${Math.round(vv.height)}px`);

      if (available > 0) {
        pane.style.height = `${available}px`;
        pane.style.maxHeight = `${available}px`;
      }
    }

    sync();
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);

    return () => {
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      root.style.removeProperty('--chat-keyboard-inset');
      root.style.removeProperty('--chat-vv-height');
      const pane = paneRef.current;
      if (pane) {
        pane.style.height = '';
        pane.style.maxHeight = '';
      }
    };
  }, [enabled]);

  return paneRef;
}
