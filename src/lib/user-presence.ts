export type PresenceAvailability = 'active' | 'away';

export interface UserPresenceFields {
  presenceStatus?: PresenceAvailability | string | null;
  statusText?: string | null;
  statusEmoji?: string | null;
}

export const CUSTOM_STATUS_PRESETS: Array<{ emoji: string; text: string }> = [
  { emoji: '📅', text: 'In a meeting' },
  { emoji: '📞', text: 'On a call' },
  { emoji: '🎯', text: 'Focusing' },
  { emoji: '🤒', text: 'Out sick' },
  { emoji: '🌴', text: 'On vacation' },
  { emoji: '⏳', text: 'Be right back' },
];

export function isAway(presenceStatus?: string | null) {
  return presenceStatus === 'away';
}

export function availabilityLabel(presenceStatus?: string | null) {
  return isAway(presenceStatus) ? 'Away' : 'Active';
}

export function formatCustomStatus(fields: UserPresenceFields) {
  return [fields.statusEmoji, fields.statusText].filter(Boolean).join(' ').trim();
}

export function applyPresenceUpdate<T extends UserPresenceFields>(
  target: T,
  update: UserPresenceFields,
): T {
  return {
    ...target,
    presenceStatus: update.presenceStatus ?? target.presenceStatus,
    statusText:
      update.statusText !== undefined ? update.statusText : target.statusText,
    statusEmoji:
      update.statusEmoji !== undefined ? update.statusEmoji : target.statusEmoji,
  };
}
