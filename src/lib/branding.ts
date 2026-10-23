/**
 * Central Colabdeck branding asset map.
 *
 * When Vinod provides the final approved logo, replace the files under
 * `public/brand/` (and regenerate `public/icons/` + favicon from the
 * transparent PNG mark). Keep paths stable so UI imports do not change.
 */
export const BRAND = {
  name: 'Colabdeck',
  shortName: 'Colabdeck',
  /** Square mark — preferred source for app icons (transparent PNG). */
  mark: '/brand/colabdeck-mark.png',
  /** Horizontal lockup for light backgrounds. */
  lockup: '/brand/colabdeck-lockup.png',
  /** Horizontal lockup for dark backgrounds. */
  lockupDark: '/brand/colabdeck-lockup-dark.png',
  ogImage: '/brand/colabdeck-og.png',
  favicon: '/favicon.png',
  icon192: '/icons/icon-192.png',
  icon512: '/icons/icon-512.png',
  /** Shown on PWA / push notifications. Prefer maskable 192+. */
  notificationIcon: '/icons/icon-192.png',
  themeColor: '#3d3adf',
  backgroundColor: '#0f1115',
} as const;

/** Documented sizes to regenerate when the final logo arrives. */
export const BRAND_ICON_SIZES = [32, 48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512] as const;
