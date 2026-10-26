'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquare, Search, Users } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { ChatChannel } from '@/lib/chat-types';
import { cn } from '@/lib/cn';

interface DmCandidate {
  id: string;
  fullName: string;
  email: string;
  userType: string;
  avatarUpdatedAt?: string | null;
}

interface StartDirectMessageModalProps {
  open: boolean;
  onClose: () => void;
  onStarted: (channel: ChatChannel) => void;
  isExternalUser?: boolean;
}

type CandidateGroup = {
  key: string;
  label: string;
  people: DmCandidate[];
};

function CandidateRow({
  candidate,
  disabled,
  isStarting,
  onSelect,
}: {
  candidate: DmCandidate;
  disabled: boolean;
  isStarting: boolean;
  onSelect: (userId: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(candidate.id)}
      aria-busy={isStarting}
      className={cn(
        'group flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left transition-colors',
        'hover:bg-[var(--surface-muted)] focus-visible:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        isStarting && 'bg-[var(--primary-soft)]',
      )}
    >
      <UserAvatar
        user={{
          id: candidate.id,
          fullName: candidate.fullName,
          avatarUpdatedAt: candidate.avatarUpdatedAt,
        }}
        size="sm"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--foreground)]">
          {candidate.fullName}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
          {candidate.email}
        </span>
      </span>
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition-colors',
          isStarting
            ? 'text-[var(--primary)]'
            : 'group-hover:bg-[var(--surface)] group-hover:text-[var(--foreground)]',
        )}
        aria-hidden="true"
      >
        {isStarting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}
      </span>
    </button>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-1 p-1" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5"
        >
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[var(--surface-muted)]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-[var(--surface-muted)]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--surface-muted)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StartDirectMessageModal({
  open,
  onClose,
  onStarted,
  isExternalUser = false,
}: StartDirectMessageModalProps) {
  const [candidates, setCandidates] = useState<DmCandidate[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [startingUserId, setStartingUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery('');
    setErrorMessage(null);
    setStartingUserId(null);
    setIsLoading(true);

    apiRequest<ApiResponse<DmCandidate[]>>('/channels/dm-candidates')
      .then((response) => setCandidates(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }, [open]);

  const filteredCandidates = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return candidates;

    return candidates.filter(
      (candidate) =>
        candidate.fullName.toLowerCase().includes(term) ||
        candidate.email.toLowerCase().includes(term),
    );
  }, [candidates, query]);

  const groups = useMemo((): CandidateGroup[] => {
    if (!isExternalUser) {
      return filteredCandidates.length
        ? [{ key: 'all', label: 'People', people: filteredCandidates }]
        : [];
    }

    const teammates = filteredCandidates.filter(
      (candidate) => candidate.userType === 'external',
    );
    const studio = filteredCandidates.filter(
      (candidate) => candidate.userType !== 'external',
    );

    const next: CandidateGroup[] = [];
    if (teammates.length > 0) {
      next.push({ key: 'team', label: 'Your team', people: teammates });
    }
    if (studio.length > 0) {
      next.push({ key: 'studio', label: 'Studio', people: studio });
    }
    return next;
  }, [filteredCandidates, isExternalUser]);

  async function handleSelect(targetUserId: string) {
    if (startingUserId) return;

    setStartingUserId(targetUserId);
    setErrorMessage(null);

    try {
      const response = await apiRequest<ApiResponse<ChatChannel>>(
        '/channels/direct',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId }),
        },
      );
      onStarted(response.data);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to start direct message',
      );
      setStartingUserId(null);
    }
  }

  const isBusy = Boolean(startingUserId);
  const hasQuery = query.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={isBusy ? () => undefined : onClose}
      title="New message"
      description={
        isExternalUser
          ? 'Pick a teammate or someone from the studio.'
          : 'Search and select someone to start chatting.'
      }
      size="md"
    >
      <div className="space-y-4">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email"
          autoFocus
          leadingIcon={<Search className="h-4 w-4" />}
          disabled={isBusy}
          aria-label="Search people"
        />

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-3 py-2 text-sm text-[var(--danger)]"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
          <div className="max-h-[min(22rem,50dvh)] overflow-y-auto overscroll-contain">
            {isLoading ? (
              <LoadingRows />
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
                  <Users className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {hasQuery ? 'No matches' : 'No one to message yet'}
                </p>
                <p className="max-w-[16rem] text-xs text-[var(--muted)]">
                  {hasQuery
                    ? 'Try another name or email.'
                    : isExternalUser
                      ? 'Teammates and studio contacts will show up here once they are on your workspace.'
                      : 'People you can message will appear here.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {groups.map((group) => (
                  <div key={group.key} className="p-1.5">
                    {isExternalUser || groups.length > 1 ? (
                      <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {group.label}
                        <span className="ml-1.5 font-normal tabular-nums">
                          {group.people.length}
                        </span>
                      </p>
                    ) : null}
                    <div className="space-y-0.5">
                      {group.people.map((candidate) => (
                        <CandidateRow
                          key={candidate.id}
                          candidate={candidate}
                          disabled={isBusy}
                          isStarting={startingUserId === candidate.id}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-[var(--muted)]">
          Click a person to open the conversation.
        </p>
      </div>
    </Modal>
  );
}
