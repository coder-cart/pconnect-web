'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Loader2, MessageSquare } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
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

interface ConnectionMember {
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
  const [members, setMembers] = useState<ConnectionMember[]>([]);
  const [selectedClient, setSelectedClient] = useState<ConnectionClient | null>(
    null,
  );
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [startingUserId, setStartingUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setSelectedClient(null);
    setMembers([]);
    setQuery('');
    setErrorMessage(null);
    setStartingUserId(null);
    setIsLoading(true);

    apiRequest<ApiResponse<ConnectionClient[]>>('/channels/connection-clients')
      .then((response) => setClients(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open || !selectedClient) return;

    setMembers([]);
    setQuery('');
    setErrorMessage(null);
    setIsLoading(true);

    apiRequest<ApiResponse<ConnectionMember[]>>(
      `/channels/connection-clients/${selectedClient.id}/members`,
    )
      .then((response) => setMembers(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }, [open, selectedClient]);

  const filteredClients = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) => client.name.toLowerCase().includes(term));
  }, [clients, query]);

  const filteredMembers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return members;
    return members.filter(
      (member) =>
        member.fullName.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term),
    );
  }, [members, query]);

  async function handleSelectMember(targetUserId: string) {
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
        error instanceof Error ? error.message : 'Unable to start this chat',
      );
      setStartingUserId(null);
    }
  }

  const isBusy = Boolean(startingUserId);

  return (
    <Modal
      open={open}
      onClose={isBusy ? () => undefined : onClose}
      title="Add connection"
      description={
        selectedClient
          ? `Choose a member of ${selectedClient.name}. An existing chat opens instead of a duplicate.`
          : 'Choose a client, then the member you want to chat with.'
      }
      size="md"
    >
      <div className="space-y-3">
        {selectedClient ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBusy}
            onClick={() => setSelectedClient(null)}
          >
            <ChevronLeft className="h-4 w-4" />
            All clients
          </Button>
        ) : null}

        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={selectedClient ? 'Search members' : 'Search clients'}
          aria-label={selectedClient ? 'Search members' : 'Search clients'}
          disabled={isBusy}
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
            filteredMembers.length === 0 ? (
              <p className="px-3 py-6 text-sm text-[var(--muted)]">
                No members available for this client.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleSelectMember(member.id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--surface-muted)] disabled:opacity-60',
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
                    {startingUserId === member.id ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--primary)]" />
                    ) : (
                      <MessageSquare className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                    )}
                  </button>
                ))}
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
