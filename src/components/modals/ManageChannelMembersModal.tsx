'use client';

import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Search } from 'lucide-react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { MemberCandidate } from '@/components/chat/ChannelMemberPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ClientOrgLogo } from '@/components/ui/ClientOrgLogo';
import { TenantLogo } from '@/components/ui/TenantLogo';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface ManageChannelMembersModalProps {
  open: boolean;
  channelId: string | null;
  /** When true, only invite/remove/revoke client teammates (not studio staff). */
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
  clientOrganization?: {
    id: string;
    name: string;
    logoUpdatedAt?: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
    clientOrganizationId: string | null;
    clientOrganization?: {
      id: string;
      name: string;
      logoUpdatedAt?: string | null;
    } | null;
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
    () => [...clientUsers, ...internalUsers],
    [internalUsers, clientUsers],
  );

  const orderedMembers = useMemo(() => {
    const members = channel?.members ?? [];
    return [...members].sort((left, right) => {
      const leftExternal = left.user.userType === 'external' ? 0 : 1;
      const rightExternal = right.user.userType === 'external' ? 0 : 1;
      if (leftExternal !== rightExternal) {
        return leftExternal - rightExternal;
      }
      return left.user.fullName.localeCompare(right.user.fullName);
    });
  }, [channel?.members]);

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
      : 'Add teammate';
  const clientOrganization =
    channel?.clientOrganization ?? channel?.project?.clientOrganization ?? null;
  const hubLabel =
    clientOrganization?.name ?? channel?.displayName ?? channel?.name;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
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
              : `Add teammates to #${channel.name}.`
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
          <AccessSection title={`Current members (${channel.members.length})`}>
            {channel.members.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[var(--muted)]">No members yet.</p>
            ) : (
              orderedMembers.map((member) => (
                <AccessPersonRow
                  key={member.userId}
                  name={member.user.fullName}
                  email={member.user.email}
                  badge={
                    <AffiliationBadge
                      userType={member.user.userType}
                      clientOrganization={clientOrganization}
                    />
                  }
                  action={
                    !clientAdminMode || member.user.userType === 'external' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        disabled={actionUserId === member.userId}
                        onClick={() => void handleRemoveMember(member.userId)}
                      >
                        Remove
                      </Button>
                    ) : null
                  }
                />
              ))
            )}
          </AccessSection>

          {showClientUsers ? (
            <AccessSection title={`Pending invites (${pendingInvites.length})`}>
              {pendingInvites.length === 0 ? (
                <p className="px-3 py-3 text-sm text-[var(--muted)]">
                  No pending invites.
                </p>
              ) : (
                pendingInvites.map((invite) => (
                  <AccessPersonRow
                    key={invite.id}
                    name={invite.user.fullName}
                    email={invite.user.email}
                    badge={<Badge variant="warning">Pending</Badge>}
                    action={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        disabled={actionInviteId === invite.id}
                        onClick={() => void handleRevokeInvite(invite.id)}
                      >
                        Revoke
                      </Button>
                    }
                  />
                ))
              )}
            </AccessSection>
          ) : null}

          {availableCandidates.length > 0 ? (
            <AccessSection
              title={
                clientAdminMode
                  ? 'Your team members'
                  : showClientUsers
                    ? 'People you can add'
                    : 'Add people'
              }
            >
              <div className="border-b border-[var(--border)] p-2">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name or email"
                  leadingIcon={<Search className="h-4 w-4" />}
                />
              </div>
              {filteredCandidates.length === 0 ? (
                <p className="px-3 py-3 text-sm text-[var(--muted)]">
                  No matching people found.
                </p>
              ) : (
                filteredCandidates.map((user) => {
                  const selected = selectedUserId === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={`flex w-full min-w-0 items-center gap-3 border-b border-[var(--border)] px-3 py-2.5 text-left last:border-b-0 ${
                        selected
                          ? 'bg-[var(--primary-soft)]'
                          : 'hover:bg-[var(--surface-muted)]'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                          {user.fullName}
                        </span>
                        <span className="block truncate text-xs text-[var(--muted)]">
                          {user.email}
                        </span>
                      </span>
                      <AffiliationBadge
                        userType={user.userType}
                        clientOrganization={clientOrganization}
                      />
                    </button>
                  );
                })
              )}
            </AccessSection>
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

function AccessSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h3>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
        {children}
      </div>
    </section>
  );
}

function AccessPersonRow({
  name,
  email,
  badge,
  action,
}: {
  name: string;
  email: string;
  badge: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--border)] px-3 py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--foreground)]">{name}</p>
        <p className="truncate text-xs text-[var(--muted)]">{email}</p>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2">
        {badge}
        {action}
      </div>
    </div>
  );
}

function AffiliationBadge({
  userType,
  clientOrganization,
}: {
  userType: string;
  clientOrganization: {
    id: string;
    name: string;
    logoUpdatedAt?: string | null;
  } | null;
}) {
  const { user } = useWorkspace();
  const workspaceName = user.tenantName?.trim() || 'Workspace';

  if (userType === 'external' && clientOrganization) {
    return (
      <span className="inline-flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1">
        <ClientOrgLogo
          clientId={clientOrganization.id}
          name={clientOrganization.name}
          logoUpdatedAt={clientOrganization.logoUpdatedAt}
          className="h-5 w-5 rounded-full border-0"
        />
        <span className="truncate text-xs font-medium text-[var(--foreground)]">
          {clientOrganization.name}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1">
      <TenantLogo
        name={workspaceName}
        logoUpdatedAt={user.tenantLogoUpdatedAt}
        className="h-5 w-5 rounded-full border-0"
      />
      <span className="truncate text-xs font-medium text-[var(--foreground)]">
        {workspaceName}
      </span>
    </span>
  );
}
