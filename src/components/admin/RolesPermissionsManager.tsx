'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';

interface PermissionItem {
  id: string;
  code: string;
  name: string;
  module: string;
  action: string;
}

interface RoleItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  rolePermissions: { permission: { code: string } }[];
}

export function RolesPermissionsManager() {
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      apiRequest<ApiResponse<PermissionItem[]>>('/permissions'),
      apiRequest<ApiResponse<RoleItem[]>>('/roles'),
    ])
      .then(([permissionsRes, rolesRes]) => {
        if (cancelled) return;
        setPermissions(permissionsRes.data);
        setRoles(rolesRes.data);
        if (rolesRes.data.length > 0) {
          selectRole(rolesRes.data[0]);
        }
      })
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectRole(role: RoleItem) {
    setSelectedRoleId(role.id);
    setDraft(new Set(role.rolePermissions.map((rp) => rp.permission.code)));
  }

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;

  const grouped = useMemo(() => {
    const byModule = new Map<string, PermissionItem[]>();
    for (const permission of permissions) {
      const list = byModule.get(permission.module) ?? [];
      list.push(permission);
      byModule.set(permission.module, list);
    }
    return Array.from(byModule.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [permissions]);

  function toggle(code: string) {
    setDraft((previous) => {
      const next = new Set(previous);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  const isDirty = useMemo(() => {
    if (!selectedRole) return false;
    const original = new Set(
      selectedRole.rolePermissions.map((rp) => rp.permission.code),
    );
    if (original.size !== draft.size) return true;
    for (const code of draft) {
      if (!original.has(code)) return true;
    }
    return false;
  }, [selectedRole, draft]);

  async function handleSave() {
    if (!selectedRole) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await apiRequest<ApiResponse<RoleItem>>(
        `/roles/${selectedRole.id}/permissions`,
        {
          method: 'PUT',
          body: JSON.stringify({ permissionCodes: Array.from(draft) }),
        },
      );
      setRoles((previous) =>
        previous.map((role) =>
          role.id === response.data.id ? response.data : role,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Card padding="none" className="overflow-hidden">
        <ListSkeleton rows={6} />
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <Card className="h-fit">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Roles
        </p>
        <ul className="space-y-1">
          {roles.map((role) => (
            <li key={role.id}>
              <button
                type="button"
                onClick={() => selectRole(role)}
                className={`w-full rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition-colors ${
                  role.id === selectedRoleId
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'text-[var(--foreground)] hover:bg-[var(--surface-muted)]'
                }`}
              >
                <span className="block font-medium">{role.name}</span>
                <span
                  className={`block text-xs ${
                    role.id === selectedRoleId
                      ? 'text-[var(--primary-foreground)]/80'
                      : 'text-[var(--muted)]'
                  }`}
                >
                  {role.rolePermissions.length} permissions
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        {selectedRole ? (
          <>
            <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {selectedRole.name}
                </p>
                {selectedRole.description ? (
                  <p className="text-xs text-[var(--muted)]">
                    {selectedRole.description}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {isDirty ? <Badge variant="warning">Unsaved</Badge> : null}
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>

            {error ? (
              <p className="mt-3 text-xs text-[var(--danger)]">{error}</p>
            ) : null}

            <div className="mt-4 space-y-5">
              {grouped.map(([module, items]) => (
                <div key={module}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {module}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer items-start gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface-muted)]"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={draft.has(permission.code)}
                          onChange={() => toggle(permission.code)}
                        />
                        <span>
                          <span className="block text-sm text-[var(--foreground)]">
                            {permission.name}
                          </span>
                          <span className="block text-xs text-[var(--muted)]">
                            {permission.code}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--muted)]">Select a role to edit.</p>
        )}
      </Card>
    </div>
  );
}
