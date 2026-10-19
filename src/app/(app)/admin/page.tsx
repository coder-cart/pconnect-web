'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasPermission } from '@/lib/auth';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { RolesPermissionsManager } from '@/components/admin/RolesPermissionsManager';
import { MasterDataManager } from '@/components/admin/MasterDataManager';
import { ServiceMasterManager } from '@/components/admin/ServiceMasterManager';
import { OrderImportPanel } from '@/components/admin/OrderImportPanel';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { RestrictedState } from '@/components/ui/StatePanels';

interface AuditLogItem {
  id: string;
  moduleName: string;
  action: string;
  recordType: string;
  createdAt: string;
  actor?: { fullName: string } | null;
}

export default function AdminPage() {
  const { user, refreshKey } = useWorkspace();
  const canManageUsers = userHasPermission(user, 'users.manage');
  const canManageRoles = userHasPermission(user, 'roles.manage');
  const canManageMasterData = userHasPermission(user, 'master_data.manage');
  const canViewAudit = userHasPermission(user, 'audit.view');
  const [activeTab, setActiveTab] = useState(
    canManageMasterData
      ? 'service-master'
      : canManageRoles
        ? 'roles'
        : canViewAudit
          ? 'audit'
          : 'service-master',
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  useEffect(() => {
    if (activeTab !== 'audit' || !canViewAudit) return;

    setIsLoadingAudit(true);
    apiRequest<ApiResponse<{ items: AuditLogItem[] }>>(
      '/audit-logs?pageSize=50',
    )
      .then((response) => setAuditLogs(response.data.items))
      .finally(() => setIsLoadingAudit(false));
  }, [activeTab, refreshKey, canViewAudit]);

  if (!canManageUsers && !canManageRoles && !canManageMasterData && !canViewAudit) {
    return (
      <RestrictedState
        title="Settings restricted"
        description="You need admin permissions to open workspace settings."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Workspace configuration. Staff accounts live under Staff."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Settings' },
        ]}
      />

      {canManageUsers ? (
        <p className="text-sm text-[var(--muted)]">
          Manage internal people in{' '}
          <Link
            href="/staff"
            className="font-medium text-[var(--primary)] hover:underline"
          >
            Staff
          </Link>
          . Client portal members are managed on each client.
        </p>
      ) : null}

      <Tabs
        activeId={activeTab}
        onChange={setActiveTab}
        items={[
          ...(canManageMasterData
            ? [
                { id: 'service-master', label: 'Service Master' },
                { id: 'master-data', label: 'Master Data' },
                { id: 'import', label: 'Excel Import' },
              ]
            : []),
          ...(canManageRoles
            ? [{ id: 'roles', label: 'Roles & Permissions' }]
            : []),
          ...(canViewAudit ? [{ id: 'audit', label: 'Audit Logs' }] : []),
        ]}
      />

      {activeTab === 'service-master' && canManageMasterData ? (
        <ServiceMasterManager />
      ) : null}

      {activeTab === 'master-data' && canManageMasterData ? (
        <MasterDataManager />
      ) : null}

      {activeTab === 'import' && canManageMasterData ? (
        <OrderImportPanel />
      ) : null}

      {activeTab === 'roles' && canManageRoles ? (
        <RolesPermissionsManager />
      ) : null}

      {activeTab === 'audit' && canViewAudit ? (
        <Card padding="none" className="overflow-hidden">
          {isLoadingAudit ? <ListSkeleton rows={5} /> : null}
          {!isLoadingAudit ? (
            <ul className="divide-y divide-[var(--border)]">
              {auditLogs.map((log) => (
                <li key={log.id} className="px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {log.action}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {log.moduleName} · {log.recordType} ·{' '}
                        {log.actor?.fullName ?? 'System'}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--muted)]">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
