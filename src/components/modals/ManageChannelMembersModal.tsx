'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { MemberCandidate } from '@/components/chat/ChannelMemberPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';

interface ManageChannelMembersModalProps {
  open: boolean;
  channelId: string | null;
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
  onClose,
  onUpdated,
}: ManageChannelMembersModalProps) {
  const [channel, setChannel] = useState<ChannelDetails | null>(null);
  const [internalUsers, setInternalUsers] = useState<MemberCandidate[]>([]);
  const [clientUsers, setClientUsers] = useState<MemberCandidate[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
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

  const selectedCandidate = availableCandidates.find(
    (user) => user.id === selectedUserId,
  );

  useEffect(() => {
    if (!availableCandidates.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(availableCandidates[0]?.id ?? '');
    }
  }, [availableCandidates, selectedUserId]);

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
    selectedCandidate?.userType === 'external' ? 'Send invite' : 'Add member';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage members"
      description={
        channel
          ? `Manage membership for #${channel.name}.`
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={actionUserId === member.userId}
                      onClick={() => void handleRemoveMember(member.userId)}
                    >
                      Remove
                    </Button>
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
            <Select
              label="Add member or invite client user"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              options={availableCandidates.map((user) => ({
                value: user.id,
                label: `${user.fullName} (${user.userType === 'external' ? 'client — invite' : 'internal'})`,
              }))}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">
              All eligible users are already members or have pending invites.
            </p>
          )}

          {showClientUsers ? (
            <p className="text-xs text-[var(--muted)]">
              Client users receive a pending invite and must accept before joining.
              They must be linked to{' '}
              {channel.project?.clientOrganization?.name ?? 'the client organization'}.
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
