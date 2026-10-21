'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { MemberCandidate } from '@/components/chat/ChannelMemberPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';

interface ManageChannelMembersModalProps {
  open: boolean;
  channelId: string | null;
  /** When true, only invite/revoke client teammates (no remove member). */
  clientAdminMode?: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

interface ChannelMember {
  userId: string;
  user: MemberCandidate;
}

interface ChannelInvite {
  id: string;
  userId: string;
  createdAt: string;
  user: MemberCandidate;
  inviter?: { fullName: string };
}

interface ChannelDetails {
  id: string;
  name: string;
  type: string;
  displayName?: string;
  clientOrganizationId?: string | null;
  clientOrganization?: { id: string; name: string } | null;
  project?: {
    id: string;
    name: string;
    clientOrganizationId: string | null;
    clientOrganization?: { id: string; name: string } | null;
  } | null;
  members: ChannelMember[];
  invites?: ChannelInvite[];
}

interface MemberCandidatesResponse {
  internalUsers: MemberCandidate[];
  clientUsers: MemberCandidate[];
}

export function ManageChannelMembersModal({
  open,
  channelId,
  clientAdminMode = false,
  onClose,
  onUpdated,
}: ManageChannelMembersModalProps) {
  const [channel, setChannel] = useState<ChannelDetails | null>(null);
  const [internalUsers, setInternalUsers] = useState<MemberCandidate[]>([]);
  const [clientUsers, setClientUsers] = useState<MemberCandidate[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionInviteId, setActionInviteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadChannelData = useCallback(async () => {
    if (!channelId) return;

    const channelResponse = await apiRequest<ApiResponse<ChannelDetails>>(
      `/channels/${channelId}`,
    );
    const channelData = channelResponse.data;
    setChannel(channelData);

    const clientOrganizationId =
      channelData.clientOrganizationId ??
      channelData.clientOrganization?.id ??
      channelData.project?.clientOrganizationId ??
      channelData.project?.clientOrganization?.id;

    const params = new URLSearchParams();
    if (clientOrganizationId) {
      params.set('clientOrganizationId', clientOrganizationId);
    }
    params.set('channelId', channelId);

    const candidatesResponse = await apiRequest<
      ApiResponse<MemberCandidatesResponse>
    >(`/channels/member-candidates?${params.toString()}`);

    setInternalUsers(candidatesResponse.data.internalUsers);
    setClientUsers(candidatesResponse.data.clientUsers);
  }, [channelId]);

  useEffect(() => {
    if (!open || !channelId) {
      setChannel(null);
      setSelectedUserId('');
      setSearchQuery('');
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);
    loadChannelData()
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }, [open, channelId, loadChannelData]);

  const availableCandidates = useMemo(
    () => [...internalUsers, ...clientUsers],
    [internalUsers, clientUsers],
  );

  const filteredCandidates = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return availableCandidates;

    return availableCandidates.filter(
      (user) =>
        user.fullName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term),
    );
  }, [availableCandidates, searchQuery]);

  const selectedCandidate = availableCandidates.find(
    (user) => user.id === selectedUserId,
  );

  useEffect(() => {
    if (!filteredCandidates.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(filteredCandidates[0]?.id ?? '');
    }
  }, [filteredCandidates, selectedUserId]);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!channelId || !selectedUserId || !selectedCandidate) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const endpoint =
        channel?.type === 'client_shared' &&
        selectedCandidate.userType === 'external'
          ? `/channels/${channelId}/invites`
          : `/channels/${channelId}/members`;

      await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ userId: selectedUserId }),
      });

      await loadChannelData();
      setSelectedUserId('');
      setSearchQuery('');
      onUpdated();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to add member',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!channelId) return;

    setActionUserId(userId);
    setErrorMessage(null);

    try {
      await apiRequest(`/channels/${channelId}/members/${userId}`, {
        method: 'DELETE',
      });
      await loadChannelData();
      onUpdated();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to remove member',
      );
    } finally {
      setActionUserId(null);
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!channelId) return;

    setActionInviteId(inviteId);
    setErrorMessage(null);

    try {
      await apiRequest(`/channels/${channelId}/invites/${inviteId}`, {
        method: 'DELETE',
      });
      await loadChannelData();
      onUpdated();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to revoke invite',
      );
    } finally {
      setActionInviteId(null);
    }
  }

  const showClientUsers = channel?.type === 'client_shared';
  const pendingInvites = channel?.invites ?? [];
  const addLabel =
    selectedCandidate?.userType === 'external' || clientAdminMode
      ? 'Send invite'
      : 'Add member';
  const hubLabel =
    channel?.clientOrganization?.name ??
    channel?.project?.clientOrganization?.name ??
    channel?.displayName ??
    channel?.name;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        clientAdminMode
          ? 'Add team members'
          : showClientUsers
            ? 'Manage client access'
            : 'Manage members'
      }
      description={
        channel
          ? clientAdminMode
            ? `Invite your portal teammates to ${hubLabel}. They must accept before they can message.`
            : showClientUsers
              ? `Add internal teammates or invite client team members to ${hubLabel}.`
              : `Manage membership for #${channel.name}.`
          : 'Load channel members and invite additional people.'
      }
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel={addLabel}
          isSubmitting={isSubmitting}
          disabled={!selectedUserId || isLoading}
        />
      }
    >
      {isLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading members...</p>
      ) : null}

      {!isLoading && channel ? (
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              Current members ({channel.members.length})
            </p>
            <div className="max-h-44 space-y-2 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] p-3">
              {channel.members.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No members yet.</p>
              ) : null}
              {channel.members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {member.user.fullName}
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {member.user.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant={
                        member.user.userType === 'external' ? 'warning' : 'default'
                      }
                    >
                      {member.user.userType === 'external' ? 'Client' : 'Internal'}
                    </Badge>
                    {!clientAdminMode ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={actionUserId === member.userId}
                        onClick={() => void handleRemoveMember(member.userId)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showClientUsers ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--foreground)]">
                Pending invites ({pendingInvites.length})
              </p>
              <div className="max-h-36 space-y-2 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                {pendingInvites.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No pending invites.</p>
                ) : null}
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {invite.user.fullName}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {invite.user.email}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="warning">Pending</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={actionInviteId === invite.id}
                        onClick={() => void handleRevokeInvite(invite.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {availableCandidates.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {clientAdminMode
                  ? 'Your team members'
                  : showClientUsers
                    ? 'People you can add'
                    : 'Add people'}
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name or email"
                  className="pl-10"
                />
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] p-2">
                {filteredCandidates.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-[var(--muted)]">
                    No matching people found.
                  </p>
                ) : (
                  filteredCandidates.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={`flex w-full flex-col rounded-[var(--radius-md)] px-3 py-2 text-left ${
                        selectedUserId === user.id
                          ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                          : 'hover:bg-[var(--surface-muted)]'
                      }`}
                    >
                      <span className="text-sm font-medium">{user.fullName}</span>
                      <span className="text-xs opacity-80">
                        {user.email} ·{' '}
                        {user.userType === 'external'
                          ? 'client team (invite)'
                          : 'internal'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              {clientAdminMode
                ? 'All of your teammates are already members or have pending invites. Ask your studio to add more portal users if you need a larger team.'
                : 'All eligible users are already members or have pending invites. Add client team members from the Clients → Portal users tab first.'}
            </p>
          )}

          {showClientUsers ? (
            <p className="text-xs text-[var(--muted)]">
              {clientAdminMode
                ? 'Invited teammates must accept before they can read or send messages in this channel.'
                : `Client team members must be linked to ${hubLabel} on the Clients page. They receive a pending invite and must accept before messaging.`}
            </p>
          ) : null}
        </div>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}
    </Modal>
  );
}
