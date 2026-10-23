/** Deterministic neutral palette — same name always gets the same color. */
const AVATAR_PALETTE = [
  { bg: '#e0e7ff', fg: '#3730a3' },
  { bg: '#dbeafe', fg: '#1e40af' },
  { bg: '#d1fae5', fg: '#065f46' },
  { bg: '#fef3c7', fg: '#92400e' },
  { bg: '#fce7f3', fg: '#9d174d' },
  { bg: '#ede9fe', fg: '#5b21b6' },
  { bg: '#ffedd5', fg: '#9a3412' },
  { bg: '#e0f2fe', fg: '#075985' },
] as const;

export function avatarToneForName(name: string): { bg: string; fg: string } {
  const normalized = name.trim().toLowerCase() || '?';
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
}
