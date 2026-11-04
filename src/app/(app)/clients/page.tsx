'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Briefcase,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  MessageSquare,
  MoreHorizontal,
  Plus,
  UserPlus,
  Users,
  Workflow,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
} from '@/components/ui/DropdownMenu';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatCard } from '@/components/ui/StatCard';
import { ListSkeleton } from '@/components/ui/Skeleton';
import {
  EmptyState,
  ErrorState,
  RestrictedState,
} from '@/components/ui/StatePanels';
import { ClientOrgLogo } from '@/components/ui/ClientOrgLogo';
import {
  ClientStatusDonut,
  TopClientsOrdersBars,
} from '@/components/clients/ClientDashboardCharts';
import { userHasPermission } from '@/lib/auth';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { ChatChannel } from '@/lib/chat-types';
import { CreateClientWizard } from '@/components/modals/CreateClientWizard';
import { CreateOnboardingModal } from '@/components/modals/CreateOnboardingModal';
import { LinkClientUserModal } from '@/components/modals/LinkClientUserModal';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { cn } from '@/lib/cn';

type PortalLoginStatus =
  | 'none_invited'
  | 'invited_never_logged_in'
  | 'has_logged_in';

interface ClientItem {
  id: string;
  name: string;
  clientName?: string | null;
  status: string;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  logoUpdatedAt?: string | null;
  portalLoginStatus?: PortalLoginStatus;
  defaultManager?: { id: string; fullName: string } | null;
  _count?: { orders: number; contacts: number };
}

function statusVariant(status: string) {
  if (status === 'active') return 'success' as const;
  if (status === 'onboarding') return 'warning' as const;
  if (status === 'inactive') return 'danger' as const;
  return 'neutral' as const;
}

function portalLoginLabel(status?: PortalLoginStatus) {
  switch (status) {
    case 'has_logged_in':
      return 'Logged in';
    case 'invited_never_logged_in':
      return 'Never logged in';
    case 'none_invited':
      return 'No portal users';
    default:
      return null;
  }
}

function portalLoginVariant(status?: PortalLoginStatus) {
  if (status === 'has_logged_in') return 'success' as const;
  if (status === 'invited_never_logged_in') return 'warning' as const;
  return 'neutral' as const;
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export default function ClientsPage() {
  const router = useRouter();
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const canManageClients = userHasPermission(user, 'clients.manage');
  const canManageOnboarding = userHasPermission(user, 'onboarding.manage');
  const [createOpen, setCreateOpen] = useState(false);
  const [onboardingClientId, setOnboardingClientId] = useState<
    string | undefined
  >();
  const [linkClient, setLinkClient] = useState<ClientItem | null>(null);
  const [openingMessagesClientId, setOpeningMessagesClientId] = useState<
    string | null
  >(null);
  const [items, setItems] = useState<ClientItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsRestricted(false);

    apiRequest<ApiResponse<ClientItem[]>>('/clients')
      .then((response) => setItems(response.data))
      .catch((error: Error) => {
        if (error.message.toLowerCase().includes('permission')) {
          setIsRestricted(true);
          return;
        }
        setErrorMessage(error.message);
      })
      .finally(() => setIsLoading(false));
  }, [refreshKey]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (activeFilter !== 'all' && item.status !== activeFilter) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        item.name,
        item.clientName,
        item.status,
        item.primaryContactName,
        item.primaryContactEmail,
        item.defaultManager?.fullName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [items, searchQuery, activeFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const item of items) {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const dashboardStats = useMemo(() => {
    const totalOrders = items.reduce(
      (sum, item) => sum + (item._count?.orders ?? 0),
      0,
    );
    return {
      totalClients: items.length,
      activeClients: statusCounts.active ?? 0,
      onboardingClients: statusCounts.onboarding ?? 0,
      totalOrders,
    };
  }, [items, statusCounts]);

  const chartItems = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        orderCount: item._count?.orders ?? 0,
      })),
    [items],
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
      <PageHeader
        title="Clients"
        description="Portfolio overview, organizations, and client channels."
        breadcrumbs={[{ label: 'Clients', href: '/clients' }]}
        action={
          canManageClients ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create client
            </Button>
          ) : undefined
        }
      />

      {isLoading ? <ListSkeleton rows={6} /> : null}

      {!isLoading && isRestricted ? (
        <RestrictedState
          title="Access restricted"
          description="Your role does not allow viewing clients."
        />
      ) : null}

      {!isLoading && errorMessage ? (
        <ErrorState title="Unable to load clients" description={errorMessage} />
      ) : null}

      {!isLoading && !isRestricted && !errorMessage && items.length > 0 ? (
        <div className="mb-5 space-y-3">
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <StatCard
              label="Total clients"
              value={String(dashboardStats.totalClients)}
              icon={Users}
            />
            <StatCard
              label="Active"
              value={String(dashboardStats.activeClients)}
              icon={Briefcase}
            />
            <StatCard
              label="Onboarding"
              value={String(dashboardStats.onboardingClients)}
              icon={Workflow}
            />
            <StatCard
              label="Total orders"
              value={String(dashboardStats.totalOrders)}
              icon={ClipboardList}
            />
          </div>

          <Card padding="none" className="overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCharts((open) => !open)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--surface-muted)]/60"
              aria-expanded={showCharts}
            >
              <span className="inline-flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[var(--primary)]" />
                <span>
                  <span className="block text-sm font-semibold text-[var(--foreground)]">
                    Charts & graphs
                  </span>
                  <span className="block text-xs text-[var(--muted)]">
                    Status mix and orders by client
                  </span>
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
                {showCharts ? 'Hide' : 'Show'}
                {showCharts ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
            </button>
            {showCharts ? (
              <div className="grid gap-4 border-t border-[var(--border)] p-4 xl:grid-cols-2">
                <ClientStatusDonut items={items} />
                <TopClientsOrdersBars items={chartItems} />
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}

      {!isLoading && !isRestricted && !errorMessage ? (
        <div className="mb-4 space-y-3">
          <SearchInput
            placeholder="Search by name, manager, or email…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STATUS_FILTERS.map((filter) => {
              const count = statusCounts[filter.value] ?? 0;
              const selected = activeFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    selected
                      ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
                  )}
                >
                  {filter.label}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                      selected
                        ? 'bg-[var(--surface)] text-[var(--primary)]'
                        : 'bg-[var(--surface-muted)] text-[var(--muted)]',
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!isLoading &&
      !isRestricted &&
      !errorMessage &&
      filteredItems.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? 'No clients yet' : 'No matching clients'}
          description={
            items.length === 0
              ? 'Create a client organization to get started.'
              : 'Try a different search or status filter.'
          }
        />
      ) : null}

      {!isLoading &&
      !isRestricted &&
      !errorMessage &&
      filteredItems.length > 0 ? (
        <ul className="grid gap-2.5 sm:gap-3">
          {filteredItems.map((item) => {
            const contactLine =
              item.primaryContactName ||
              item.primaryContactEmail ||
              'No primary contact';
            const metaParts = [
              item.defaultManager
                ? `Mgr · ${item.defaultManager.fullName}`
                : 'No manager',
              item._count
                ? `${item._count.orders} order${item._count.orders === 1 ? '' : 's'}`
                : null,
            ].filter(Boolean);

            return (
              <li key={item.id}>
                <Card
                  padding="none"
                  className="transition-colors hover:border-[var(--primary)]/30"
                >
                  <div className="flex items-stretch gap-0">
                    <button
                      type="button"
                      onClick={() => router.push(`/clients/${item.id}`)}
                      className="flex min-w-0 flex-1 items-start gap-3 p-3.5 text-left sm:items-center sm:p-4"
                    >
                      <ClientOrgLogo
                        clientId={item.id}
                        name={item.name}
                        logoUpdatedAt={item.logoUpdatedAt}
                        className="mt-0.5 h-11 w-11 sm:mt-0 sm:h-12 sm:w-12"
                      />
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-[var(--foreground)]">
                            {item.name}
                          </span>
                          <Badge
                            variant={statusVariant(item.status)}
                            className="capitalize"
                          >
                            {item.status.replaceAll('_', ' ')}
                          </Badge>
                          {portalLoginLabel(item.portalLoginStatus) ? (
                            <Badge
                              variant={portalLoginVariant(
                                item.portalLoginStatus,
                              )}
                            >
                              {portalLoginLabel(item.portalLoginStatus)}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="block truncate text-xs text-[var(--muted)]">
                          {contactLine}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--muted)]">
                          {metaParts.map((part, index) => (
                            <span key={part} className="inline-flex items-center gap-2">
                              {index > 0 ? (
                                <span aria-hidden className="text-[var(--border)]">
                                  ·
                                </span>
                              ) : null}
                              {part}
                            </span>
                          ))}
                        </span>
                      </span>
                      <ChevronRight className="mt-1 hidden h-4 w-4 shrink-0 text-[var(--muted)] sm:mt-0 sm:block" />
                    </button>

                    <div className="flex shrink-0 items-center gap-1 border-l border-[var(--border)] px-2 sm:gap-1.5 sm:px-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hidden min-h-touch min-w-touch sm:inline-flex sm:min-h-0 sm:min-w-0"
                        disabled={openingMessagesClientId === item.id}
                        aria-label={`Open messages for ${item.name}`}
                        onClick={() => void openClientMessages(item.id)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="hidden lg:inline">Messages</span>
                      </Button>
                      {canManageClients ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hidden min-h-touch min-w-touch md:inline-flex md:min-h-0 md:min-w-0"
                          aria-label={`Link user for ${item.name}`}
                          onClick={() => setLinkClient(item)}
                        >
                          <UserPlus className="h-4 w-4" />
                          <span className="hidden xl:inline">Link</span>
                        </Button>
                      ) : null}

                      <DropdownMenu
                        align="right"
                        trigger={
                          <Button
                            size="sm"
                            variant="ghost"
                            className="min-h-touch min-w-touch sm:min-h-0 sm:min-w-0"
                            aria-label={`More actions for ${item.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem
                          onClick={() => router.push(`/clients/${item.id}`)}
                        >
                          <Users className="h-4 w-4" />
                          Open profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => void openClientMessages(item.id)}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Open messages
                        </DropdownMenuItem>
                        {canManageOnboarding ? (
                          <DropdownMenuItem
                            onClick={() => setOnboardingClientId(item.id)}
                          >
                            <Workflow className="h-4 w-4" />
                            Start onboarding
                          </DropdownMenuItem>
                        ) : null}
                        {canManageClients ? (
                          <DropdownMenuItem onClick={() => setLinkClient(item)}>
                            <UserPlus className="h-4 w-4" />
                            Link user
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}

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
