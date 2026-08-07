'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasPermission, userIsExternal } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import {
  OrderBatchSummary,
  OrderSummary,
  humanize,
  orderPriorityVariant,
} from '@/lib/orders';
import { MasterDataStatus, parseStatusMetadata } from '@/lib/order-status';
import { batchStatusVariant } from '@/lib/production';
import { OrderAssignmentPanel } from '@/components/orders/OrderAssignmentPanel';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { WorkflowPipeline } from '@/components/orders/WorkflowPipeline';
import {
  OrderExcelEditor,
  OrderExcelReadOnly,
} from '@/components/orders/OrderExcelEditor';
import { OrderFilesPanel } from '@/components/orders/OrderFilesPanel';
import { OrderChannelChat } from '@/components/orders/OrderChannelChat';
import {
  ServiceMultiSelect,
  serviceIdsFromLines,
} from '@/components/orders/ServiceMultiSelect';

interface OrderDetail extends OrderSummary {
  batches?: OrderBatchSummary[];
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
  stageHistory: Array<{
    id: string;
    toStage: string;
    createdAt: string;
    note?: string | null;
    batch?: { code: string; name: string };
    changedBy: { fullName: string };
  }>;
  deliveries: Array<{
    id: string;
    status: string;
    sentAt?: string | null;
    createdAt: string;
    batch?: { code: string; name: string };
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

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const canManage = userHasPermission(user, 'orders.manage');
  const canViewFinance =
    userHasPermission(user, 'orders.manage') ||
    userHasPermission(user, 'finance.invoices.view_all');
  const isExternal = userIsExternal(user);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelinePayload | null>(null);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [batchSubFolder, setBatchSubFolder] = useState('');
  const [batchUploadUrl, setBatchUploadUrl] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [conversationChannelId, setConversationChannelId] = useState<string | null>(null);
  const [workflowStatuses, setWorkflowStatuses] = useState<MasterDataStatus[]>([]);
  const [busy, setBusy] = useState(false);
  const [clientNotesDraft, setClientNotesDraft] = useState('');
  const [clientNameDraft, setClientNameDraft] = useState('');
  const [clientServiceIds, setClientServiceIds] = useState<string[]>([]);
  const [clientServicesText, setClientServicesText] = useState('');

  function load() {
    setIsLoading(true);
    setErrorMessage(null);

    apiRequest<ApiResponse<OrderDetail>>(`/orders/${orderId}`)
      .then((orderResponse) => {
        setOrder(orderResponse.data);
        setClientNotesDraft(orderResponse.data.clientNotes ?? '');
        setClientNameDraft(orderResponse.data.name);
        setClientServiceIds(serviceIdsFromLines(orderResponse.data.serviceLines));
        setClientServicesText(orderResponse.data.services ?? '');
      })
      .catch((error: Error) => setErrorMessage(error.message))
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

    apiRequest<ApiResponse<{ id: string }>>(`/orders/${orderId}/conversation`)
      .then((conversationResponse) =>
        setConversationChannelId(conversationResponse.data.id || null),
      )
      .catch(() => setConversationChannelId(null));

    apiRequest<ApiResponse<MasterDataStatus[]>>('/orders/meta/workflow-statuses')
      .then((statusResponse) =>
        setWorkflowStatuses(
          statusResponse.data.map((status) => ({
            ...status,
            metadata: parseStatusMetadata(status.metadata),
          })),
        ),
      )
      .catch(() => setWorkflowStatuses([]));
  }

  useEffect(load, [orderId, refreshKey, canManage]);

  async function handleCreateBatch() {
    if (!batchName.trim()) return;
    setBusy(true);
    try {
      await apiRequest(`/orders/${orderId}/batches`, {
        method: 'POST',
        body: JSON.stringify({
          name: batchName.trim(),
          subFolderName: batchSubFolder.trim() || undefined,
          clientUploadUrl: batchUploadUrl.trim() || undefined,
        }),
      });
      setBatchOpen(false);
      setBatchName('');
      setBatchSubFolder('');
      setBatchUploadUrl('');
      notifyRefresh();
      load();
    } finally {
      setBusy(false);
    }
  }

  async function handleClientSave() {
    setBusy(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: clientNameDraft.trim(),
          clientNotes: clientNotesDraft,
          serviceIds: clientServiceIds,
          services: clientServicesText || undefined,
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

  return (
    <div className="space-y-4">
      <PageHeader
        title={order?.name ?? 'Order'}
        description={order ? `${order.code} · ${order.project?.name ?? ''}` : ''}
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Orders', href: '/orders' },
          { label: order?.code ?? 'Detail' },
        ]}
        action={
          canManage ? (
            <div className="flex gap-2">
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
              <Button onClick={() => setBatchOpen(true)}>
                <Plus className="h-4 w-4" />
                Add batch
              </Button>
            </div>
          ) : undefined
        }
      />

      {isLoading ? <ListSkeleton rows={4} /> : null}
      {!isLoading && errorMessage ? (
        <ErrorState title="Unable to load order" description={errorMessage} />
      ) : null}

      {!isLoading && order ? (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              {order.workflowStatus ? (
                <StatusBadge
                  label={order.workflowStatus.name}
                  metadata={parseStatusMetadata(order.workflowStatus.metadata)}
                />
              ) : (
                <span className="text-sm capitalize text-[var(--muted)]">
                  {humanize(order.status)}
                </span>
              )}
              {order.dueDate ? (
                <span className="text-sm text-[var(--muted)]">
                  Due {new Date(order.dueDate).toLocaleDateString()}
                </span>
              ) : null}
              <span className="text-sm text-[var(--muted)]">
                In {order.inFileCount ?? order.imageCount} · Out{' '}
                {order.outFileCount ?? 0} · {order._count?.batches ?? 0} batches
              </span>
              <Badge
                variant={orderPriorityVariant(order.priority)}
                className="capitalize"
              >
                {humanize(order.priority)}
              </Badge>
              {(order.revisionCount ?? 0) > 0 ? (
                <span className="text-sm text-[var(--muted)]">
                  Revisions: {order.revisionCount}
                </span>
              ) : null}
              {order.estimatedTatHours != null ? (
                <span className="text-sm text-[var(--muted)]">
                  ETA {order.estimatedTatHours}h
                </span>
              ) : null}
              {(order.timeSpentMinutes ?? 0) > 0 ? (
                <span className="text-sm text-[var(--muted)]">
                  Time {Math.round((order.timeSpentMinutes ?? 0) / 60)}h{' '}
                  {(order.timeSpentMinutes ?? 0) % 60}m
                </span>
              ) : null}
              {order.folderStatus ? (
                <StatusBadge
                  label={order.folderStatus.name}
                  metadata={parseStatusMetadata(order.folderStatus.metadata)}
                />
              ) : null}
            </div>

            {workflowStatuses.length > 0 ? (
              <div className="mt-4">
                <WorkflowPipeline
                  statuses={workflowStatuses}
                  currentCode={order.workflowStatus?.code}
                />
              </div>
            ) : null}
          </Card>

          <Tabs
            items={[
              { id: 'overview', label: 'Overview' },
              { id: 'batches', label: 'Batches' },
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
              {canManage ? (
                <OrderExcelEditor
                  order={order}
                  canViewFinance={canViewFinance}
                  onUpdated={load}
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
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      Services
                    </span>
                    <ServiceMultiSelect
                      value={clientServiceIds}
                      onChange={(ids, text) => {
                        setClientServiceIds(ids);
                        setClientServicesText(text);
                      }}
                    />
                  </label>
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
                <OrderExcelReadOnly
                  order={order}
                  canViewFinance={canViewFinance}
                />
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <h3 className="text-sm font-medium text-[var(--foreground)]">
                    Notes from client
                  </h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {order.clientNotes || 'None'}
                  </p>
                </Card>
                <Card>
                  <h3 className="text-sm font-medium text-[var(--foreground)]">
                    Remark (internal)
                  </h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {isExternal ? '—' : order.internalNotes || 'None'}
                  </p>
                </Card>
                {order.specialRequirements ? (
                  <Card className="md:col-span-2">
                    <h3 className="text-sm font-medium text-[var(--foreground)]">
                      Special requirements
                    </h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {order.specialRequirements}
                    </p>
                  </Card>
                ) : null}
              </div>

              {canManage ? (
                <OrderAssignmentPanel
                  orderId={orderId}
                  workflowStatusId={order.workflowStatus?.id}
                  workflowStatusCode={order.workflowStatus?.code}
                  assignedArtistUserId={order.assignedArtist?.id}
                  assignedTeamLeadUserId={order.assignedTeamLead?.id}
                  assignedQaUserId={order.assignedQa?.id}
                  onUpdated={load}
                />
              ) : null}

              {order.invoices && order.invoices.length > 0 ? (
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
            />
          ) : null}

          {activeTab === 'conversation' ? (
            conversationChannelId && user ? (
              <OrderChannelChat channelId={conversationChannelId} user={user} />
            ) : (
              <Card>
                <p className="text-sm text-[var(--muted)]">
                  Conversation channel will be created when the order is saved.
                </p>
              </Card>
            )
          ) : null}

          {activeTab === 'batches' ? (
            <div className="space-y-3">
              {order.batches?.length ? (
                order.batches.map((batch) => (
                  <Card key={batch.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Link
                          href={`/production/${batch.id}`}
                          className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                        >
                          {batch.code} · {batch.name}
                        </Link>
                        <p className="text-xs text-[var(--muted)]">
                          {batch.subFolderName || batch.name} · In{' '}
                          {batch.inFileCount ?? 0} · Out {batch.outFileCount ?? 0}
                          {batch.folderStatus
                            ? ` · ${batch.folderStatus.name}`
                            : ''}
                        </p>
                      </div>
                      <Badge
                        variant={batchStatusVariant(batch.status)}
                        className="capitalize"
                      >
                        {humanize(batch.status)}
                      </Badge>
                    </div>
                  </Card>
                ))
              ) : (
                <EmptyState
                  title="No batches"
                  description="Create a batch under this order to start production."
                />
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
                    Status & delivery timeline
                  </h3>
                  {timeline.statusHistory.map((entry) => (
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
                  ))}
                  {timeline.stageHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="border-l-2 border-[var(--border)] pl-3"
                    >
                      <p className="text-sm text-[var(--foreground)]">
                        Batch {entry.batch?.code} → {humanize(entry.toStage)}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {entry.changedBy.fullName} ·{' '}
                        {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
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

      <Modal
        open={batchOpen}
        title="Create batch under order"
        description="Batch inherits client, project, and due date from this order."
        onClose={() => setBatchOpen(false)}
        footer={
          <ModalActions
            onCancel={() => setBatchOpen(false)}
            onSubmit={handleCreateBatch}
            submitLabel="Create batch"
            isSubmitting={busy}
          />
        }
      >
        <Input
          label="Batch name"
          value={batchName}
          onChange={(event) => setBatchName(event.target.value)}
          placeholder="e.g. Hero shots batch 1"
        />
        <Input
          label="Sub-folder name"
          value={batchSubFolder}
          onChange={(event) => setBatchSubFolder(event.target.value)}
          placeholder="Optional folder label"
        />
        <Input
          label="Client upload URL"
          value={batchUploadUrl}
          onChange={(event) => setBatchUploadUrl(event.target.value)}
          placeholder="OneDrive / Google Drive folder link"
        />
      </Modal>
    </div>
  );
}
