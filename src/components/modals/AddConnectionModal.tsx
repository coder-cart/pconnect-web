'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, Loader2 } from 'lucide-react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { ChatChannel } from '@/lib/chat-types';
import { cn } from '@/lib/cn';

interface ConnectionClient {
  id: string;
  name: string;
}

interface StaffCandidate {
  id: string;
  fullName: string;
  email: string;
  avatarUpdatedAt?: string | null;
}

interface AddConnectionModalProps {
  open: boolean;
  onClose: () => void;
  onStarted: (channel: ChatChannel) => void;
}

export function AddConnectionModal({
  open,
  onClose,
  onStarted,
}: AddConnectionModalProps) {
  const [clients, setClients] = useState<ConnectionClient[]>([]);
  const [staff, setStaff] = useState<StaffCandidate[]>([]);
  const [selectedClient, setSelectedClient] = useState<ConnectionClient | null>(
    null,
  );
  const [channelName, setChannelName] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setSelectedClient(null);
    setChannelName('');
    setSelectedStaffIds([]);
    setStaff([]);
    setQuery('');
    setErrorMessage(null);
    setIsSaving(false);
    setIsLoading(true);

    apiRequest<ApiResponse<ConnectionClient[]>>('/channels/connection-clients')
      .then((response) => setClients(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open || !selectedClient) return;

    setChannelName(selectedClient.name);
    setSelectedStaffIds([]);
    setStaff([]);
    setQuery('');
    setErrorMessage(null);
    setIsLoading(true);

    apiRequest<
      ApiResponse<{
        internalUsers: StaffCandidate[];
      }>
    >(
      `/channels/member-candidates?clientOrganizationId=${encodeURIComponent(selectedClient.id)}`,
    )
      .then((response) => setStaff(response.data.internalUsers ?? []))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }, [open, selectedClient]);

  const filteredClients = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) => client.name.toLowerCase().includes(term));
  }, [clients, query]);

  const filteredStaff = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return staff;
    return staff.filter(
      (member) =>
        member.fullName.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term),
    );
  }, [staff, query]);

  function toggleStaff(userId: string) {
    setSelectedStaffIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  const canCreate =
    Boolean(selectedClient) && channelName.trim().length > 0 && !isSaving;

  async function handleSave() {
    if (!selectedClient || !canCreate) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<ApiResponse<ChatChannel>>(
        '/channels/external-connections',
        {
          method: 'POST',
          body: JSON.stringify({
            clientOrganizationId: selectedClient.id,
            name: channelName.trim(),
            memberUserIds: selectedStaffIds,
          }),
        },
      );
      onStarted(response.data);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create this channel',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={isSaving ? () => undefined : onClose}
      title="New external channel"
      description={
        selectedClient
          ? `Create a new shared channel for ${selectedClient.name}. Client portal users are added automatically.`
          : 'Choose a client, name the channel, then add Managers, QA, or Editors.'
      }
      size="md"
      footer={
        selectedClient ? (
          <ModalActions
            onCancel={onClose}
            onSubmit={() => void handleSave()}
            submitLabel="Create channel"
            isSubmitting={isSaving}
            disabled={!canCreate}
          />
        ) : undefined
      }
    >
      <div className="space-y-3">
        {selectedClient ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSaving}
            onClick={() => {
              setSelectedClient(null);
              setChannelName('');
            }}
          >
            <ChevronLeft className="h-4 w-4" />
            All clients
          </Button>
        ) : null}

        {selectedClient ? (
          <Input
            label="Channel name"
            value={channelName}
            onChange={(event) => setChannelName(event.target.value)}
            placeholder="e.g. design-review"
            required
            disabled={isSaving}
          />
        ) : null}

        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            selectedClient ? 'Search team members' : 'Search clients'
          }
          aria-label={selectedClient ? 'Search team members' : 'Search clients'}
          disabled={isSaving}
        />

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-3 py-2 text-sm text-[var(--danger)]"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="rounded-[var(--radius-md)] border border-[var(--border)]">
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-[var(--muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading
            </div>
          ) : selectedClient ? (
            filteredStaff.length === 0 ? (
              <p className="px-3 py-6 text-sm text-[var(--muted)]">
                No internal team members available.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filteredStaff.map((member) => {
                  const selected = selectedStaffIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      disabled={isSaving}
                      onClick={() => toggleStaff(member.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--surface-muted)] disabled:opacity-60',
                        selected && 'bg-[var(--primary-soft)]/40',
                      )}
                    >
                      <UserAvatar
                        user={{
                          id: member.id,
                          fullName: member.fullName,
                          avatarUpdatedAt: member.avatarUpdatedAt,
                        }}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                          {member.fullName}
                        </span>
                        <span className="block truncate text-xs text-[var(--muted)]">
                          {member.email}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded border',
                          selected
                            ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                            : 'border-[var(--border)] text-transparent',
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          ) : filteredClients.length === 0 ? (
            <p className="px-3 py-6 text-sm text-[var(--muted)]">
              No clients are available for your role.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClient(client)}
                  className="flex w-full items-center px-3 py-2.5 text-left text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                >
                  <span className="truncate">{client.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
