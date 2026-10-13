'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, UserPlus, Workflow } from 'lucide-react';
import { ResourceListPage } from '@/components/ui/ResourceListPage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getInitials } from '@/lib/navigation';
import { userHasPermission } from '@/lib/auth';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { ChatChannel } from '@/lib/chat-types';
import { CreateClientWizard } from '@/components/modals/CreateClientWizard';
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
  const router = useRouter();
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const canManageClients = userHasPermission(user, 'clients.manage');
  const [createOpen, setCreateOpen] = useState(false);
  const [onboardingClientId, setOnboardingClientId] = useState<string | undefined>();
  const [linkClient, setLinkClient] = useState<ClientItem | null>(null);
  const [openingMessagesClientId, setOpeningMessagesClientId] = useState<string | null>(
    null,
  );

  async function openClientMessages(clientId: string) {
    setOpeningMessagesClientId(clientId);

    try {
      const response = await apiRequest<ApiResponse<ChatChannel>>(
        `/clients/${clientId}/messages-channel`,
      );
      router.push(`/chat?channel=${response.data.id}`);
    } finally {
      setOpeningMessagesClientId(null);
    }
  }

  return (
    <>
      <ResourceListPage<ClientItem>
        title="Clients"
        description="Client organizations, onboarding, and communication hubs."
        breadcrumbs={[
          { label: 'Clients', href: '/clients' },
        ]}
        endpoint="/clients"
        permission="clients.view"
        searchPlaceholder="Search clients..."
        filterOptions={STATUS_FILTERS}
        filterField="status"
        createLabel={canManageClients ? 'Create Client' : undefined}
        onCreateClick={
          canManageClients ? () => setCreateOpen(true) : undefined
        }
        refreshKey={refreshKey}
        emptyTitle="No clients yet"
        emptyDescription="Client organizations will appear here once created."
        getSearchValue={(item) =>
          `${item.name} ${item.status} ${item.primaryContactEmail ?? ''}`
        }
        getItemKey={(item) => item.id}
        renderItem={(item) => (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <button
              type="button"
              onClick={() => router.push(`/clients/${item.id}`)}
              className="flex items-center gap-3 rounded-[var(--radius-md)] text-left transition-colors hover:opacity-80"
            >
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
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={statusVariant(item.status)} className="capitalize">
                {item.status.replaceAll('_', ' ')}
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                disabled={openingMessagesClientId === item.id}
                onClick={() => void openClientMessages(item.id)}
              >
                <MessageSquare className="h-4 w-4" />
                Open messages
              </Button>
              {canManageClients ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setOnboardingClientId(item.id)}
                >
                  <Workflow className="h-4 w-4" />
                  Start onboarding
                </Button>
              ) : null}
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

      <CreateClientWizard
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={notifyRefresh}
      />
      <CreateOnboardingModal
        open={Boolean(onboardingClientId)}
        defaultClientId={onboardingClientId}
        onClose={() => setOnboardingClientId(undefined)}
        onCreated={() => {
          const createdForClientId = onboardingClientId;
          notifyRefresh();
          if (createdForClientId) {
            router.push(`/clients/${createdForClientId}`);
          }
        }}
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
