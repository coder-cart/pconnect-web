/** Lightweight device / clipboard capability helpers for chat media UX. */

export function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    navigator.maxTouchPoints > 0
  );
}

export function isAndroidDevice() {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return true;
  // iPadOS 13+ reports as Macintosh with touch points.
  return (
    navigator.platform === 'MacIntel' &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1
  );
}

/**
 * Desktop browsers generally support Ctrl/Cmd+V image paste into contentEditable.
 * Android Chrome / installed PWAs often do not — prefer the gallery picker there.
 */
export function prefersGalleryImagePicker() {
  return isAndroidDevice() || (isTouchDevice() && isIosDevice());
}
