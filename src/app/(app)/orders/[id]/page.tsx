'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import {
  ApiResponse,
  userHasAnyPermission,
  userHasPermission,
  userIsExternal,
} from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ErrorState, RestrictedState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import {
  OrderSummary,
  clientLifecycleStage,
  humanize,
  isHiddenOrderService,
  orderPriorityVariant,
  toExternalHref,
} from '@/lib/orders';
import { parseStatusMetadata } from '@/lib/order-status';
import { OrderAssignmentPanel } from '@/components/orders/OrderAssignmentPanel';
import { StatusBadge } from '@/components/orders/StatusBadge';
import {
  OrderExcelEditor,
  OrderExcelReadOnly,
} from '@/components/orders/OrderExcelEditor';
import { OrderFilesPanel } from '@/components/orders/OrderFilesPanel';
import { OrderChannelChat } from '@/components/orders/OrderChannelChat';
import { FolderStatusField } from '@/components/orders/FolderStatusField';
import {
  ServiceMultiSelect,
  serviceIdsFromLines,
} from '@/components/orders/ServiceMultiSelect';
interface OrderDetail extends OrderSummary {
  comments?: Array<{
    id: string;
    body: string;
    noteType: string;
    visibilityScope: string;
    createdAt: string;
    author: { id: string; fullName: string };
  }>;
}

interface TimelinePayload {
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note?: string | null;
    createdAt: string;
    changedBy: { fullName: string };
  }>;
}

interface ChangeLogEntry {
  id: string;
  action: string;
  createdAt: string;
  actor?: { fullName: string } | null;
  actorUserType?: string | null;
  changes: Array<{ field: string; from: unknown; to: unknown }>;
}

export function OrderDetailView({
  orderId,
  embedded = false,
  onClose,
}: {
  orderId: string;
  embedded?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const canManage = userHasPermission(user, 'orders.manage');
  const canView = userHasPermission(user, 'orders.view');
  const canViewFinance = userHasAnyPermission(user, [
    'finance.invoices.view_all',
    'payments.manage',
  ]);
  const isExternal = userIsExternal(user);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelinePayload | null>(null);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessRestricted, setAccessRestricted] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [conversation, setConversation] = useState<{
    client: { id: string; name: string } | null;
    internal: { id: string; name: string } | null;
  }>({ client: null, internal: null });
  const [conversationPanel, setConversationPanel] = useState<'client' | 'internal'>(
    'client',
  );
  const [busy, setBusy] = useState(false);
  const [clientNotesDraft, setClientNotesDraft] = useState('');
  const [sourceLinkDraft, setSourceLinkDraft] = useState('');
  const [clientNameDraft, setClientNameDraft] = useState('');
  const [folderStatusDraft, setFolderStatusDraft] = useState('');
  const [allocationStatusDrafts, setAllocationStatusDrafts] = useState<
    Record<string, string>
  >({});
  const [clientWorkLines, setClientWorkLines] = useState<
    Array<{
      key: string;
      serviceIds: string[];
      servicesText: string;
      inFileCount: string;
    }>
  >([{ key: 'line-0', serviceIds: [], servicesText: '', inFileCount: '0' }]);
  const [orderLink, setOrderLink] = useState('');
  const [enabledServiceOptions, setEnabledServiceOptions] = useState<
    Array<{
      id: string;
      code: string;
      name: string;
      isActive: boolean;
      effectivePrice?: number | null;
      effectiveEtaHours?: number | null;
    }>
  >([]);

  function load() {
    setIsLoading(true);
    setErrorMessage(null);
    setAccessRestricted(false);

    apiRequest<ApiResponse<OrderDetail>>(`/orders/${orderId}`)
      .then((orderResponse) => {
        setOrder(orderResponse.data);
        setClientNotesDraft(orderResponse.data.clientNotes ?? '');
        setSourceLinkDraft(orderResponse.data.sourceLink ?? '');
        setClientNameDraft(orderResponse.data.name);
        setFolderStatusDraft(orderResponse.data.folderStatus?.id ?? '');
        const allocations = orderResponse.data.workAllocations ?? [];
        const statusDrafts: Record<string, string> = {};
        for (const row of allocations) {
          if (row.id) {
            statusDrafts[row.id] =
              row.folderStatusId ?? row.folderStatus?.id ?? '';
          }
        }
        setAllocationStatusDrafts(statusDrafts);
        if (allocations.length) {
          setClientWorkLines(
            allocations.map((row, index) => ({
              key: row.id || `line-${index}`,
              serviceIds: serviceIdsFromLines(row.serviceLines),
              servicesText:
                row.serviceLines?.map((line) => line.service.code).join(', ') ??
                '',
              inFileCount: String(row.inFileCount ?? 0),
            })),
          );
        } else {
          setClientWorkLines([
            {
              key: 'line-0',
              serviceIds: serviceIdsFromLines(orderResponse.data.serviceLines),
              servicesText: orderResponse.data.services ?? '',
              inFileCount: String(
                orderResponse.data.inFileCount ??
                  orderResponse.data.imageCount ??
                  0,
              ),
            },
          ]);
        }
      })
      .catch((error: Error) => {
        if (
          /permission|forbidden|not found|do not have access|restricted/i.test(
            error.message,
          )
        ) {
          setAccessRestricted(true);
          setOrder(null);
        } else {
          setErrorMessage(error.message);
        }
      })
      .finally(() => setIsLoading(false));

    apiRequest<ApiResponse<TimelinePayload>>(`/orders/${orderId}/timeline`)
      .then((timelineResponse) => setTimeline(timelineResponse.data))
      .catch(() => setTimeline(null));

    if (canManage) {
      apiRequest<ApiResponse<ChangeLogEntry[]>>(`/orders/${orderId}/change-log`)
        .then((logResponse) => setChangeLog(logResponse.data))
        .catch(() => setChangeLog([]));
    } else {
      setChangeLog([]);
    }

    apiRequest<
      ApiResponse<{
        client: { id: string; name: string } | null;
        internal: { id: string; name: string } | null;
      }>
    >(`/orders/${orderId}/conversation`)
      .then((conversationResponse) => {
        setConversation({
          client: conversationResponse.data.client,
          internal: conversationResponse.data.internal,
        });
        if (conversationResponse.data.client) {
          setConversationPanel('client');
        } else if (conversationResponse.data.internal) {
          setConversationPanel('internal');
        }
      })
      .catch(() => setConversation({ client: null, internal: null }));
  }

  useEffect(load, [orderId, refreshKey, canManage]);

  useEffect(() => {
    setOrderLink(`${window.location.origin}/orders/${orderId}`);
  }, [orderId]);

  useEffect(() => {
    if (!isExternal || !order?.clientOrganization?.id) {
      setEnabledServiceOptions([]);
      return;
    }
    let cancelled = false;
    apiRequest<
      ApiResponse<
        Array<{
          serviceId: string;
          code: string;
          name: string;
          enabled: boolean;
          effectivePrice?: number | null;
          effectiveEtaHours?: number | null;
        }>
      >
    >(`/clients/${order.clientOrganization.id}/services`)
      .then((response) => {
        if (cancelled) return;
        setEnabledServiceOptions(
          response.data
            .filter((row) => row.enabled && !isHiddenOrderService(row.code))
            .map((row) => ({
              id: row.serviceId,
              code: row.code,
              name: row.name,
              isActive: true,
              effectivePrice: row.effectivePrice,
              effectiveEtaHours: row.effectiveEtaHours,
            })),
        );
      })
      .catch(() => {
        if (!cancelled) setEnabledServiceOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isExternal, order?.clientOrganization?.id]);

  async function runClientAction(action: 'acknowledge' | 'save-to-history') {
    setBusy(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/orders/${orderId}/${action}`, { method: 'POST' });
      notifyRefresh();
      load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleClientSave() {
    const sourceHref = toExternalHref(sourceLinkDraft);
    if (sourceLinkDraft.trim() && !sourceHref) {
      setErrorMessage('Enter a valid Drive or file link.');
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: clientNameDraft.trim(),
          clientNotes: clientNotesDraft,
          sourceLink: sourceHref,
          folderStatusId: folderStatusDraft || undefined,
        }),
      });
      await apiRequest(`/orders/${orderId}/work-allocations`, {
        method: 'PUT',
        body: JSON.stringify({
          allocations: clientWorkLines.map((line, index) => ({
            serviceIds: line.serviceIds,
            inFileCount: Number(line.inFileCount) || 0,
            sortOrder: index,
          })),
        }),
      });
      notifyRefresh();
      load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleAllocationStatusSave() {
    const entries = Object.entries(allocationStatusDrafts);
    if (!entries.length) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      for (const [allocationId, folderStatusId] of entries) {
        await apiRequest(
          `/orders/${orderId}/work-allocations/${allocationId}/folder-status`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              folderStatusId: folderStatusId || null,
            }),
          },
        );
      }
      notifyRefresh();
      load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddComment() {
    if (!commentBody.trim()) return;
    setBusy(true);
    try {
      await apiRequest(`/orders/${orderId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          body: commentBody.trim(),
          noteType: isExternal ? 'client_instruction' : 'internal_remark',
          visibilityScope: isExternal ? 'shared_with_client' : 'internal',
        }),
      });
      setCommentBody('');
      load();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteOrder() {
    if (
      !window.confirm(
        `Delete order ${order?.code ?? ''}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/orders/${orderId}`, { method: 'DELETE' });
      notifyRefresh();
      if (onClose) onClose();
      else router.push('/orders');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Delete failed',
      );
      setBusy(false);
    }
  }

  if (!canView) {
    return (
      <RestrictedState
        title="Order access restricted"
        description="You need permission to view orders in this workspace."
      />
    );
  }

  if (!isLoading && accessRestricted) {
    return (
      <RestrictedState
        title="Order access restricted"
        description="You do not have permission to view this order, or it could not be found."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={order?.name ?? 'Order'}
        description={order ? `${order.code} · ${order.project?.name ?? ''}` : ''}
        breadcrumbs={
          embedded
            ? undefined
            : [
                { label: 'Workspace', href: '/dashboard' },
                { label: isExternal ? 'My Orders' : 'Orders', href: '/orders' },
                { label: order?.name ?? order?.code ?? 'Detail' },
              ]
        }
        action={
          canManage ? (
            <>
              <Button
                variant="secondary"
                onClick={async () => {
                  setBusy(true);
                  try {
                    await apiRequest(`/orders/${orderId}/generate-invoice`, {
                      method: 'POST',
                    });
                    notifyRefresh();
                    load();
                  } catch (error) {
                    setErrorMessage(
                      error instanceof Error
                        ? error.message
                        : 'Invoice generation failed',
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy || !canViewFinance}
              >
                Generate invoice
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteOrder}
                disabled={busy}
              >
                Delete order
              </Button>
            </>
          ) : undefined
        }
      />

      {isLoading ? <ListSkeleton rows={4} /> : null}
      {!isLoading && errorMessage ? (
        <ErrorState title="Unable to load order" description={errorMessage} />
      ) : null}

      {!isLoading && order ? (
        <>
          <Card padding="sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {order.workflowStatus ? (
                <StatusBadge
                  label={order.workflowStatus.name}
                  metadata={parseStatusMetadata(order.workflowStatus.metadata)}
                />
              ) : (
                <span className="capitalize text-[var(--muted)]">
                  {humanize(order.status)}
                </span>
              )}
              {order.displayFolderStatus || order.folderStatus ? (
                <StatusBadge
                  label={
                    (order.displayFolderStatus ?? order.folderStatus)!.name
                  }
                  metadata={parseStatusMetadata(
                    (order.displayFolderStatus ?? order.folderStatus)!.metadata,
                  )}
                />
              ) : null}
              {order.dueDate ? (
                <span className="text-[var(--muted)]">
                  Due {new Date(order.dueDate).toLocaleDateString()}
                </span>
              ) : null}
              <span className="text-[var(--muted)]">
                In {order.inFileCount ?? order.imageCount} · Out{' '}
                {order.outFileCount ?? 0}
              </span>
              <Badge
                variant={orderPriorityVariant(order.priority)}
                className="capitalize"
              >
                {humanize(order.priority)}
              </Badge>
              {order.estimatedTatHours != null ? (
                <span className="text-[var(--muted)]">
                  ETA {order.estimatedTatHours}h
                </span>
              ) : null}
            </div>
          </Card>

          <Tabs
            items={[
              { id: 'overview', label: 'Overview' },
              { id: 'files', label: 'Files' },
              { id: 'conversation', label: 'Conversation' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'notes', label: 'Notes' },
            ]}
            activeId={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === 'overview' ? (
            <div className="space-y-4">
              {isExternal && order ? (
                <ClientDeliveryActions
                  order={order}
                  busy={busy}
                  onAcknowledge={() => runClientAction('acknowledge')}
                  onSaveHistory={() => runClientAction('save-to-history')}
                />
              ) : null}
              {canManage ? (
                <OrderExcelEditor
                  order={order}
                  canViewFinance={canViewFinance}
                  onUpdated={load}
                  footer={
                    <OrderAssignmentPanel
                      embedded
                      orderId={orderId}
                      workflowStatusCode={order.workflowStatus?.code}
                      assignedArtistNames={(order.workAllocations ?? [])
                        .map((row) => row.assignedArtist?.fullName)
                        .filter((name): name is string => Boolean(name))}
                      assignedTeamLeadUserId={order.assignedTeamLead?.id}
                      assignedQaUserId={order.assignedQa?.id}
                      deliveryLink={order.deliveryLink}
                      onUpdated={load}
                    />
                  }
                />
              ) : isExternal ? (
                <Card className="space-y-3">
                  <h3 className="text-sm font-medium text-[var(--foreground)]">
                    Edit your order
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Changes are logged with your name and timestamp.
                  </p>
                  <Input
                    label="Order name"
                    value={clientNameDraft}
                    onChange={(event) => setClientNameDraft(event.target.value)}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        Work lines
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setClientWorkLines((lines) => [
                            ...lines,
                            {
                              key: `line-${Math.random().toString(36).slice(2, 8)}`,
                              serviceIds: [],
                              servicesText: '',
                              inFileCount: '0',
                            },
                          ])
                        }
                      >
                        Add line
                      </Button>
                    </div>
                    {clientWorkLines.map((line, index) => (
                      <div
                        key={line.key}
                        className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--border)] p-3 md:grid-cols-[1fr_120px_auto]"
                      >
                        <label className="block space-y-1.5">
                          <span className="text-xs text-[var(--muted)]">
                            Services · line {index + 1}
                          </span>
                          <ServiceMultiSelect
                            value={line.serviceIds}
                            options={enabledServiceOptions}
                            onChange={(ids, text) =>
                              setClientWorkLines((lines) =>
                                lines.map((row) =>
                                  row.key === line.key
                                    ? {
                                        ...row,
                                        serviceIds: ids,
                                        servicesText: text,
                                      }
                                    : row,
                                ),
                              )
                            }
                          />
                        </label>
                        <Input
                          label="In Files"
                          type="number"
                          min={0}
                          value={line.inFileCount}
                          onChange={(event) =>
                            setClientWorkLines((lines) =>
                              lines.map((row) =>
                                row.key === line.key
                                  ? { ...row, inFileCount: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                        <div className="flex items-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={clientWorkLines.length <= 1}
                            onClick={() =>
                              setClientWorkLines((lines) =>
                                lines.length <= 1
                                  ? lines
                                  : lines.filter((row) => row.key !== line.key),
                              )
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                    <p className="mb-2 text-xs font-medium text-[var(--foreground)]">
                      Order link
                    </p>
                    {orderLink ? (
                      <a
                        href={orderLink}
                        className="break-all text-sm text-[var(--primary)]"
                      >
                        {orderLink}
                      </a>
                    ) : null}
                  </div>
                  <FolderStatusField
                    value={folderStatusDraft}
                    onChange={setFolderStatusDraft}
                  />
                  <Input
                    label="Drive or file link"
                    value={sourceLinkDraft}
                    onChange={(event) => setSourceLinkDraft(event.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                  {toExternalHref(sourceLinkDraft) ? (
                    <a
                      href={toExternalHref(sourceLinkDraft) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-sm text-[var(--primary)]"
                    >
                      Open file link
                    </a>
                  ) : null}
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      Notes from client
                    </span>
                    <textarea
                      value={clientNotesDraft}
                      onChange={(event) => setClientNotesDraft(event.target.value)}
                      rows={3}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                  </label>
                  <Button size="sm" onClick={handleClientSave} disabled={busy}>
                    Save changes
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  <OrderExcelReadOnly
                    order={order}
                    canViewFinance={canViewFinance}
                    showOrderFolderStatus={false}
                    canEditAllocationStatus
                    canEditAllAllocationRows={
                      order.assignedQa?.id === user.id
                    }
                    currentUserId={user.id}
                    allocationStatusDrafts={allocationStatusDrafts}
                    onAllocationStatusChange={(allocationId, statusId) =>
                      setAllocationStatusDrafts((prev) => ({
                        ...prev,
                        [allocationId]: statusId,
                      }))
                    }
                    onSaveAllocationStatus={() => {
                      void handleAllocationStatusSave();
                    }}
                    statusSaveBusy={busy}
                  />
                </div>
              )}

              {/* Notes/Remark are edited in the production sheet (or client edit form). */}
              {order.specialRequirements ? (
                <Card>
                  <h3 className="text-sm font-medium text-[var(--foreground)]">
                    Special requirements
                  </h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {order.specialRequirements}
                  </p>
                </Card>
              ) : null}

              {(canViewFinance || isExternal) &&
              order.invoices &&
              order.invoices.length > 0 ? (
                <Card>
                  <h3 className="text-sm font-medium text-[var(--foreground)]">
                    Invoices
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {order.invoices.map((invoice) => (
                      <li
                        key={invoice.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          {invoice.invoiceNumber} ·{' '}
                          <span className="capitalize">
                            {humanize(invoice.status)}
                          </span>
                        </span>
                        <span className="text-[var(--muted)]">
                          {invoice.currency} {invoice.totalAmount}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'files' ? (
            <OrderFilesPanel
              orderId={orderId}
              projectId={order.project?.id}
              isolateEditorOutputs={
                !canManage &&
                !isExternal &&
                order.assignedQa?.id !== user.id &&
                order.assignedTeamLead?.id !== user.id
              }
            />
          ) : null}

          {activeTab === 'conversation' ? (
            <div className="space-y-3">
              {conversation.client || conversation.internal ? (
                <>
                  {conversation.client && conversation.internal ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={
                          conversationPanel === 'client' ? 'primary' : 'secondary'
                        }
                        onClick={() => setConversationPanel('client')}
                      >
                        Client chat
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          conversationPanel === 'internal'
                            ? 'primary'
                            : 'secondary'
                        }
                        onClick={() => setConversationPanel('internal')}
                      >
                        Internal chat
                      </Button>
                    </div>
                  ) : null}

                  {conversationPanel === 'client' &&
                  conversation.client &&
                  user ? (
                    <OrderChannelChat
                      channelId={conversation.client.id}
                      user={user}
                      title={
                        isExternal
                          ? 'Messages with studio'
                          : 'Client chat'
                      }
                      description={
                        isExternal
                          ? 'Chat with the studio about this order.'
                          : 'Chat with the client. Editors and QA cannot see this thread.'
                      }
                    />
                  ) : null}

                  {conversationPanel === 'internal' &&
                  conversation.internal &&
                  user ? (
                    <OrderChannelChat
                      channelId={conversation.internal.id}
                      user={user}
                      title="Internal chat"
                      description="Staff-only discussion with managers, editors, and QA."
                    />
                  ) : null}

                  {conversationPanel === 'client' && !conversation.client ? (
                    <Card>
                      <p className="text-sm text-[var(--muted)]">
                        You do not have access to the client chat for this order.
                      </p>
                    </Card>
                  ) : null}

                  {conversationPanel === 'internal' && !conversation.internal ? (
                    <Card>
                      <p className="text-sm text-[var(--muted)]">
                        You do not have access to the internal chat for this order.
                      </p>
                    </Card>
                  ) : null}
                </>
              ) : (
                <Card>
                  <p className="text-sm text-[var(--muted)]">
                    Conversation channels will be created when the order is ready.
                  </p>
                </Card>
              )}
            </div>
          ) : null}

          {activeTab === 'timeline' ? (
            <div className="space-y-4">
              {canManage ? (
                <Card className="space-y-3">
                  <h3 className="text-sm font-medium text-[var(--foreground)]">
                    Field change log
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Who changed which order fields and when (including client edits).
                  </p>
                  {changeLog.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No field changes yet.</p>
                  ) : (
                    changeLog.map((entry) => (
                      <div
                        key={entry.id}
                        className="border-l-2 border-[var(--primary)] pl-3"
                      >
                        <p className="text-sm text-[var(--foreground)]">
                          {entry.action === 'order.created'
                            ? 'Order created'
                            : 'Order updated'}
                          {entry.actorUserType === 'external'
                            ? ' (client)'
                            : ''}
                        </p>
                        {entry.changes?.length ? (
                          <ul className="mt-1 space-y-0.5 text-xs text-[var(--muted)]">
                            {entry.changes.map((change, index) => (
                              <li key={`${entry.id}-${change.field}-${index}`}>
                                <span className="font-medium text-[var(--foreground)]">
                                  {humanize(change.field)}
                                </span>
                                : {String(change.from ?? '—')} →{' '}
                                {String(change.to ?? '—')}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {entry.actor?.fullName ?? 'System'} ·{' '}
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </Card>
              ) : null}

              {timeline ? (
                <Card className="space-y-4">
                  <h3 className="text-sm font-medium text-[var(--foreground)]">
                    Status timeline
                  </h3>
                  {timeline.statusHistory.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No status changes yet.</p>
                  ) : (
                    timeline.statusHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="border-l-2 border-[var(--border)] pl-3"
                      >
                        <p className="text-sm text-[var(--foreground)]">
                          Order {humanize(entry.toStatus)}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {entry.changedBy.fullName} ·{' '}
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </Card>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'notes' ? (
            <div className="space-y-4">
              <Card className="space-y-3">
                <textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  rows={3}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  placeholder="Add a note..."
                />
                <Button size="sm" onClick={handleAddComment} disabled={busy}>
                  Post note
                </Button>
              </Card>
              {order.comments?.map((comment) => (
                <Card key={comment.id}>
                  <div className="mb-2">
                    <Badge variant="neutral" className="capitalize">
                      {comment.noteType.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--foreground)]">{comment.body}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {comment.author.fullName} ·{' '}
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </Card>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ClientDeliveryActions({
  order,
  busy,
  onAcknowledge,
  onSaveHistory,
}: {
  order: OrderSummary;
  busy: boolean;
  onAcknowledge: () => void;
  onSaveHistory: () => void;
}) {
  const stage = clientLifecycleStage(order.workflowStatus?.code);
  const canReceive = stage === 'ready_for_delivery' || stage === 'delivered';
  const deliveryHref = toExternalHref(order.deliveryLink ?? '');

  if (!canReceive && !order.historySavedAt) {
    return null;
  }

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-medium text-[var(--foreground)]">Delivery</h3>
      {deliveryHref ? (
        <a
          href={deliveryHref}
          target="_blank"
          rel="noreferrer"
          className="break-all text-sm text-[var(--primary)]"
        >
          {order.deliveryLink}
        </a>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          The studio has not added a delivery link yet.
        </p>
      )}
      {order.outputFormat ? (
        <p className="text-xs text-[var(--muted)]">Output {order.outputFormat}</p>
      ) : null}
      {order.historySavedAt ? (
        <p className="text-sm text-[var(--muted)]">Saved to your order history.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {order.clientAcknowledgedAt ? (
            <p className="text-sm text-[var(--muted)]">Delivery acknowledged.</p>
          ) : (
            <Button size="sm" onClick={onAcknowledge} disabled={busy || !canReceive}>
              Acknowledge delivery
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={onSaveHistory}
            disabled={busy || !canReceive}
          >
            Save to history
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  return <OrderDetailView orderId={params.id} />;
}
