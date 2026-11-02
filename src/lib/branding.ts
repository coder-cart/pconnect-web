/**
 * Central Colabdeck branding asset map.
 *
 * Regenerate from the designer pack with:
 *   node logo/prepare-brand.mjs
 *
 * Source: logo/colabdeck-assets/
 * - symbol → UI splash / compact logo
 * - horizontal lockups → login + nav
 * - pwa / maskable / favicon / notification → OS + browser chrome
 */
/** App shell chrome (sidebar + top bar) — keep in sync with `--shell-brand` in globals.css */
export const SHELL_BRAND_COLOR = '#1d2353';

export const BRAND = {
  name: 'Colabdeck',
  shortName: 'Colabdeck',
  description: 'Colabdeck workspace for chat, projects, files, and finance',
  /** Square symbol — transparent PNG. */
  mark: '/icons/icon-192.png',
  /** Horizontal lockup for light backgrounds. */
  lockup: '/brand/colabdeck-lockup.png',
  /** Horizontal lockup for dark backgrounds. */
  lockupDark: '/brand/colabdeck-lockup-dark.png',
  ogImage: '/brand/colabdeck-og.png',
  favicon: '/favicon.png',
  faviconIco: '/favicon.ico',
  appleTouchIcon: '/apple-touch-icon.png',
  icon192: '/icons/icon-192.png',
  icon512: '/icons/icon-512.png',
  maskable192: '/icons/maskable-192.png',
  maskable512: '/icons/maskable-512.png',
  /** Shown on PWA / push notifications. */
  notificationIcon: '/icons/notification-icon-192.png',
  /**
   * Browser / PWA chrome (status bar, theme-color).
   * Matches the in-app header and sidebar (`--shell-brand`).
   */
  themeColor: SHELL_BRAND_COLOR,
  /** Installed PWA splash / launch background. */
  backgroundColor: SHELL_BRAND_COLOR,
} as const;

/** Icon sizes shipped from logo/colabdeck-assets/icons. */
export const BRAND_ICON_SIZES = [
  32, 48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512,
] as const;
