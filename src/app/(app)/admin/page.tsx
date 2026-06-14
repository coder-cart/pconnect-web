'use client';

import { useEffect, useState } from 'react';
import { ResourceListPage } from '@/components/ui/ResourceListPage';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { CreateUserModal } from '@/components/modals/CreateUserModal';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  userType: string;
  status: string;
}

interface AuditLogItem {
  id: string;
  moduleName: string;
  action: string;
  recordType: string;
  createdAt: string;
  actor?: { fullName: string } | null;
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'invited', label: 'Invited' },
];

export default function AdminPage() {
  const { refreshKey, notifyRefresh } = useWorkspace();
  const [activeTab, setActiveTab] = useState('users');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (activeTab !== 'audit') return;

    setIsLoadingAudit(true);
    apiRequest<ApiResponse<AuditLogItem[]>>('/audit-logs')
      .then((response) => setAuditLogs(response.data))
      .finally(() => setIsLoadingAudit(false));
  }, [activeTab, refreshKey]);

  return (
    <div className="space-y-4">
      <Tabs
        activeId={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'users', label: 'Users' },
          { id: 'audit', label: 'Audit Logs' },
        ]}
      />

      {activeTab === 'users' ? (
        <ResourceListPage<UserItem>
          title="Settings"
          description="Workspace users, roles, and permission assignments."
          breadcrumbs={[
            { label: 'Workspace', href: '/dashboard' },
            { label: 'Settings' },
          ]}
          endpoint="/users"
          permission="users.manage"
          searchPlaceholder="Search users..."
          filterOptions={STATUS_FILTERS}
          filterField="status"
          createLabel="Invite User"
          onCreateClick={() => setCreateOpen(true)}
          refreshKey={refreshKey}
          emptyTitle="No users found"
          emptyDescription="Users will appear here once added to the workspace."
          getSearchValue={(item) =>
            `${item.fullName} ${item.email} ${item.userType} ${item.status}`
          }
          getItemKey={(item) => item.id}
          renderItem={(item) => (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {item.fullName}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {item.email} · {item.userType}
                </p>
              </div>
              <Badge variant={item.status === 'active' ? 'success' : 'neutral'}>
                {item.status}
              </Badge>
            </div>
          )}
        />
      ) : null}

      {activeTab === 'audit' ? (
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

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={notifyRefresh}
      />
    </div>
  );
}
