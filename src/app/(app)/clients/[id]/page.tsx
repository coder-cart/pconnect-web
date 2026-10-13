'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Activity,
  CheckCircle2,
  Circle,
  CircleCheck,
  ClipboardList,
  FileText,
  MessageSquare,
  Plus,
  Settings,
  Upload,
  UserPlus,
  Users,
  Workflow,
} from 'lucide-react';
import { apiRequest, apiDownload } from '@/lib/api-client';
import { ApiResponse, userHasPermission } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StatePanels';
import { CreateOnboardingModal } from '@/components/modals/CreateOnboardingModal';
import { LinkClientUserModal } from '@/components/modals/LinkClientUserModal';
import { ClientServiceConfig } from '@/components/clients/ClientServiceConfig';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { OrderCreateModal } from '@/components/orders/OrderCreateForm';
import { OrderChannelChat } from '@/components/orders/OrderChannelChat';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { ChatChannel } from '@/lib/chat-types';
import { OrderSummary } from '@/lib/orders';

interface ClientDetail {
  id: string;
  name: string;
  clientName?: string | null;
  status: string;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  country?: string | null;
  timeZone?: string | null;
  currency?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  defaultPriority?: string | null;
  preferredDeliveryMethod?: string | null;
  preferredUploadMethod?: string | null;
  folderStructure?: string | null;
  fileNamingConvention?: string | null;
  workingDays?: string | null;
  specialNotes?: string | null;
  allowClientTeamInvite?: boolean;
  maxPortalUsers?: number;
  defaultManager?: { id: string; fullName: string; email?: string } | null;
  contacts?: ClientContact[];
}

interface ClientContact {
  id: string;
  name: string;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  isPrimary: boolean;
}

interface ClientOverview {
  activeOrders: number;
  pendingOrders: number;
  ordersInQa: number;
  completedOrders: number;
  totalRevenue: number;
  outstandingAmount: number;
  lastOrderDate: string | null;
  nextDueOrder: {
    id: string;
    code: string;
    name: string;
    dueDate: string | null;
  } | null;
}

interface ClientFile {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  clientFileFolder?: string | null;
  createdAt: string;
  order?: { id: string; code: string; name: string } | null;
}

interface ActivityEvent {
  id: string;
  kind: string;
  action: string;
  recordType: string;
  createdAt: string;
  actor?: { fullName: string } | null;
  metadata?: Record<string, unknown> | null;
}

interface OnboardingItem {
  id: string;
  title: string;
  status: string;
}

interface OnboardingWorkflow {
  id: string;
  name: string;
  status: string;
  clientOrganization?: { id: string; name: string } | null;
  items: OnboardingItem[];
}

interface ClientMember {
  id: string;
  linkedAt: string;
  isOrgAdmin?: boolean;
  user: {
    id: string;
    fullName: string;
    email: string;
    status: string;
  };
}

interface PortalMembersResponse {
  items: ClientMember[];
  seats: {
    used: number;
    max: number;
    allowClientTeamInvite: boolean;
  };
  currentUserIsOrgAdmin: boolean;
}

import { formatMoney as formatClientMoney } from '@/lib/money';

function formatMoney(value: number, currency?: string | null) {
  return formatClientMoney(value, currency);
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const router = useRouter();
  const { user } = useWorkspace();
  const canManage = userHasPermission(user, 'clients.manage');

  const [activeTab, setActiveTab] = useState('overview');
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [overview, setOverview] = useState<ClientOverview | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [fileFolder, setFileFolder] = useState('all');
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [hubChannelId, setHubChannelId] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<OnboardingWorkflow[]>([]);
  const [members, setMembers] = useState<ClientMember[]>([]);
  const [seatInfo, setSeatInfo] = useState({
    used: 0,
    max: 5,
    allowClientTeamInvite: false,
  });
  const [allowTeamInvite, setAllowTeamInvite] = useState(false);
  const [maxPortalUsers, setMaxPortalUsers] = useState('5');
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [createWorkflowOpen, setCreateWorkflowOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    designation: '',
    email: '',
    phone: '',
    whatsapp: '',
    isPrimary: false,
  });
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');

  const loadCore = useCallback(async () => {
    try {
      const [clientResponse, overviewResponse] = await Promise.all([
        apiRequest<ApiResponse<ClientDetail>>(`/clients/${clientId}`),
        apiRequest<ApiResponse<ClientOverview>>(
          `/clients/${clientId}/overview`,
        ),
      ]);
      setClient(clientResponse.data);
      setOverview(overviewResponse.data);
      setContacts(clientResponse.data.contacts ?? []);
      setSettingsForm({
        name: clientResponse.data.name ?? '',
        clientName: clientResponse.data.clientName ?? '',
        phone: clientResponse.data.phone ?? '',
        whatsapp: clientResponse.data.whatsapp ?? '',
        country: clientResponse.data.country ?? '',
        timeZone: clientResponse.data.timeZone ?? '',
        currency: clientResponse.data.currency ?? 'USD',
        paymentTerms: clientResponse.data.paymentTerms ?? '',
        notes: clientResponse.data.notes ?? '',
        defaultPriority: clientResponse.data.defaultPriority ?? 'medium',
        preferredDeliveryMethod:
          clientResponse.data.preferredDeliveryMethod ?? '',
        preferredUploadMethod: clientResponse.data.preferredUploadMethod ?? '',
        folderStructure: clientResponse.data.folderStructure ?? '',
        fileNamingConvention: clientResponse.data.fileNamingConvention ?? '',
        workingDays: clientResponse.data.workingDays ?? '',
        specialNotes: clientResponse.data.specialNotes ?? '',
      });
      setAllowTeamInvite(clientResponse.data.allowClientTeamInvite ?? false);
      setMaxPortalUsers(String(clientResponse.data.maxPortalUsers ?? 5));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (activeTab !== 'orders') return;
    apiRequest<ApiResponse<{ items: OrderSummary[] }>>(
      `/orders?clientOrganizationId=${clientId}&pageSize=100`,
    )
      .then((response) => setOrders(response.data.items ?? []))
      .catch(() => setOrders([]));
  }, [activeTab, clientId]);

  useEffect(() => {
    if (activeTab !== 'contacts') return;
    apiRequest<ApiResponse<ClientContact[]>>(`/clients/${clientId}/contacts`)
      .then((response) => setContacts(response.data))
      .catch(() => undefined);
  }, [activeTab, clientId]);

  useEffect(() => {
    if (activeTab !== 'files') return;
    const query =
      fileFolder === 'all' ? '' : `?folder=${encodeURIComponent(fileFolder)}`;
    apiRequest<ApiResponse<ClientFile[]>>(`/clients/${clientId}/files${query}`)
      .then((response) => setFiles(response.data))
      .catch(() => setFiles([]));
  }, [activeTab, clientId, fileFolder]);

  useEffect(() => {
    if (activeTab !== 'conversation') return;
    apiRequest<ApiResponse<ChatChannel>>(
      `/clients/${clientId}/messages-channel`,
    )
      .then((response) => setHubChannelId(response.data.id))
      .catch(() => setHubChannelId(null));
  }, [activeTab, clientId]);

  useEffect(() => {
    if (activeTab !== 'activity') return;
    apiRequest<ApiResponse<ActivityEvent[]>>(`/clients/${clientId}/activity`)
      .then((response) => setActivity(response.data))
      .catch(() => setActivity([]));
  }, [activeTab, clientId]);

  useEffect(() => {
    if (activeTab !== 'settings') return;
    Promise.all([
      apiRequest<ApiResponse<OnboardingWorkflow[]>>('/onboarding/workflows'),
      apiRequest<ApiResponse<PortalMembersResponse>>(
        `/clients/${clientId}/users`,
      ),
    ])
      .then(([workflowsResponse, membersResponse]) => {
        setWorkflows(
          workflowsResponse.data.filter(
            (workflow) => workflow.clientOrganization?.id === clientId,
          ),
        );
        setMembers(membersResponse.data.items ?? []);
        setSeatInfo(membersResponse.data.seats);
        setAllowTeamInvite(membersResponse.data.seats.allowClientTeamInvite);
        setMaxPortalUsers(String(membersResponse.data.seats.max));
      })
      .catch(() => undefined);
  }, [activeTab, clientId]);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter(
      (order) =>
        order.code.toLowerCase().includes(query) ||
        order.name.toLowerCase().includes(query),
    );
  }, [orders, orderSearch]);

  async function activateClient() {
    setIsActivating(true);
    try {
      await apiRequest(`/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      });
      await loadCore();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to activate',
      );
    } finally {
      setIsActivating(false);
    }
  }

  async function saveSettings() {
    setSettingsBusy(true);
    try {
      await apiRequest(`/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...settingsForm,
          allowClientTeamInvite: allowTeamInvite,
          maxPortalUsers: Number(maxPortalUsers) || 5,
        }),
      });
      await loadCore();
      if (activeTab === 'settings') {
        const membersResponse = await apiRequest<
          ApiResponse<PortalMembersResponse>
        >(`/clients/${clientId}/users`);
        setMembers(membersResponse.data.items ?? []);
        setSeatInfo(membersResponse.data.seats);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save settings',
      );
    } finally {
      setSettingsBusy(false);
    }
  }

  async function toggleOrgAdmin(member: ClientMember, isOrgAdmin: boolean) {
    setMemberBusyId(member.user.id);
    try {
      await apiRequest(`/clients/${clientId}/users/${member.user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isOrgAdmin }),
      });
      const membersResponse = await apiRequest<
        ApiResponse<PortalMembersResponse>
      >(`/clients/${clientId}/users`);
      setMembers(membersResponse.data.items ?? []);
      setSeatInfo(membersResponse.data.seats);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update member',
      );
    } finally {
      setMemberBusyId(null);
    }
  }

  async function removeMember(member: ClientMember) {
    if (
      !window.confirm(
        `Remove ${member.user.fullName} from this client portal?`,
      )
    ) {
      return;
    }
    setMemberBusyId(member.user.id);
    try {
      await apiRequest(`/clients/${clientId}/users/${member.user.id}`, {
        method: 'DELETE',
      });
      const membersResponse = await apiRequest<
        ApiResponse<PortalMembersResponse>
      >(`/clients/${clientId}/users`);
      setMembers(membersResponse.data.items ?? []);
      setSeatInfo(membersResponse.data.seats);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to remove member',
      );
    } finally {
      setMemberBusyId(null);
    }
  }

  async function addContact() {
    if (!contactForm.name.trim()) return;
    await apiRequest(`/clients/${clientId}/contacts`, {
      method: 'POST',
      body: JSON.stringify({
        ...contactForm,
        name: contactForm.name.trim(),
        designation: contactForm.designation.trim() || undefined,
        email: contactForm.email.trim() || undefined,
        phone: contactForm.phone.trim() || undefined,
        whatsapp: contactForm.whatsapp.trim() || undefined,
      }),
    });
    setContactForm({
      name: '',
      designation: '',
      email: '',
      phone: '',
      whatsapp: '',
      isPrimary: false,
    });
    const response = await apiRequest<ApiResponse<ClientContact[]>>(
      `/clients/${clientId}/contacts`,
    );
    setContacts(response.data);
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Loading client"
        description="Fetching the client profile."
      />
    );
  }

  if (!client) {
    return (
      <ErrorState
        title="Client not found"
        description={errorMessage ?? 'This client could not be loaded.'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description={
          client.clientName
            ? `${client.clientName} · 360° client profile`
            : '360° client profile'
        }
        breadcrumbs={[
          { label: 'Clients', href: '/clients' },
          { label: client.name },
        ]}
        action={
          <>
            {canManage && client.status !== 'active' ? (
              <Button onClick={() => void activateClient()} disabled={isActivating}>
                <CircleCheck className="h-4 w-4" />
                Activate client
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setCreateOrderOpen(true)}>
              <Plus className="h-4 w-4" />
              Create order
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={client.status === 'active' ? 'success' : 'warning'}
          className="capitalize"
        >
          {client.status.replaceAll('_', ' ')}
        </Badge>
        {client.defaultManager ? (
          <span className="text-sm text-[var(--muted)]">
            Manager: {client.defaultManager.fullName}
          </span>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}

      <Tabs
        activeId={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'orders', label: 'Orders' },
          { id: 'services', label: 'Service Configuration' },
          { id: 'contacts', label: 'Contacts' },
          { id: 'files', label: 'Files' },
          { id: 'conversation', label: 'Conversation' },
          { id: 'activity', label: 'Activity Timeline' },
          { id: 'settings', label: 'Settings' },
        ]}
      />

      {activeTab === 'overview' && overview ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active orders"
              value={String(overview.activeOrders)}
              icon={ClipboardList}
            />
            <StatCard
              label="Pending orders"
              value={String(overview.pendingOrders)}
              icon={ClipboardList}
            />
            <StatCard
              label="Orders in QA"
              value={String(overview.ordersInQa)}
              icon={CheckCircle2}
            />
            <StatCard
              label="Completed orders"
              value={String(overview.completedOrders)}
              icon={CheckCircle2}
            />
            <StatCard
              label="Total revenue"
              value={formatMoney(overview.totalRevenue, client?.currency)}
              icon={Activity}
            />
            <StatCard
              label="Outstanding"
              value={formatMoney(overview.outstandingAmount, client?.currency)}
              icon={Activity}
            />
            <StatCard
              label="Last order"
              value={formatDate(overview.lastOrderDate)}
              icon={ClipboardList}
            />
            <StatCard
              label="Next due"
              value={
                overview.nextDueOrder
                  ? formatDate(overview.nextDueOrder.dueDate)
                  : '—'
              }
              icon={ClipboardList}
            />
          </div>

          <Card>
            <h3 className="text-sm font-medium text-[var(--foreground)]">
              Quick actions
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setCreateOrderOpen(true)}>
                Create order
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setActiveTab('files')}
              >
                <Upload className="h-4 w-4" />
                Upload files
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setActiveTab('conversation')}
              >
                <MessageSquare className="h-4 w-4" />
                Send message
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="h-4 w-4" />
                Edit client
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === 'orders' ? (
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <Input
              placeholder="Search order number or name..."
              value={orderSearch}
              onChange={(event) => setOrderSearch(event.target.value)}
            />
            <Button size="sm" onClick={() => setCreateOrderOpen(true)}>
              <Plus className="h-4 w-4" />
              Create order
            </Button>
          </div>
          {filteredOrders.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No orders yet"
                description="Create the first order for this client."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <OrdersTable
                orders={filteredOrders}
                selectedIds={[]}
                onToggle={() => undefined}
                canBulk={false}
              />
            </div>
          )}
        </Card>
      ) : null}

      {activeTab === 'services' ? (
        <ClientServiceConfig
          clientId={clientId}
          canManage={canManage}
          currency={client?.currency}
        />
      ) : null}

      {activeTab === 'contacts' ? (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-sm font-medium text-[var(--foreground)]">
              Contacts
            </h3>
            {contacts.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No contacts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
                      <th className="pb-2 pr-3">Name</th>
                      <th className="pb-2 pr-3">Designation</th>
                      <th className="pb-2 pr-3">Email</th>
                      <th className="pb-2 pr-3">Phone</th>
                      <th className="pb-2">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="py-2 pr-3 font-medium">
                          {contact.name}
                          {contact.isPrimary ? (
                            <Badge variant="primary" className="ml-2">
                              Primary
                            </Badge>
                          ) : null}
                        </td>
                        <td className="py-2 pr-3 text-[var(--muted)]">
                          {contact.designation || '—'}
                        </td>
                        <td className="py-2 pr-3">{contact.email || '—'}</td>
                        <td className="py-2 pr-3">{contact.phone || '—'}</td>
                        <td className="py-2">{contact.whatsapp || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {canManage ? (
            <Card>
              <h3 className="mb-3 text-sm font-medium text-[var(--foreground)]">
                Add contact
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  label="Name"
                  value={contactForm.name}
                  onChange={(event) =>
                    setContactForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Designation"
                  value={contactForm.designation}
                  onChange={(event) =>
                    setContactForm((prev) => ({
                      ...prev,
                      designation: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Email"
                  value={contactForm.email}
                  onChange={(event) =>
                    setContactForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Phone"
                  value={contactForm.phone}
                  onChange={(event) =>
                    setContactForm((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                />
                <Input
                  label="WhatsApp"
                  value={contactForm.whatsapp}
                  onChange={(event) =>
                    setContactForm((prev) => ({
                      ...prev,
                      whatsapp: event.target.value,
                    }))
                  }
                />
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={contactForm.isPrimary}
                    onChange={(event) =>
                      setContactForm((prev) => ({
                        ...prev,
                        isPrimary: event.target.checked,
                      }))
                    }
                  />
                  Primary contact
                </label>
              </div>
              <div className="mt-3">
                <Button size="sm" onClick={() => void addContact()}>
                  <Plus className="h-4 w-4" />
                  Add contact
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'files' ? (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                ['all', 'All'],
                ['references', 'References'],
                ['contracts', 'Contracts'],
                ['shared', 'Shared Files'],
                ['deliveries', 'Deliveries'],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  size="sm"
                  variant={fileFolder === value ? 'primary' : 'secondary'}
                  onClick={() => setFileFolder(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => router.push('/files')}
            >
              <FileText className="h-4 w-4" />
              Open files library
            </Button>
          </div>
          {files.length === 0 ? (
            <EmptyState
              title="No files"
              description="Client-linked and order files will appear here."
            />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {file.clientFileFolder ?? 'order file'}
                      {file.order ? ` · ${file.order.code}` : ''} ·{' '}
                      {formatDate(file.createdAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void apiDownload(`/files/${file.id}/download`, file.fileName)
                    }
                  >
                    Download
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {activeTab === 'conversation' ? (
        hubChannelId && user ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--muted)]">
              General client conversation (not order-specific).{' '}
              <Link
                href={`/chat?channel=${hubChannelId}`}
                className="text-[var(--primary)] hover:underline"
              >
                Open in Chat
              </Link>
            </p>
            <OrderChannelChat
              channelId={hubChannelId}
              user={user}
              title="Client conversation"
              description="General discussion with this client — independent of individual orders."
            />
          </div>
        ) : (
          <LoadingState
            title="Loading conversation"
            description="Opening the client hub channel."
          />
        )
      ) : null}

      {activeTab === 'activity' ? (
        <Card>
          {activity.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Audit events and order status changes will show here."
            />
          ) : (
            <ul className="space-y-3">
              {activity.map((event) => (
                <li
                  key={`${event.kind}-${event.id}`}
                  className="border-l-2 border-[var(--primary)] pl-3"
                >
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {event.action}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {event.actor?.fullName ?? 'System'} ·{' '}
                    {new Date(event.createdAt).toLocaleString()} ·{' '}
                    {event.recordType}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {activeTab === 'settings' ? (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-sm font-medium text-[var(--foreground)]">
              Profile & preferences
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {(
                [
                  ['name', 'Company name'],
                  ['clientName', 'Client name'],
                  ['phone', 'Phone'],
                  ['whatsapp', 'WhatsApp'],
                  ['country', 'Country'],
                  ['timeZone', 'Time zone'],
                  ['currency', 'Currency'],
                  ['paymentTerms', 'Payment terms'],
                  ['defaultPriority', 'Default priority'],
                  ['preferredDeliveryMethod', 'Preferred delivery'],
                  ['preferredUploadMethod', 'Preferred upload'],
                  ['workingDays', 'Working days'],
                  ['folderStructure', 'Folder structure'],
                  ['fileNamingConvention', 'File naming'],
                  ['notes', 'Notes'],
                  ['specialNotes', 'Special notes'],
                ] as Array<[string, string]>
              ).map(([key, label]) => (
                <Input
                  key={key}
                  label={label}
                  value={settingsForm[key] ?? ''}
                  disabled={!canManage}
                  onChange={(event) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      [key]: event.target.value,
                    }))
                  }
                />
              ))}
            </div>
            {canManage ? (
              <div className="mt-4">
                <Button onClick={() => void saveSettings()} disabled={settingsBusy}>
                  {settingsBusy ? 'Saving…' : 'Save settings'}
                </Button>
              </div>
            ) : null}
          </Card>

          <Card>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 h-4 w-4 text-[var(--primary)]" />
                <div>
                  <h3 className="text-sm font-medium text-[var(--foreground)]">
                    Portal members
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {seatInfo.used} / {seatInfo.max} seats used. Client
                    self-invite is{' '}
                    {allowTeamInvite ? 'enabled' : 'disabled'}.
                  </p>
                </div>
              </div>
              {canManage ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={seatInfo.used >= seatInfo.max}
                  onClick={() => setLinkOpen(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  Add member
                </Button>
              ) : null}
            </div>

            {canManage ? (
              <div className="mb-4 grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={allowTeamInvite}
                    onChange={(event) =>
                      setAllowTeamInvite(event.target.checked)
                    }
                  />
                  Allow client to invite teammates
                </label>
                <Input
                  label="Max team members"
                  type="number"
                  min={1}
                  max={500}
                  value={maxPortalUsers}
                  onChange={(event) => setMaxPortalUsers(event.target.value)}
                />
                <p className="text-xs text-[var(--muted)] sm:col-span-2">
                  Only portal org admins can invite when this is on. Save
                  settings to apply seat limits.
                </p>
              </div>
            ) : null}

            {members.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No portal users linked.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
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
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral" className="capitalize">
                        {member.user.status}
                      </Badge>
                      {canManage ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={memberBusyId === member.user.id}
                            onClick={() =>
                              void toggleOrgAdmin(
                                member,
                                !member.isOrgAdmin,
                              )
                            }
                          >
                            {member.isOrgAdmin ? 'Demote' : 'Make admin'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={memberBusyId === member.user.id}
                            onClick={() => void removeMember(member)}
                          >
                            Remove
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-[var(--primary)]" />
                <h3 className="text-sm font-medium text-[var(--foreground)]">
                  Onboarding checklists
                </h3>
              </div>
              {canManage ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCreateWorkflowOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  New checklist
                </Button>
              ) : null}
            </div>
            {workflows.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Optional checklist workflows for internal handoff.
              </p>
            ) : (
              <ul className="space-y-3">
                {workflows.map((workflow) => {
                  const done = workflow.items.filter(
                    (item) => item.status === 'completed',
                  ).length;
                  return (
                    <li
                      key={workflow.id}
                      className="rounded-[var(--radius-md)] border border-[var(--border)] p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{workflow.name}</span>
                        <span className="text-xs text-[var(--muted)]">
                          {done}/{workflow.items.length} complete
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {workflow.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center gap-2 text-sm text-[var(--muted)]"
                          >
                            {item.status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                            {item.title}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      <OrderCreateModal
        open={createOrderOpen}
        canManage={canManage}
        isExternal={false}
        defaultClientId={clientId}
        onClose={() => setCreateOrderOpen(false)}
        onCreated={() => {
          setActiveTab('orders');
          apiRequest<ApiResponse<{ items: OrderSummary[] }>>(
            `/orders?clientOrganizationId=${clientId}&pageSize=100`,
          ).then((response) => setOrders(response.data.items ?? []));
          void loadCore();
        }}
      />
      <CreateOnboardingModal
        open={createWorkflowOpen}
        defaultClientId={clientId}
        onClose={() => setCreateWorkflowOpen(false)}
        onCreated={() => setActiveTab('settings')}
      />
      <LinkClientUserModal
        open={linkOpen}
        clientId={clientId}
        clientName={client.name}
        onClose={() => setLinkOpen(false)}
        onLinked={() => {
          setActiveTab('settings');
          void apiRequest<ApiResponse<PortalMembersResponse>>(
            `/clients/${clientId}/users`,
          ).then((membersResponse) => {
            setMembers(membersResponse.data.items ?? []);
            setSeatInfo(membersResponse.data.seats);
          });
        }}
      />
    </div>
  );
}
