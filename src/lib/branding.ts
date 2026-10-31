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
export const BRAND = {
  name: 'Colabdeck',
  shortName: 'Colabdeck',
  /** Square symbol — transparent PNG. */
  mark: '/icons/icon-192.png',    
  /** Horizontal lockup for light backgrounds. */
  lockup: '/brand/colabdeck-lockup.png',
  /** Horizontal lockup for dark backgrounds. */
  lockupDark: '/brand/colabdeck-lockup-dark - Copy.png',
  ogImage: '/brand/colabdeck-og.png',
  favicon: '/favicon.png',
  icon192: '/icons/icon-192.png',
  icon512: '/icons/icon-512.png',
  maskable192: '/icons/maskable-192.png',
  maskable512: '/icons/maskable-512.png',
  /** Shown on PWA / push notifications. */
  notificationIcon: '/icons/notification-icon-192.png',
  themeColor: '#3d3adf',
  backgroundColor: '#0f1115',
} as const;

/** Icon sizes shipped from logo/colabdeck-assets/icons. */
export const BRAND_ICON_SIZES = [
  32, 48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512,
] as const;
