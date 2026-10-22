import { getBrowserTimeZone } from '@/lib/formatMessageDate';

/** Common IANA zones for the account picker (device default is a separate option). */
export const COMMON_TIME_ZONES: string[] = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Warsaw',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
];

export function listTimeZoneOptions(): string[] {
  const supported =
    typeof Intl !== 'undefined' &&
    'supportedValuesOf' in Intl &&
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : COMMON_TIME_ZONES;

  const merged = new Set<string>([...COMMON_TIME_ZONES, ...supported]);
  const browser = getBrowserTimeZone();
  merged.add(browser);
  return Array.from(merged).sort((left, right) => left.localeCompare(right));
}

export function formatTimeZoneLabel(timeZone: string): string {
  try {
    const now = new Date();
    const offset =
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'shortOffset',
      })
        .formatToParts(now)
        .find((part) => part.type === 'timeZoneName')?.value ?? '';
    return offset ? `${timeZone} (${offset})` : timeZone;
  } catch {
    return timeZone;
  }
}
