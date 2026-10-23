/**
 * Central Colabdeck branding asset map.
 *
 * Regenerate from approved masters in `/logo` with:
 *   node logo/prepare-brand.mjs
 *
 * - Transparent mark → UI splash / compact logo / notifications fallback
 * - Purple plate icons → PWA / favicon / taskbar (`public/icons`)
 * - Lockup → login + nav (already used on the main login screen)
 */
export const BRAND = {
  name: 'Colabdeck',
  shortName: 'Colabdeck',
  /** Square mark — transparent PNG (no background plate). */
  mark: '/brand/colabdeck-mark.png',
  /** Horizontal lockup for light backgrounds. */
  lockup: '/brand/colabdeck-lockup.png',
  /** Horizontal lockup for dark backgrounds. */
  lockupDark: '/brand/colabdeck-lockup-dark.png',
  ogImage: '/brand/colabdeck-og.png',
  favicon: '/favicon.png',
  icon192: '/icons/icon-192.png',
  icon512: '/icons/icon-512.png',
  maskable192: '/icons/maskable-192.png',
  maskable512: '/icons/maskable-512.png',
  /** Shown on PWA / push notifications. */
  notificationIcon: '/icons/icon-192.png',
  themeColor: '#3d3adf',
  backgroundColor: '#0f1115',
} as const;

/** Sizes produced by `logo/prepare-brand.mjs`. */
export const BRAND_ICON_SIZES = [32, 48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512] as const;
