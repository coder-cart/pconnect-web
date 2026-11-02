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
  presetType?: string;
  presetClientOrganizationId?: string;
  lockClientOrganization?: boolean;
  audience?: 'staff' | 'client';
}

interface MemberCandidatesResponse {
  internalUsers: MemberCandidate[];
  clientUsers: MemberCandidate[];
}

interface ClientOption {
  id: string;
  name: string;
}

export function CreateChannelModal({
  open,
  onClose,
  onCreated,
  presetType,
  presetClientOrganizationId,
  lockClientOrganization = false,
  audience = 'staff',
}: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('public');
  const [clientOrganizationId, setClientOrganizationId] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [internalUsers, setInternalUsers] = useState<MemberCandidate[]>([]);
  const [clientUsers, setClientUsers] = useState<MemberCandidate[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isClientAudience = audience === 'client';
  const isClientChannel = !isClientAudience && type === 'client_shared';
  const showMemberPicker = isClientAudience || type === 'private' || isClientChannel;
  const canSubmit =
    name.trim().length > 0 && (!isClientChannel || clientOrganizationId.length > 0);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName('');
    setType(isClientAudience ? 'private' : (presetType ?? 'public'));
    setClientOrganizationId(presetClientOrganizationId ?? '');
    setSelectedMemberIds([]);
    setErrorMessage(null);

    if (isClientAudience) {
      setClients([]);
      return;
    }

    apiRequest<ApiResponse<ClientOption[]>>('/clients')
      .then((response) => setClients(response.data))
      .catch(() => setClients([]));
  }, [open, presetType, presetClientOrganizationId, isClientAudience]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const query =
      isClientChannel && clientOrganizationId
        ? `?clientOrganizationId=${clientOrganizationId}`
        : '';

    apiRequest<ApiResponse<MemberCandidatesResponse>>(
      `/channels/member-candidates${query}`,
    )
      .then((response) => {
        setInternalUsers(response.data.internalUsers);
        setClientUsers(response.data.clientUsers ?? []);
      })
      .catch(() => {
        setInternalUsers([]);
        setClientUsers([]);
      });
  }, [open, isClientChannel, clientOrganizationId]);

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
          type: isClientAudience ? 'private' : type,
          clientOrganizationId: isClientChannel ? clientOrganizationId : undefined,
          memberUserIds: showMemberPicker ? selectedMemberIds : undefined,
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
      title={
        isClientAudience
          ? 'Create private channel'
          : isClientChannel
            ? 'Create client channel'
            : 'Create team channel'
      }
      description={
        isClientAudience
          ? 'Only people in your organization can see this channel. Members are notified when someone sends a message.'
          : isClientChannel
            ? 'Create a shared channel with a client. Add client contacts to invite them.'
            : 'Create a public or private internal channel, or a shared channel with a client.'
      }
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
          placeholder={isClientAudience ? 'e.g. design-review' : isClientChannel ? 'e.g. design' : 'e.g. engineering'}
          required
        />
        {isClientAudience ? null : (
        <Select
          label="Channel type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          options={[
            { value: 'public', label: 'Public (all internal users)' },
            { value: 'private', label: 'Private (members only)' },
            { value: 'client_shared', label: 'Client channel (shared with a client)' },
          ]}
        />
        )}

        {isClientChannel ? (
          <Select
            label="Client"
            value={clientOrganizationId}
            onChange={(event) => setClientOrganizationId(event.target.value)}
            disabled={lockClientOrganization}
            options={[
              { value: '', label: 'Select a client' },
              ...clients.map((client) => ({
                value: client.id,
                label: client.name,
              })),
            ]}
          />
        ) : null}

        {showMemberPicker ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              Initial members
            </p>
            <p className="text-xs text-[var(--muted)]">
              You are added automatically.
              {isClientAudience
                ? ' Select teammates below. Everyone added is notified about new messages.'
                : isClientChannel
                ? clientUsers.length > 0
                  ? ' Select client team members below — they receive an invite to join.'
                  : ' This client has no portal team members yet. Add them on Clients → Portal users, then invite them here.'
                : ''}
            </p>
            <ChannelMemberPicker
              internalUsers={internalUsers}
              clientUsers={isClientAudience || isClientChannel ? clientUsers : []}
              selectedUserIds={selectedMemberIds}
              onChange={setSelectedMemberIds}
              showClientUsers={isClientAudience || isClientChannel}
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
