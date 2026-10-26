export interface ChannelMemberOption {
  id: string;
  fullName: string;
  email: string;
  userType: 'internal' | 'external';
  avatarUpdatedAt?: string | null;
  inChannel?: boolean;
}

export type ChannelNotificationLevel = 'all' | 'mentions' | 'mute';

export interface ChannelNotificationPreference {
  notificationLevel: ChannelNotificationLevel;
  mutedUntil: string | null;
  effectiveLevel: ChannelNotificationLevel;
}

export function filterMentionCandidates(
  members: ChannelMemberOption[],
  currentUserId: string,
  isInternalUser: boolean,
  query: string,
): ChannelMemberOption[] {
  const normalizedQuery = query.trim().toLowerCase();

  return members.filter((member) => {
    if (member.id === currentUserId) {
      return false;
    }

    if (!isInternalUser && member.userType === 'external') {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      member.fullName.toLowerCase().includes(normalizedQuery) ||
      member.email.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function getClientTeamMembers(members: ChannelMemberOption[]) {
  return members.filter((member) => member.userType === 'external');
}

export function getMemberSourceLabel(member: ChannelMemberOption) {
  if (member.inChannel === false) {
    return 'Project member';
  }

  return member.userType === 'external' ? 'Client team' : 'In channel';
}
