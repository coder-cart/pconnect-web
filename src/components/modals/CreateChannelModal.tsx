'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  ChannelMemberPicker,
  MemberCandidate,
} from '@/components/chat/ChannelMemberPicker';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface MemberCandidatesResponse {
  internalUsers: MemberCandidate[];
  clientUsers: MemberCandidate[];
}

export function CreateChannelModal({
  open,
  onClose,
  onCreated,
}: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('public');
  const [internalUsers, setInternalUsers] = useState<MemberCandidate[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showMemberPicker = type === 'private';
  const canSubmit = name.trim().length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    setName('');
    setType('public');
    setSelectedMemberIds([]);
    setErrorMessage(null);

    apiRequest<ApiResponse<MemberCandidatesResponse>>('/channels/member-candidates')
      .then((response) => setInternalUsers(response.data.internalUsers))
      .catch(() => setInternalUsers([]));
  }, [open]);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest('/channels', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          type,
          memberUserIds: type === 'private' ? selectedMemberIds : undefined,
        }),
      });
      onCreated();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create channel',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create team channel"
      description="Create a public or private internal channel. Client messages use one hub per client from the Clients page."
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel="Create channel"
          isSubmitting={isSubmitting}
          disabled={!canSubmit}
        />
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="Channel name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. engineering"
          required
        />
        <Select
          label="Channel type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          options={[
            { value: 'public', label: 'Public (all internal users)' },
            { value: 'private', label: 'Private (members only)' },
          ]}
        />

        {showMemberPicker ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              Initial members
            </p>
            <p className="text-xs text-[var(--muted)]">
              You are added automatically.
            </p>
            <ChannelMemberPicker
              internalUsers={internalUsers}
              clientUsers={[]}
              selectedUserIds={selectedMemberIds}
              onChange={setSelectedMemberIds}
              showClientUsers={false}
            />
          </div>
        ) : null}

        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
