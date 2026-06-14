'use client';

import { useState } from 'react';
import { UserPlus, Workflow } from 'lucide-react';
import { ResourceListPage } from '@/components/ui/ResourceListPage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getInitials } from '@/lib/navigation';
import { userHasPermission } from '@/lib/auth';
import { CreateClientModal } from '@/components/modals/CreateClientModal';
import { CreateOnboardingModal } from '@/components/modals/CreateOnboardingModal';
import { LinkClientUserModal } from '@/components/modals/LinkClientUserModal';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface ClientItem {
  id: string;
  name: string;
  status: string;
  primaryContactEmail?: string | null;
}

function statusVariant(status: string) {
  if (status === 'active') return 'primary' as const;
  if (status === 'onboarding') return 'warning' as const;
  return 'neutral' as const;
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'inactive', label: 'Inactive' },
];

export default function ClientsPage() {
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const canManageClients = userHasPermission(user, 'clients.manage');
  const [createOpen, setCreateOpen] = useState(false);
  const [onboardingClientId, setOnboardingClientId] = useState<string | undefined>();
  const [linkClient, setLinkClient] = useState<ClientItem | null>(null);

  return (
    <>
      <ResourceListPage<ClientItem>
        title="Client Onboarding"
        description="Manage onboarding progress for all active clients."
        breadcrumbs={[
          { label: 'Clients', href: '/clients' },
          { label: 'Onboarding' },
        ]}
        endpoint="/clients"
        permission="clients.view"
        searchPlaceholder="Search clients..."
        filterOptions={STATUS_FILTERS}
        filterField="status"
        createLabel="Invite New Client"
        onCreateClick={() => setCreateOpen(true)}
        refreshKey={refreshKey}
        emptyTitle="No clients yet"
        emptyDescription="Client organizations will appear here once created."
        getSearchValue={(item) =>
          `${item.name} ${item.status} ${item.primaryContactEmail ?? ''}`
        }
        getItemKey={(item) => item.id}
        renderItem={(item) => (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary-soft)] text-sm font-semibold text-[var(--primary)]">
                {getInitials(item.name)}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {item.name}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {item.primaryContactEmail ?? 'No contact email'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={statusVariant(item.status)} className="capitalize">
                {item.status.replaceAll('_', ' ')}
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setOnboardingClientId(item.id)}
              >
                <Workflow className="h-4 w-4" />
                Start onboarding
              </Button>
              {canManageClients ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setLinkClient(item)}
                >
                  <UserPlus className="h-4 w-4" />
                  Link user
                </Button>
              ) : null}
            </div>
          </div>
        )}
      />

      <CreateClientModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={notifyRefresh}
      />
      <CreateOnboardingModal
        open={Boolean(onboardingClientId)}
        defaultClientId={onboardingClientId}
        onClose={() => setOnboardingClientId(undefined)}
        onCreated={notifyRefresh}
      />
      <LinkClientUserModal
        open={Boolean(linkClient)}
        clientId={linkClient?.id ?? null}
        clientName={linkClient?.name ?? null}
        onClose={() => setLinkClient(null)}
        onLinked={notifyRefresh}
      />
    </>
  );
}
