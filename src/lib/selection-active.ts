/**
 * Shared document selection listener for chat message rows.
 * Avoids O(N) `selectionchange` handlers when many MessageItems are mounted.
 */

type SelectionListener = (active: boolean) => void;

const listeners = new Set<SelectionListener>();
let attached = false;
let lastActive = false;

function hasActiveTextSelection() {
  if (typeof window === 'undefined') return false;
  const selection = window.getSelection();
  if (!selection || selection.type !== 'Range') return false;
  return selection.toString().length > 0;
}

function syncSelectionState() {
  const active = hasActiveTextSelection();
  if (active === lastActive) return;
  lastActive = active;
  listeners.forEach((listener) => listener(active));
}

function ensureAttached() {
  if (attached || typeof document === 'undefined') return;
  document.addEventListener('selectionchange', syncSelectionState);
  attached = true;
  lastActive = hasActiveTextSelection();
}

function maybeDetach() {
  if (!attached || listeners.size > 0 || typeof document === 'undefined') {
    return;
  }
  document.removeEventListener('selectionchange', syncSelectionState);
  attached = false;
}

/** Subscribe to whether the document currently has a non-collapsed text selection. */
export function subscribeActiveTextSelection(listener: SelectionListener) {
  ensureAttached();
  listeners.add(listener);
  listener(lastActive);
  return () => {
    listeners.delete(listener);
    maybeDetach();
  };
}

export function getActiveTextSelection() {
  return hasActiveTextSelection();
}
