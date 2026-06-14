'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { ChatChannel } from '@/lib/chat-types';

interface DmCandidate {
  id: string;
  fullName: string;
  email: string;
  userType: string;
}

interface StartDirectMessageModalProps {
  open: boolean;
  onClose: () => void;
  onStarted: (channel: ChatChannel) => void;
}

export function StartDirectMessageModal({
  open,
  onClose,
  onStarted,
}: StartDirectMessageModalProps) {
  const [candidates, setCandidates] = useState<DmCandidate[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery('');
    setErrorMessage(null);
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

  async function handleSelect(targetUserId: string) {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await apiRequest<ApiResponse<ChatChannel>>('/channels/direct', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });
      onStarted(response.data);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start direct message');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start a direct message"
      description="Choose someone to message. External clients can only message internal team members."
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={onClose}
          submitLabel="Close"
          isSubmitting={isSubmitting}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email"
          autoFocus
        />

        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] p-2">
          {isLoading ? (
            <p className="px-2 py-3 text-sm text-[var(--muted)]">Loading people...</p>
          ) : filteredCandidates.length === 0 ? (
            <p className="px-2 py-3 text-sm text-[var(--muted)]">No matching people found.</p>
          ) : (
            filteredCandidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleSelect(candidate.id)}
                className="flex w-full flex-col rounded-[var(--radius-md)] px-3 py-2 text-left hover:bg-[var(--surface-muted)] disabled:opacity-60"
              >
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {candidate.fullName}
                </span>
                <span className="text-xs text-[var(--muted)]">{candidate.email}</span>
              </button>
            ))
          )}
        </div>
      </form>
    </Modal>
  );
}
