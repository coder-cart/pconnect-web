'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
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
  const [query, setQuery] = useState('');
  const excluded = new Set(excludeUserIds);
  const normalizedQuery = query.trim().toLowerCase();

  function toggleUser(userId: string) {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
      return;
    }

    onChange([...selectedUserIds, userId]);
  }

  function filterUsers(users: MemberCandidate[]) {
    return users.filter((user) => {
      if (excluded.has(user.id)) return false;
      if (!normalizedQuery) return true;
      return (
        user.fullName.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery)
      );
    });
  }

  function renderUserList(
    title: string,
    users: MemberCandidate[],
    emptyMessage: string,
  ) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {title}
        </p>
        {users.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>
        ) : (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] p-2">
            {users.map((user) => {
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

  const filteredInternal = filterUsers(internalUsers);
  const filteredClient = filterUsers(clientUsers);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search members..."
          aria-label="Search members"
          className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
        />
      </div>
      {showClientUsers
        ? renderUserList(
            'Client team members',
            filteredClient,
            normalizedQuery
              ? 'No client members match your search.'
              : 'No portal team members yet. Add them from the Clients → Portal users tab first.',
          )
        : null}
      {renderUserList(
        'Internal team',
        filteredInternal,
        normalizedQuery
          ? 'No internal members match your search.'
          : 'No internal users available.',
      )}
    </div>
  );
}
