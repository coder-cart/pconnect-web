'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  ChannelMemberPicker,
  MemberCandidate,
} from '@/components/chat/ChannelMemberPicker';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { cn } from '@/lib/cn';

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  presetType?: string;
  presetClientOrganizationId?: string;
  lockClientOrganization?: boolean;
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
}: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('public');
  const [clientOrganizationId, setClientOrganizationId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [internalUsers, setInternalUsers] = useState<MemberCandidate[]>([]);
  const [clientUsers, setClientUsers] = useState<MemberCandidate[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isClientChannel = type === 'client_shared';
  const isExternalConnectionFlow = presetType === 'client_shared';
  const showMemberPicker = type === 'private' || isClientChannel;
  const canSubmit =
    name.trim().length > 0 && (!isClientChannel || clientOrganizationId.length > 0);

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) => client.name.toLowerCase().includes(query));
  }, [clients, clientSearch]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName('');
    setType(presetType ?? 'public');
    setClientOrganizationId(presetClientOrganizationId ?? '');
    setClientSearch('');
    setSelectedMemberIds([]);
    setErrorMessage(null);

    apiRequest<ApiResponse<ClientOption[]>>('/clients')
      .then((response) => setClients(response.data))
      .catch(() => setClients([]));
  }, [open, presetType, presetClientOrganizationId]);

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
          type,
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
        isExternalConnectionFlow
          ? 'Create external connection'
          : isClientChannel
            ? 'Create client channel'
            : 'Create internal connection'
      }
      description={
        isExternalConnectionFlow
          ? 'Select a client, choose members, then create the connection.'
          : isClientChannel
            ? 'Create a shared channel with a client. Add client contacts to invite them.'
            : 'Create a public or private internal channel for your team.'
      }
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel={
            isExternalConnectionFlow ? 'Create connection' : 'Create channel'
          }
          isSubmitting={isSubmitting}
          disabled={!canSubmit}
        />
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        {!isExternalConnectionFlow ? (
          <Select
            label="Channel type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            options={[
              { value: 'public', label: 'Public (all internal users)' },
              { value: 'private', label: 'Private (members only)' },
              {
                value: 'client_shared',
                label: 'Client channel (shared with a client)',
              },
            ]}
          />
        ) : null}

        {isClientChannel ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              1. Select client
            </p>
            {!lockClientOrganization ? (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="search"
                  value={clientSearch}
                  onChange={(event) => setClientSearch(event.target.value)}
                  placeholder="Search clients..."
                  aria-label="Search clients"
                  className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
                />
              </div>
            ) : null}
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] p-2">
              {filteredClients.length === 0 ? (
                <p className="px-2 py-2 text-sm text-[var(--muted)]">
                  No clients match your search.
                </p>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = client.id === clientOrganizationId;
                  return (
                    <button
                      key={client.id}
                      type="button"
                      disabled={lockClientOrganization}
                      onClick={() => {
                        setClientOrganizationId(client.id);
                        setSelectedMemberIds([]);
                        if (isExternalConnectionFlow) {
                          setName(client.name);
                        }
                      }}
                      className={cn(
                        'flex w-full items-center rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors',
                        isSelected
                          ? 'bg-[var(--primary-soft)] font-medium text-[var(--primary)]'
                          : 'text-[var(--foreground)] hover:bg-[var(--surface-muted)]',
                        lockClientOrganization && 'cursor-default',
                      )}
                    >
                      {client.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        {showMemberPicker ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {isClientChannel ? '2. Select members' : 'Initial members'}
            </p>
            <p className="text-xs text-[var(--muted)]">
              You are added automatically.
              {isClientChannel
                ? !clientOrganizationId
                  ? ' Select a client first to load eligible members.'
                  : clientUsers.length > 0
                    ? ' Select team members below — client contacts receive an invite to join.'
                    : ' This client has no portal team members yet. Add them on Clients → Portal users, then invite them here.'
                : ''}
            </p>
            {isClientChannel && !clientOrganizationId ? (
              <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] px-3 py-4 text-sm text-[var(--muted)]">
                Choose a client to continue.
              </p>
            ) : (
              <ChannelMemberPicker
                internalUsers={internalUsers}
                clientUsers={isClientChannel ? clientUsers : []}
                selectedUserIds={selectedMemberIds}
                onChange={setSelectedMemberIds}
                showClientUsers={isClientChannel}
              />
            )}
          </div>
        ) : null}

        <Input
          label={isClientChannel ? '3. Connection name' : 'Channel name'}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={isClientChannel ? 'e.g. design' : 'e.g. engineering'}
          required
        />

        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
