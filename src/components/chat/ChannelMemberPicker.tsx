'use client';

import { cn } from '@/lib/cn';

export interface MemberCandidate {
  id: string;
  fullName: string;
  email: string;
  userType: string;
}

interface ChannelMemberPickerProps {
  internalUsers: MemberCandidate[];
  clientUsers?: MemberCandidate[];
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  excludeUserIds?: string[];
  showClientUsers?: boolean;
}

export function ChannelMemberPicker({
  internalUsers,
  clientUsers = [],
  selectedUserIds,
  onChange,
  excludeUserIds = [],
  showClientUsers = false,
}: ChannelMemberPickerProps) {
  const excluded = new Set(excludeUserIds);

  function toggleUser(userId: string) {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
      return;
    }

    onChange([...selectedUserIds, userId]);
  }

  function renderUserList(
    title: string,
    users: MemberCandidate[],
    emptyMessage: string,
  ) {
    const visibleUsers = users.filter((user) => !excluded.has(user.id));

    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {title}
        </p>
        {visibleUsers.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>
        ) : (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] p-2">
            {visibleUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);

              return (
                <label
                  key={user.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] px-2 py-2 hover:bg-[var(--surface-muted)]',
                    isSelected && 'bg-[var(--primary-soft)]',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleUser(user.id)}
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[var(--foreground)]">
                      {user.fullName}
                    </span>
                    <span className="block truncate text-xs text-[var(--muted)]">
                      {user.email}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {renderUserList(
        'Internal team',
        internalUsers,
        'No internal users available.',
      )}
      {showClientUsers
        ? renderUserList(
            'Client team members',
            clientUsers,
            'No portal team members yet. Add them from the Clients → Portal users tab first.',
          )
        : null}
    </div>
  );
}
