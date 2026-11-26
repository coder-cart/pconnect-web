export type PlatformAnnouncementTheme =
  | 'thanksgiving'
  | 'friday'
  | 'neutral'
  | 'success'
  | 'warning';

export type PlatformAnnouncementAnimation = 'leaves' | 'friday' | 'none';

export type PlatformAnnouncementStatus = 'draft' | 'published' | 'archived';

export interface PlatformAnnouncement {
  id: string;
  title: string;
  body: string;
  signoff: string | null;
  theme: PlatformAnnouncementTheme;
  animation: PlatformAnnouncementAnimation;
  startsAt: string;
  endsAt: string;
  status: PlatformAnnouncementStatus;
  createdAt?: string;
  updatedAt?: string;
}

export const ANNOUNCEMENT_THEME_OPTIONS: {
  value: PlatformAnnouncementTheme;
  label: string;
}[] = [
  { value: 'thanksgiving', label: 'Thanksgiving' },
  { value: 'friday', label: 'Happy Friday' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
];

export function announcementThemeClass(
  theme: PlatformAnnouncementTheme,
): string {
  switch (theme) {
    case 'thanksgiving':
      return 'seasonal-banner--thanksgiving';
    case 'friday':
      return 'seasonal-banner--friday';
    case 'neutral':
      return 'seasonal-banner--neutral';
    case 'success':
      return 'seasonal-banner--success';
    case 'warning':
      return 'seasonal-banner--warning';
    default: {
      const _exhaustive: never = theme;
      return _exhaustive;
    }
  }
}

export function defaultAnimationForTheme(
  theme: PlatformAnnouncementTheme,
): PlatformAnnouncementAnimation {
  switch (theme) {
    case 'thanksgiving':
      return 'leaves';
    case 'friday':
      return 'friday';
    case 'neutral':
    case 'success':
    case 'warning':
      return 'none';
    default: {
      const _exhaustive: never = theme;
      return _exhaustive;
    }
  }
}

export function seasonalDismissStorageKey(id: string) {
  return `pconnect.seasonal.dismissed.${id}`;
}

/** datetime-local value from ISO string (local browser timezone). */
export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Convert datetime-local string to ISO UTC. */
export function fromDatetimeLocalValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date/time');
  }
  return date.toISOString();
}
