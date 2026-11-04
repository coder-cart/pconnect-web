'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleCheck,
  CircleOff,
  ClipboardList,
  FileText,
  ImagePlus,
  MessageSquare,
  Plus,
  Settings,
  Trash2,
  Upload,
  Users,
  Workflow,
} from 'lucide-react';
import { apiRequest, apiDownload, apiUpload } from '@/lib/api-client';
import { ApiResponse, userHasPermission } from '@/lib/auth';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StatePanels';
import { ClientOrgLogo } from '@/components/ui/ClientOrgLogo';
import { ImageCropModal } from '@/components/ui/ImageCropModal';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { CreateOnboardingModal } from '@/components/modals/CreateOnboardingModal';
import { LinkClientUserModal } from '@/components/modals/LinkClientUserModal';
import { ClientServiceConfig } from '@/components/clients/ClientServiceConfig';
import { ClientPortalUsers } from '@/components/clients/ClientPortalUsers';
import {
  ClientFinanceBars,
  ClientOrderMixDonut,
  ClientPipelineBars,
} from '@/components/clients/ClientDashboardCharts';
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
  logoUpdatedAt?: string | null;
  hasLogo?: boolean;
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
  totalRevenue?: number;
  outstandingAmount?: number;
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
  isDefault?: boolean;
  accessLevel?: 'chat_only' | 'chat_and_orders';
  user: {
    id: string;
    fullName: string;
    email: string;
    status: string;
    lastLoginAt?: string | null;
    mustChangePassword?: boolean;
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
  const searchParams = useSearchParams();
  const clientId = params.id;
  const router = useRouter();
  const { user } = useWorkspace();
  const canManage = userHasPermission(user, 'clients.manage');
  const canManageOnboarding = userHasPermission(user, 'onboarding.manage');
  const canManageLogo = canManage || user.userType === 'external';

  const [activeTab, setActiveTab] = useState(() =>
    searchParams.get('tab') === 'portal' ? 'portal' : 'overview',
  );
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [logoCropSrc, setLogoCropSrc] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoMessage, setLogoMessage] = useState<string | null>(null);
  const [overview, setOverview] = useState<ClientOverview | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [fileFolder, setFileFolder] = useState('all');
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [hubChannelId, setHubChannelId] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<OnboardingWorkflow[]>([]);
  const [completingWorkflowId, setCompletingWorkflowId] = useState<string | null>(
    null,
  );
  const [members, setMembers] = useState<ClientMember[]>([]);
  const [seatInfo, setSeatInfo] = useState({
    used: 0,
    max: 5,
    allowClientTeamInvite: false,
  });
  const [allowTeamInvite, setAllowTeamInvite] = useState(false);
  const [maxPortalUsers, setMaxPortalUsers] = useState('5');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [createWorkflowOpen, setCreateWorkflowOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [invitePrefill, setInvitePrefill] = useState<{
    fullName: string;
    email: string;
  } | null>(null);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [showOverviewCharts, setShowOverviewCharts] = useState(false);
  const [sendOnboardingEmail, setSendOnboardingEmail] = useState(true);
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
  const [managers, setManagers] = useState<
    Array<{ id: string; fullName: string; email: string }>
  >([]);
  const [managerUserId, setManagerUserId] = useState('');
  const [managerBusy, setManagerBusy] = useState(false);
  const [managerMessage, setManagerMessage] = useState<string | null>(null);

  const loadCore = useCallback(async () => {
    try {
      const [clientResponse, overviewResponse, membersResponse] =
        await Promise.all([
          apiRequest<ApiResponse<ClientDetail>>(`/clients/${clientId}`),
          apiRequest<ApiResponse<ClientOverview>>(
            `/clients/${clientId}/overview`,
          ),
          apiRequest<ApiResponse<PortalMembersResponse>>(
            `/clients/${clientId}/users`,
          ).catch(() => null),
        ]);
      setClient(clientResponse.data);
      setOverview(overviewResponse.data);
      if (membersResponse) {
        setMembers(membersResponse.data.items ?? []);
        setSeatInfo(membersResponse.data.seats);
      }
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
      setManagerUserId(clientResponse.data.defaultManager?.id ?? '');
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
    if (!canManage) return;
    apiRequest<
      ApiResponse<Array<{ id: string; fullName: string; email: string }>>
    >('/users/assignable?role=internal_manager')
      .then((response) => setManagers(response.data))
      .catch(() => setManagers([]));
  }, [canManage]);

  useEffect(() => {
    if (searchParams.get('invite') === 'sent') {
      setLoginNotice('Portal login details were emailed.');
    }
    const inviteError = searchParams.get('inviteError');
    if (inviteError) {
      setLoginError(inviteError);
    }
  }, [searchParams]);

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

  const activationInviteEmail =
    client?.primaryContactEmail?.trim() ||
    contacts.find((contact) => contact.email?.trim())?.email?.trim() ||
    '';

  function openActivateModal() {
    setSendOnboardingEmail(Boolean(activationInviteEmail));
    setActivateOpen(true);
  }

  async function activateClient() {
    setIsActivating(true);
    setErrorMessage(null);
    setLoginNotice(null);
    setLoginError(null);
    try {
      const response = await apiRequest<
        ApiResponse<
          ClientDetail & {
            portalInvite?: {
              sent: boolean;
              skipped?: boolean;
              error?: string;
              email?: string;
            } | null;
          }
        >
      >(`/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'active',
          sendPortalInvite: sendOnboardingEmail,
        }),
      });
      setClient(response.data);
      setActivateOpen(false);
      const invite = response.data.portalInvite;
      if (sendOnboardingEmail) {
        if (invite?.sent) {
          setLoginNotice(
            `Client activated. Onboarding login emailed to ${invite.email ?? 'the primary contact'} (username + temporary password).`,
          );
        } else {
          setLoginError(
            invite?.error ||
              'Client activated, but the onboarding login email was not sent.',
          );
        }
      } else {
        setLoginNotice('Client activated.');
      }
      await loadCore();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to activate',
      );
    } finally {
      setIsActivating(false);
    }
  }

  async function disableClient() {
    const confirmed = window.confirm(
      `Disable ${client?.name ?? 'this client'}? The client team will lose portal access until you activate the organization again.`,
    );
    if (!confirmed) return;

    setIsDisabling(true);
    setErrorMessage(null);
    setLoginNotice(null);
    setLoginError(null);
    try {
      const response = await apiRequest<ApiResponse<ClientDetail>>(
        `/clients/${clientId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'inactive' }),
        },
      );
      setClient(response.data);
      setLoginNotice(
        'Client disabled. Portal logins for this organization are blocked.',
      );
      await loadCore();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to disable client',
      );
    } finally {
      setIsDisabling(false);
    }
  }

  function handleLogoPick(file: File | undefined) {
    if (!file) return;
    setLogoMessage(null);
    setErrorMessage(null);
    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('Choose an image under 8 MB to crop.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Use a JPEG, PNG, WebP, or GIF image.');
      return;
    }
    if (logoCropSrc) URL.revokeObjectURL(logoCropSrc);
    setLogoCropSrc(URL.createObjectURL(file));
  }

  function closeLogoCrop() {
    if (logoCropSrc) URL.revokeObjectURL(logoCropSrc);
    setLogoCropSrc(null);
  }

  async function handleLogoSave(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      throw new Error(
        'Cropped logo must be 2 MB or smaller. Zoom out or try another image.',
      );
    }
    const formData = new FormData();
    formData.append('file', file);
    setLogoBusy(true);
    setErrorMessage(null);
    setLogoMessage(null);
    try {
      const response = await apiUpload<ApiResponse<ClientDetail>>(
        `/clients/${clientId}/logo`,
        formData,
      );
      setClient(response.data);
      setLogoMessage('Company logo updated.');
      closeLogoCrop();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to upload logo';
      setErrorMessage(message);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleLogoRemove() {
    setLogoBusy(true);
    setErrorMessage(null);
    setLogoMessage(null);
    try {
      const response = await apiRequest<ApiResponse<ClientDetail>>(
        `/clients/${clientId}/logo`,
        { method: 'DELETE' },
      );
      setClient(response.data);
      setLogoMessage('Company logo removed.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to remove logo',
      );
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleMarkWorkflowComplete(workflowId: string) {
    setCompletingWorkflowId(workflowId);
    setErrorMessage(null);
    try {
      const response = await apiRequest<ApiResponse<OnboardingWorkflow>>(
        `/onboarding/workflows/${workflowId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed' }),
        },
      );
      setWorkflows((previous) =>
        previous.map((workflow) =>
          workflow.id === workflowId
            ? { ...workflow, status: response.data.status ?? 'completed' }
            : workflow,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to mark onboarding complete',
      );
    } finally {
      setCompletingWorkflowId(null);
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

  async function saveManager() {
    if (!canManage) return;
    setManagerBusy(true);
    setManagerMessage(null);
    setErrorMessage(null);
    try {
      const response = await apiRequest<ApiResponse<ClientDetail>>(
        `/clients/${clientId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            defaultManagerUserId: managerUserId || null,
          }),
        },
      );
      setClient(response.data);
      setManagerUserId(response.data.defaultManager?.id ?? '');
      setManagerMessage(
        response.data.defaultManager
          ? `${response.data.defaultManager.fullName} is assigned and added to this client's channels.`
          : 'Manager cleared for this client.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update manager',
      );
    } finally {
      setManagerBusy(false);
    }
  }

  const inviteContacts = useMemo(() => {
    const rows: Array<{
      id: string;
      name: string;
      email: string;
      isPrimary: boolean;
    }> = [];
    const seen = new Set<string>();
    const primaryEmail = client?.primaryContactEmail?.trim();
    if (primaryEmail) {
      seen.add(primaryEmail.toLowerCase());
      rows.push({
        id: 'primary-contact',
        name: client?.primaryContactName?.trim() || client?.name || 'Primary contact',
        email: primaryEmail,
        isPrimary: true,
      });
    }
    for (const contact of contacts) {
      const email = contact.email?.trim();
      if (!email || seen.has(email.toLowerCase())) continue;
      seen.add(email.toLowerCase());
      rows.push({
        id: contact.id,
        name: contact.name,
        email,
        isPrimary: contact.isPrimary,
      });
    }
    return rows;
  }, [client, contacts]);

  function openPortalInvite(prefill?: { fullName: string; email: string }) {
    const primary =
      inviteContacts.find((contact) => contact.isPrimary) ?? inviteContacts[0];
    setInvitePrefill(
      prefill ??
        (primary
          ? { fullName: primary.name, email: primary.email }
          : null),
    );
    setLinkOpen(true);
  }

  async function refreshPortalMembers() {
    const membersResponse = await apiRequest<
      ApiResponse<PortalMembersResponse>
    >(`/clients/${clientId}/users`);
    setMembers(membersResponse.data.items ?? []);
    setSeatInfo(membersResponse.data.seats);
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

  const hasLogo = Boolean(client.logoUpdatedAt || client.hasLogo);
  const managerDirty = managerUserId !== (client.defaultManager?.id ?? '');

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: 'Clients', href: '/clients' },
          { label: client.name },
        ]}
      />

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="flex min-w-0 flex-1 gap-4">
            <div className="relative shrink-0">
              <ClientOrgLogo
                clientId={client.id}
                name={client.name}
                logoUpdatedAt={client.logoUpdatedAt}
                className="h-16 w-16 sm:h-20 sm:w-20"
              />
              {canManageLogo ? (
                <label
                  className={cn(
                    'absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] bg-black/55 text-white opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100',
                    logoBusy && 'pointer-events-none opacity-70',
                  )}
                  title={hasLogo ? 'Replace logo' : 'Upload logo'}
                >
                  <ImagePlus className="h-4 w-4" />
                  <span className="text-[10px] font-medium">
                    {logoBusy ? '…' : hasLogo ? 'Replace' : 'Upload'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={logoBusy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      handleLogoPick(file);
                    }}
                  />
                </label>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-base font-semibold tracking-tight text-[var(--foreground)] sm:text-lg">
                    {client.name}
                  </h1>
                  <Badge
                    variant={
                      client.status === 'active'
                        ? 'success'
                        : client.status === 'inactive'
                          ? 'danger'
                          : 'warning'
                    }
                    className="capitalize"
                  >
                    {client.status.replaceAll('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--muted)]">
                  {client.clientName
                    ? `${client.clientName} · Client profile`
                    : 'Client profile'}
                </p>
              </div>

              {canManageLogo ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]">
                    <Upload className="h-3.5 w-3.5" />
                    {logoBusy
                      ? 'Working…'
                      : hasLogo
                        ? 'Replace logo'
                        : 'Upload logo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={logoBusy}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        handleLogoPick(file);
                      }}
                    />
                  </label>
                  {hasLogo ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={logoBusy}
                      onClick={() => void handleLogoRemove()}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  ) : null}
                  <span className="text-xs text-[var(--muted)]">
                    JPEG, PNG, WebP, GIF · crop on upload · 2 MB max
                  </span>
                </div>
              ) : null}

              {logoMessage ? (
                <p className="text-xs text-[var(--success)]">{logoMessage}</p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
            {canManage && client.status === 'active' ? (
              <Button
                variant="secondary"
                onClick={() => void disableClient()}
                disabled={isDisabling}
              >
                <CircleOff className="h-4 w-4" />
                Disable client
              </Button>
            ) : null}
            {canManage && client.status !== 'active' ? (
              <Button
                onClick={openActivateModal}
                disabled={isActivating}
              >
                <CircleCheck className="h-4 w-4" />
                Activate client
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setCreateOrderOpen(true)}>
              <Plus className="h-4 w-4" />
              Create order
            </Button>
          </div>
        </div>

        {canManage ? (
          <div className="border-t border-[var(--border)] bg-[var(--surface-muted)]/50 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 sm:max-w-md">
                <Select
                  label="Account manager"
                  value={managerUserId}
                  disabled={managerBusy}
                  onChange={(event) => {
                    setManagerUserId(event.target.value);
                    setManagerMessage(null);
                  }}
                  options={[
                    { value: '', label: 'No manager assigned' },
                    ...managers.map((manager) => ({
                      value: manager.id,
                      label: `${manager.fullName} · ${manager.email}`,
                    })),
                  ]}
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => void saveManager()}
                disabled={managerBusy || !managerDirty}
              >
                {managerBusy ? 'Saving…' : 'Save manager'}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              Manager is added to all current client channels and any new ones
              created later.
            </p>
            {managerMessage ? (
              <p className="mt-1.5 text-xs text-[var(--success)]">
                {managerMessage}
              </p>
            ) : null}
          </div>
        ) : client.defaultManager ? (
          <div className="border-t border-[var(--border)] px-4 py-2.5 text-sm text-[var(--muted)] sm:px-5">
            Manager:{' '}
            <span className="font-medium text-[var(--foreground)]">
              {client.defaultManager.fullName}
            </span>
          </div>
        ) : null}
      </Card>

      <ImageCropModal
        open={Boolean(logoCropSrc)}
        imageSrc={logoCropSrc}
        title="Adjust company logo"
        description="Choose a shape that matches your logo (square or wide), then crop and save."
        mode="logo"
        isSaving={logoBusy}
        onClose={closeLogoCrop}
        onSave={handleLogoSave}
      />

      <Modal
        open={activateOpen}
        onClose={isActivating ? () => undefined : () => setActivateOpen(false)}
        title="Activate client"
        description="Mark this organization as active once setup details are complete."
        footer={
          <ModalActions
            onCancel={() => setActivateOpen(false)}
            onSubmit={() => void activateClient()}
            submitLabel={
              sendOnboardingEmail ? 'Activate & send login' : 'Activate only'
            }
            isSubmitting={isActivating}
            disabled={
              sendOnboardingEmail && !activationInviteEmail
            }
          />
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Activation unlocks the live client workspace. You can optionally
            email portal login details now.
          </p>
          <label className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]/60 p-3 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={sendOnboardingEmail}
              disabled={isActivating}
              onChange={(event) =>
                setSendOnboardingEmail(event.target.checked)
              }
            />
            <span>
              Send onboarding email with username + temporary password
              <span className="mt-0.5 block text-xs text-[var(--muted)]">
                {activationInviteEmail
                  ? `Username will be ${activationInviteEmail}. A temporary password is generated and emailed with the sign-in link.`
                  : 'Add a primary contact email on this client first, then send the onboarding login.'}
              </span>
            </span>
          </label>
          {sendOnboardingEmail && !activationInviteEmail ? (
            <p className="text-sm text-[var(--danger)]">
              Primary contact email is required to send the onboarding email.
            </p>
          ) : null}
        </div>
      </Modal>

      {errorMessage ? (
        <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}
      {loginNotice ? (
        <p className="text-sm text-[var(--foreground)]">{loginNotice}</p>
      ) : null}
      {loginError ? (
        <p className="text-sm text-[var(--danger)]">{loginError}</p>
      ) : null}

      <Tabs
        activeId={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'orders', label: 'Orders' },
          { id: 'services', label: 'Service Configuration' },
          { id: 'contacts', label: 'Contacts' },
          { id: 'portal', label: 'Portal users' },
          { id: 'files', label: 'Files' },
          { id: 'conversation', label: 'Conversation' },
          { id: 'activity', label: 'Activity Timeline' },
          { id: 'settings', label: 'Settings' },
        ]}
      />

      {activeTab === 'overview' && overview ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <StatCard
              label="Open orders"
              value={String(overview.activeOrders)}
              icon={ClipboardList}
            />
            <StatCard
              label="Completed"
              value={String(overview.completedOrders)}
              icon={CheckCircle2}
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

          <Card padding="none" className="overflow-hidden">
            <button
              type="button"
              onClick={() => setShowOverviewCharts((open) => !open)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--surface-muted)]/60"
              aria-expanded={showOverviewCharts}
            >
              <span className="inline-flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[var(--primary)]" />
                <span>
                  <span className="block text-sm font-semibold text-[var(--foreground)]">
                    Charts & graphs
                  </span>
                  <span className="block text-xs text-[var(--muted)]">
                    Order mix, pipeline, and finance snapshot
                  </span>
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
                {showOverviewCharts ? 'Hide' : 'Show'}
                {showOverviewCharts ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
            </button>
            {showOverviewCharts ? (
              <div
                className={cn(
                  'grid gap-4 border-t border-[var(--border)] p-4',
                  overview.totalRevenue != null &&
                    overview.outstandingAmount != null
                    ? 'xl:grid-cols-3'
                    : 'xl:grid-cols-2',
                )}
              >
                <ClientOrderMixDonut
                  activeOrders={overview.activeOrders}
                  completedOrders={overview.completedOrders}
                />
                <ClientPipelineBars
                  pendingOrders={overview.pendingOrders}
                  ordersInQa={overview.ordersInQa}
                  activeOrders={overview.activeOrders}
                />
                {overview.totalRevenue != null &&
                overview.outstandingAmount != null ? (
                  <ClientFinanceBars
                    totalRevenue={overview.totalRevenue}
                    outstandingAmount={overview.outstandingAmount}
                    currencyLabel={(value) =>
                      formatMoney(value, client?.currency)
                    }
                  />
                ) : null}
              </div>
            ) : null}
          </Card>

          {overview.nextDueOrder ? (
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-[var(--foreground)]">
                    Next due order
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                    {overview.nextDueOrder.code} · {overview.nextDueOrder.name}
                    {' · '}
                    {formatDate(overview.nextDueOrder.dueDate)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    router.push(`/orders/${overview.nextDueOrder!.id}`)
                  }
                >
                  Open order
                </Button>
              </div>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[var(--foreground)]">
                    Portal login
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {members.length === 0
                      ? 'This client cannot sign in yet. Send login details from their saved contact.'
                      : `${members.length} portal login${members.length === 1 ? '' : 's'}. Manage resend, disable, and delete on Portal users.`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setActiveTab('portal')}
                >
                  <Users className="h-4 w-4" />
                  Portal users
                </Button>
              </div>
            </Card>

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
        </div>
      ) : null}

      {activeTab === 'orders' ? (
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-[var(--border)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="min-w-0 flex-1">
              <Input
                placeholder="Search order number or name..."
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
              />
            </div>
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
              <>
              <ul className="divide-y divide-[var(--border)] md:hidden">
                {contacts.map((contact) => (
                  <li key={contact.id} className="py-2.5">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {contact.name}
                      {contact.isPrimary ? (
                        <Badge variant="primary" className="ml-2">
                          Primary
                        </Badge>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {contact.designation || 'No designation'}
                      {' · '}
                      {contact.email || 'No email'}
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {contact.phone || 'No phone'}
                      {contact.whatsapp ? ` · WhatsApp ${contact.whatsapp}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
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
              </>
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

      {activeTab === 'portal' ? (
        <ClientPortalUsers
          clientId={clientId}
          clientName={client.name}
          clientStatus={client.status}
          primaryContactName={client.primaryContactName}
          primaryContactEmail={client.primaryContactEmail}
          contacts={contacts}
          members={members}
          seats={seatInfo}
          canManage={canManage}
          onChanged={refreshPortalMembers}
          onNotice={setLoginNotice}
          onError={(message) => {
            setLoginNotice(null);
            setLoginError(message);
          }}
          onInvite={openPortalInvite}
        />
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
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setActiveTab('portal')}
              >
                <Users className="h-4 w-4" />
                Manage portal users
              </Button>
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
                  settings to apply seat limits. Resend, disable, and delete
                  live on the Portal users tab.
                </p>
              </div>
            ) : null}
          </Card>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-[var(--primary)]" />
                <h3 className="text-sm font-medium text-[var(--foreground)]">
                  Onboarding checklists
                </h3>
              </div>
              {canManageOnboarding ? (
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
                  const isCompleted = workflow.status === 'completed';
                  const isCancelled = workflow.status === 'cancelled';
                  return (
                    <li
                      key={workflow.id}
                      className="rounded-[var(--radius-md)] border border-[var(--border)] p-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="block text-sm font-medium">
                            {workflow.name}
                          </span>
                          <span className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                            <span>
                              {done}/{workflow.items.length} items complete
                            </span>
                            {isCompleted ? (
                              <Badge variant="success">Completed</Badge>
                            ) : null}
                            {isCancelled ? (
                              <Badge variant="neutral">Cancelled</Badge>
                            ) : null}
                          </span>
                        </div>
                        {canManageOnboarding &&
                        workflow.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={completingWorkflowId === workflow.id}
                            onClick={() =>
                              void handleMarkWorkflowComplete(workflow.id)
                            }
                          >
                            {completingWorkflowId === workflow.id
                              ? 'Saving…'
                              : 'Mark complete'}
                          </Button>
                        ) : null}
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
        onCreated={() => {
          setActiveTab('settings');
          apiRequest<ApiResponse<OnboardingWorkflow[]>>('/onboarding/workflows')
            .then((response) =>
              setWorkflows(
                response.data.filter(
                  (workflow) => workflow.clientOrganization?.id === clientId,
                ),
              ),
            )
            .catch(() => undefined);
        }}
      />
      <LinkClientUserModal
        open={linkOpen}
        clientId={clientId}
        clientName={client.name}
        contacts={inviteContacts}
        initialFullName={invitePrefill?.fullName ?? ''}
        initialEmail={invitePrefill?.email ?? ''}
        onClose={() => setLinkOpen(false)}
        onLinked={() => {
          setActiveTab('portal');
          setLoginError(null);
          setLoginNotice('Portal login details were emailed.');
          void refreshPortalMembers();
        }}
      />
    </div>
  );
}
