'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export interface PortalMember {
  id: string;
  linkedAt: string;
  isOrgAdmin?: boolean;
  isDefault?: boolean;
  user: {
    id: string;
    fullName: string;
    email: string;
    status: string;
  };
}

export interface PortalSeats {
  used: number;
  max: number;
  allowClientTeamInvite: boolean;
}

interface ContactRow {
  id: string;
  name: string;
  email?: string | null;
  isPrimary: boolean;
}

interface ClientPortalUsersProps {
  clientId: string;
  clientName: string;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  contacts: ContactRow[];
  members: PortalMember[];
  seats: PortalSeats;
  canManage: boolean;
  onChanged: () => Promise<void> | void;
  onNotice: (message: string | null) => void;
  onError: (message: string | null) => void;
  onInvite: (prefill?: { fullName: string; email: string }) => void;
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'inactive') return 'danger';
  if (status === 'invited') return 'warning';
  return 'neutral';
}

function statusLabel(status: string) {
  if (status === 'inactive') return 'Disabled';
  return status.replaceAll('_', ' ');
}

export function ClientPortalUsers({
  clientId,
  clientName,
  primaryContactName,
  primaryContactEmail,
  contacts,
  members,
  seats,
  canManage,
  onChanged,
  onNotice,
  onError,
  onInvite,
}: ClientPortalUsersProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const savedContacts = buildSavedContacts(
    clientName,
    primaryContactName,
    primaryContactEmail,
    contacts,
  );
  const membersByEmail = new Map(
    members.map((member) => [member.user.email.toLowerCase(), member]),
  );
  const orderedMembers = [...members].sort((left, right) => {
    if (left.isDefault === right.isDefault) {
      return left.user.fullName.localeCompare(right.user.fullName);
    }
    return left.isDefault ? -1 : 1;
  });

  async function reloadAfter(action: () => Promise<void>) {
    await action();
    await onChanged();
  }

  async function resend(member: PortalMember) {
    const turningOn = member.user.status === 'inactive';
    const confirmed = window.confirm(
      turningOn
        ? `Email a new temporary password to ${member.user.email}? This also turns the login back on, and the current password will stop working.`
        : `Email a new temporary password to ${member.user.email}? The current password will stop working.`,
    );
    if (!confirmed) return;
    setBusyId(member.user.id);
    onError(null);
    try {
      await reloadAfter(async () => {
        await apiRequest(
          `/clients/${clientId}/users/${member.user.id}/resend-invite`,
          { method: 'POST' },
        );
      });
      onNotice(`Login email sent to ${member.user.email}.`);
    } catch (error) {
      onError(
        error instanceof Error ? error.message : 'Failed to resend login email',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(member: PortalMember, status: 'active' | 'inactive') {
    if (status === 'inactive') {
      const confirmed = window.confirm(
        `Disable login for ${member.user.email}? They cannot sign in until you enable them again.`,
      );
      if (!confirmed) return;
    }
    setBusyId(member.user.id);
    onError(null);
    try {
      await reloadAfter(async () => {
        await apiRequest(
          `/clients/${clientId}/users/${member.user.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ status }),
          },
        );
      });
      onNotice(
        status === 'inactive'
          ? `Login disabled for ${member.user.email}.`
          : `Login enabled for ${member.user.email}.`,
      );
    } catch (error) {
      onError(
        error instanceof Error ? error.message : 'Failed to update login',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function remove(member: PortalMember) {
    const confirmed = window.confirm(
      `Delete the portal login for ${member.user.fullName}? They will lose access to this client.`,
    );
    if (!confirmed) return;
    setBusyId(member.user.id);
    onError(null);
    try {
      await reloadAfter(async () => {
        await apiRequest(`/clients/${clientId}/users/${member.user.id}`, {
          method: 'DELETE',
        });
      });
      onNotice(`Portal login deleted for ${member.user.fullName}.`);
    } catch (error) {
      onError(
        error instanceof Error ? error.message : 'Failed to delete portal login',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function toggleOrgAdmin(member: PortalMember) {
    setBusyId(member.user.id);
    onError(null);
    try {
      await reloadAfter(async () => {
        await apiRequest(`/clients/${clientId}/users/${member.user.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ isOrgAdmin: !member.isOrgAdmin }),
        });
      });
    } catch (error) {
      onError(
        error instanceof Error ? error.message : 'Failed to update member',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-medium text-[var(--foreground)]">
              Saved contacts
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              The default contact is the one saved on this client. Send a login
              from that contact, or from another contact, without typing it again.
            </p>
          </div>
          {canManage ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={seats.used >= seats.max}
              onClick={() => onInvite()}
            >
              <UserPlus className="h-4 w-4" />
              Send login details
            </Button>
          ) : null}
        </div>
        {savedContacts.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No contact email is saved yet. Add one on the Contacts tab, or send
            login details with a new email.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {savedContacts.map((contact) => {
              const member = membersByEmail.get(contact.email.toLowerCase());
              return (
                <li
                  key={contact.id}
                  className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {contact.name}
                      {contact.isPrimary ? (
                        <span className="ml-2 text-xs font-normal text-[var(--primary)]">
                          Default
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{contact.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {member ? (
                      <Badge variant={statusVariant(member.user.status)}>
                        {statusLabel(member.user.status)}
                      </Badge>
                    ) : canManage ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={seats.used >= seats.max}
                        onClick={() =>
                          onInvite({
                            fullName: contact.name,
                            email: contact.email,
                          })
                        }
                      >
                        Send login details
                      </Button>
                    ) : (
                      <Badge variant="neutral">No login</Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-3">
          <h3 className="text-sm font-medium text-[var(--foreground)]">
            Portal logins
          </h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {seats.used} / {seats.max} seats used. Disable keeps the login so
            you can turn it back on. Delete removes access.
          </p>
        </div>
        {orderedMembers.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No portal login yet. Send one from the default contact above.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {orderedMembers.map((member) => (
              <li
                key={member.id}
                className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {member.user.fullName}
                      {member.isDefault ? (
                        <span className="ml-2 text-xs font-normal text-[var(--primary)]">
                          Default
                        </span>
                      ) : null}
                      {member.isOrgAdmin ? (
                        <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                          Org admin
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {member.user.email}
                    </p>
                  </div>
                  <Badge
                    variant={statusVariant(member.user.status)}
                    className="capitalize"
                  >
                    {statusLabel(member.user.status)}
                  </Badge>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === member.user.id}
                      onClick={() => void resend(member)}
                    >
                      Resend
                    </Button>
                    {member.user.status === 'inactive' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={
                          busyId === member.user.id || seats.used >= seats.max
                        }
                        onClick={() => void setStatus(member, 'active')}
                      >
                        Enable
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === member.user.id}
                        onClick={() => void setStatus(member, 'inactive')}
                      >
                        Disable
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === member.user.id}
                      onClick={() => void toggleOrgAdmin(member)}
                    >
                      {member.isOrgAdmin ? 'Demote' : 'Make admin'}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busyId === member.user.id}
                      onClick={() => void remove(member)}
                    >
                      Delete
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function buildSavedContacts(
  clientName: string,
  primaryContactName: string | null | undefined,
  primaryContactEmail: string | null | undefined,
  contacts: ContactRow[],
) {
  const rows: Array<{
    id: string;
    name: string;
    email: string;
    isPrimary: boolean;
  }> = [];
  const seen = new Set<string>();
  const primaryEmail = primaryContactEmail?.trim();

  if (primaryEmail) {
    seen.add(primaryEmail.toLowerCase());
    rows.push({
      id: 'primary-contact',
      name: primaryContactName?.trim() || clientName,
      email: primaryEmail,
      isPrimary: true,
    });
  }

  for (const contact of contacts) {
    const email = contact.email?.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) {
      if (contact.isPrimary) {
        const existing = rows.find((row) => row.email.toLowerCase() === key);
        if (existing) existing.isPrimary = true;
      }
      continue;
    }
    seen.add(key);
    rows.push({
      id: contact.id,
      name: contact.name,
      email,
      isPrimary: contact.isPrimary,
    });
  }

  return rows.sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary));
}
