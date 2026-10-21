'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/Skeleton';
import {
  EmptyState,
  ErrorState,
  RestrictedState,
} from '@/components/ui/StatePanels';
import { CreateUserModal } from '@/components/modals/CreateUserModal';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasPermission } from '@/lib/auth';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { getRoleLabel } from '@/lib/navigation';

interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  userType: string;
  status: string;
  lastLoginAt?: string | null;
  userRoles?: Array<{ role: { code: string; name: string } }>;
}

const ROLE_OPTIONS = [
  { value: 'internal_admin', label: 'Admin' },
  { value: 'internal_manager', label: 'Manager' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'qa', label: 'QA Reviewer' },
  { value: 'editor', label: 'Editor' },
];

export default function StaffPage() {
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const canManage = userHasPermission(user, 'users.manage');
  const [items, setItems] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editRoleCode, setEditRoleCode] = useState('editor');
  const [editPassword, setEditPassword] = useState('');
  const [editSetPassword, setEditSetPassword] = useState(false);
  const [editMustChangePassword, setEditMustChangePassword] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editMagicUrl, setEditMagicUrl] = useState<string | null>(null);
  const [editTempPassword, setEditTempPassword] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!canManage) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    apiRequest<ApiResponse<StaffUser[]>>('/users?userType=internal')
      .then((response) => {
        setItems(response.data);
        setErrorMessage(null);
      })
      .catch((error) => {
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load staff',
        );
      })
      .finally(() => setIsLoading(false));
  }, [canManage, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const roles = item.userRoles?.map((r) => r.role.code).join(' ') ?? '';
      return `${item.fullName} ${item.email} ${item.status} ${roles}`
        .toLowerCase()
        .includes(q);
    });
  }, [items, searchQuery]);

  function openEdit(item: StaffUser) {
    setEditing(item);
    setEditFullName(item.fullName);
    setEditStatus(item.status);
    setEditRoleCode(item.userRoles?.[0]?.role.code ?? 'editor');
    setEditPassword('');
    setEditSetPassword(false);
    setEditMustChangePassword(false);
    setEditError(null);
    setEditMagicUrl(null);
    setEditTempPassword(null);
    setEditSuccess(null);
    setCopiedLabel(null);
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(null), 2000);
    } catch {
      setEditError('Could not copy to clipboard');
    }
  }

  async function patchStaff(body: Record<string, unknown>) {
    if (!editing) return null;
    setEditBusy(true);
    setEditError(null);
    setEditSuccess(null);
    try {
      const response = await apiRequest<
        ApiResponse<
          StaffUser & { magicLoginUrl?: string; temporaryPassword?: string }
        >
      >(`/users/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      notifyRefresh();
      load();
      setEditing((prev) =>
        prev
          ? {
              ...prev,
              fullName: response.data.fullName,
              status: response.data.status,
              userRoles: response.data.userRoles,
            }
          : prev,
      );
      setEditStatus(response.data.status);
      return response.data;
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Update failed');
      return null;
    } finally {
      setEditBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    if (editSetPassword && editPassword.length < 10) {
      setEditError(
        'Password must be at least 10 characters with upper, lower, number, and symbol.',
      );
      return;
    }

    setEditMagicUrl(null);
    setEditTempPassword(null);

    const data = await patchStaff({
      fullName: editFullName.trim(),
      status: editStatus,
      roleCode: editRoleCode,
      ...(editSetPassword
        ? {
            password: editPassword,
            mustChangePassword: editMustChangePassword,
          }
        : {}),
    });

    if (data) {
      setEditSuccess('Profile saved.');
      setEditSetPassword(false);
      setEditPassword('');
    }
  }

  async function handleResetPassword() {
    if (!editing) return;
    if (
      !window.confirm(
        `Reset password for ${editing.fullName}? A temporary password will be generated for you to copy and send.`,
      )
    ) {
      return;
    }
    setEditMagicUrl(null);
    const data = await patchStaff({ resetPassword: true });
    if (data?.temporaryPassword) {
      setEditTempPassword(data.temporaryPassword);
      setEditSuccess(
        'Password reset. Copy the temporary password and send it to the editor.',
      );
    }
  }

  async function handleSendMagicLink() {
    if (!editing) return;
    setEditTempPassword(null);
    const data = await patchStaff({ sendMagicLink: true });
    if (data?.magicLoginUrl) {
      setEditMagicUrl(data.magicLoginUrl);
      setEditSuccess(
        'Magic link ready. Copy it and send it to the editor (also emailed if SMTP is on).',
      );
    }
  }

  async function handleToggleActive() {
    if (!editing) return;
    const nextStatus = editStatus === 'active' ? 'inactive' : 'active';
    const label = nextStatus === 'inactive' ? 'deactivate' : 'reactivate';
    if (
      !window.confirm(
        `${label === 'deactivate' ? 'Deactivate' : 'Reactivate'} ${editing.fullName}?`,
      )
    ) {
      return;
    }
    const data = await patchStaff({ status: nextStatus });
    if (data) {
      setEditSuccess(
        nextStatus === 'inactive'
          ? 'Editor deactivated. They can no longer sign in.'
          : 'Editor reactivated.',
      );
    }
  }

  if (!canManage) {
    return (
      <RestrictedState
        title="Staff management restricted"
        description="You need permission to manage workspace staff."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Staff"
        description="Internal team members — separate from client portal users."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Staff' },
        ]}
        action={
          <Button onClick={() => setCreateOpen(true)}>Invite staff</Button>
        }
      />

      <div className="max-w-md">
        <Input
          label="Search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name, email, or role…"
        />
      </div>

      {isLoading ? <ListSkeleton rows={6} /> : null}
      {errorMessage ? (
        <ErrorState title="Unable to load staff" description={errorMessage} />
      ) : null}

      {!isLoading && !errorMessage && filtered.length === 0 ? (
        <EmptyState
          title="No staff yet"
          description="Invite editors, QA, and managers from here. Client portal users are managed under Clients."
        />
      ) : null}

      {!isLoading && !errorMessage && filtered.length > 0 ? (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[640px] text-left text-sm md:min-w-[720px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const roleCodes =
                    item.userRoles?.map((r) => r.role.code) ?? [];
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                        {item.fullName}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {item.email}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {getRoleLabel('internal', roleCodes)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            item.status === 'active' ? 'success' : 'neutral'
                          }
                          className="capitalize"
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--muted)]">
                        {item.lastLoginAt
                          ? new Date(item.lastLoginAt).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(item)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          notifyRefresh();
          load();
        }}
      />

      <Modal
        open={Boolean(editing)}
        title="Edit staff member"
        description={
          editing
            ? `${editing.fullName} · ${editing.email}`
            : 'Update profile and access.'
        }
        onClose={() => setEditing(null)}
        footer={
          <ModalActions
            onCancel={() => setEditing(null)}
            onSubmit={() => void saveEdit()}
            submitLabel="Save profile"
            isSubmitting={editBusy}
            disabled={editSetPassword && editPassword.length < 10}
          />
        }
      >
        <div className="space-y-4">
          <Input
            label="Full name"
            value={editFullName}
            onChange={(event) => setEditFullName(event.target.value)}
          />
          <Select
            label="Role"
            value={editRoleCode}
            onChange={(event) => setEditRoleCode(event.target.value)}
            options={ROLE_OPTIONS}
          />

          <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
            <span className="text-sm text-[var(--muted)]">Account status:</span>
            <Badge
              variant={editStatus === 'active' ? 'success' : 'neutral'}
              className="capitalize"
            >
              {editStatus}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant={editStatus === 'active' ? 'danger' : 'secondary'}
              disabled={editBusy || editing?.id === user?.id}
              onClick={() => void handleToggleActive()}
            >
              {editStatus === 'active' ? 'Deactivate' : 'Reactivate'}
            </Button>
            {editing?.id === user?.id ? (
              <span className="text-xs text-[var(--muted)]">
                You cannot deactivate yourself
              </span>
            ) : null}
          </div>

          <fieldset className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
            <legend className="px-1 text-sm font-medium text-[var(--foreground)]">
              Access for editor
            </legend>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={editBusy || editStatus !== 'active'}
                onClick={() => void handleSendMagicLink()}
              >
                Generate magic link
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={editBusy || editStatus !== 'active'}
                onClick={() => void handleResetPassword()}
              >
                Reset password
              </Button>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Generate a magic link or temporary password, then copy and send it
              to the editor yourself (WhatsApp, email, etc.).
            </p>

            <label className="flex items-start gap-2 text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                className="mt-1"
                checked={editSetPassword}
                onChange={(event) => {
                  setEditSetPassword(event.target.checked);
                  if (!event.target.checked) setEditPassword('');
                }}
              />
              <span>
                Set a custom password on save
                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  Optional — use when you want to choose the password yourself.
                </span>
              </span>
            </label>
            {editSetPassword ? (
              <div className="space-y-2 pl-6">
                <Input
                  label="New password"
                  type="password"
                  value={editPassword}
                  onChange={(event) => setEditPassword(event.target.value)}
                  hint="At least 10 characters with upper, lower, number, and symbol."
                />
                <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={editMustChangePassword}
                    onChange={(event) =>
                      setEditMustChangePassword(event.target.checked)
                    }
                  />
                  Require password change on next login
                </label>
              </div>
            ) : null}
          </fieldset>

          {editError ? (
            <p className="text-sm text-[var(--danger)]">{editError}</p>
          ) : null}
          {editSuccess ? (
            <p className="text-sm text-[var(--success)]">{editSuccess}</p>
          ) : null}

          {editMagicUrl ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <p className="mb-1 text-xs font-medium text-[var(--foreground)]">
                Magic login link — copy and send to editor
              </p>
              <p className="break-all text-xs text-[var(--muted)]">
                {editMagicUrl}
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-2"
                onClick={() => void copyText(editMagicUrl, 'link')}
              >
                {copiedLabel === 'link' ? 'Copied' : 'Copy link to send'}
              </Button>
            </div>
          ) : null}

          {editTempPassword ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <p className="mb-1 text-xs font-medium text-[var(--foreground)]">
                Temporary password — copy and send to editor
              </p>
              <p className="font-mono text-sm text-[var(--foreground)]">
                {editTempPassword}
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-2"
                onClick={() => void copyText(editTempPassword, 'password')}
              >
                {copiedLabel === 'password'
                  ? 'Copied'
                  : 'Copy password to send'}
              </Button>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
