'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserPlus, UsersRound } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ListSkeleton } from '@/components/ui/Skeleton';
import {
  EmptyState,
  ErrorState,
  RestrictedState,
} from '@/components/ui/StatePanels';
import { LinkClientUserModal } from '@/components/modals/LinkClientUserModal';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasPermission, userIsExternal } from '@/lib/auth';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface ClientOrg {
  id: string;
  name: string;
  allowClientTeamInvite?: boolean;
  maxPortalUsers?: number;
}

interface TeamMember {
  id: string;
  isOrgAdmin?: boolean;
  linkedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    status: string;
  };
}

interface PortalMembersResponse {
  items: TeamMember[];
  seats: {
    used: number;
    max: number;
    allowClientTeamInvite: boolean;
  };
  currentUserIsOrgAdmin: boolean;
}

export default function TeamPage() {
  const { user } = useWorkspace();
  const canInvitePerm = userHasPermission(user, 'clients.team_invite');
  const isExternal = userIsExternal(user);

  const [client, setClient] = useState<ClientOrg | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [seats, setSeats] = useState({
    used: 0,
    max: 5,
    allowClientTeamInvite: false,
  });
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!isExternal || !canInvitePerm) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const clientsResponse = await apiRequest<ApiResponse<ClientOrg[]>>(
        '/clients',
      );
      const org = clientsResponse.data[0] ?? null;
      setClient(org);
      if (!org) {
        setMembers([]);
        setErrorMessage(null);
        return;
      }

      const membersResponse = await apiRequest<
        ApiResponse<PortalMembersResponse>
      >(`/clients/${org.id}/users`);
      setMembers(membersResponse.data.items ?? []);
      setSeats(membersResponse.data.seats);
      setIsOrgAdmin(membersResponse.data.currentUserIsOrgAdmin);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load team',
      );
    } finally {
      setIsLoading(false);
    }
  }, [canInvitePerm, isExternal]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isExternal || !canInvitePerm) {
    return (
      <RestrictedState
        title="Team unavailable"
        description="This page is for client portal teammates."
      />
    );
  }

  const invitesEnabled = seats.allowClientTeamInvite;
  const canInvite =
    invitesEnabled && isOrgAdmin && seats.used < seats.max;
  const seatsFull = seats.used >= seats.max;

  return (
    <div className="space-y-4 pb-24 sm:pb-4">
      <PageHeader
        title="Team"
        description={
          client
            ? `People with portal access to ${client.name}.`
            : 'People with portal access to your organization.'
        }
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Team' },
        ]}
      />

      {isLoading ? <ListSkeleton rows={5} /> : null}
      {errorMessage ? (
        <ErrorState title="Unable to load team" description={errorMessage} />
      ) : null}

      {!isLoading && !errorMessage && !client ? (
        <EmptyState
          title="No organization linked"
          description="Ask your studio to link your account to a client organization."
        />
      ) : null}

      {!isLoading && !errorMessage && client ? (
        <>
          {!invitesEnabled ? (
            <Card>
              <div className="flex gap-3">
                <UsersRound className="h-5 w-5 shrink-0 text-[var(--muted)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    Team invites are turned off
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Ask your studio to enable teammate invites and set a seat
                    limit for {client.name}.
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          {invitesEnabled && !isOrgAdmin ? (
            <Card>
              <p className="text-sm text-[var(--muted)]">
                You can view teammates here. Only organization admins can send
                invites.
              </p>
            </Card>
          ) : null}

          <Card>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-medium text-[var(--foreground)]">
                  Members
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  {seats.used} / {seats.max} seats used
                  {seatsFull ? ' · seat limit reached' : ''}
                </p>
              </div>
              {isOrgAdmin && invitesEnabled ? (
                <Button
                  className="hidden h-11 w-full sm:inline-flex sm:h-10 sm:w-auto"
                  disabled={!canInvite}
                  onClick={() => setInviteOpen(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  Invite teammate
                </Button>
              ) : null}
            </div>

            {members.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No teammates yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {member.user.fullName}
                        {member.isOrgAdmin ? (
                          <span className="ml-2 text-xs font-normal text-[var(--primary)]">
                            Org admin
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {member.user.email}
                      </p>
                    </div>
                    <Badge variant="neutral" className="w-fit capitalize">
                      {member.user.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {isOrgAdmin && invitesEnabled ? (
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border)] bg-[var(--surface)] p-3 sm:hidden"
              style={{
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
              }}
            >
              <Button
                className="h-11 w-full"
                disabled={!canInvite}
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                Invite teammate
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      <LinkClientUserModal
        open={inviteOpen}
        clientId={client?.id ?? null}
        clientName={client?.name ?? null}
        mode="client"
        onClose={() => setInviteOpen(false)}
        onLinked={() => void load()}
      />
    </div>
  );
}
