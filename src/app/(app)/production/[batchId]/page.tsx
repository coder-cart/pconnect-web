'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Send, Package } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasPermission } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { CardGridSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import {
  AssetSummary,
  BatchSummary,
  assetStatusVariant,
  batchStatusVariant,
  humanize,
} from '@/lib/production';

interface AssignableUser {
  id: string;
  fullName: string;
}

interface DeliveryItem {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  items: { id: string; asset: { id: string; name: string } }[];
  approvalRequests: { id: string; status: string }[];
}

interface BatchDetail extends BatchSummary {
  assets: AssetSummary[];
}

export default function BatchDetailPage() {
  const params = useParams<{ batchId: string }>();
  const batchId = params.batchId;
  const { user } = useWorkspace();
  const canAssign = userHasPermission(user, 'batches.assign');
  const canManageAssets = userHasPermission(user, 'assets.manage');
  const canDeliver = userHasPermission(user, 'delivery.manage');

  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [editors, setEditors] = useState<AssignableUser[]>([]);
  const [qas, setQas] = useState<AssignableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [editorId, setEditorId] = useState('');
  const [qaId, setQaId] = useState('');
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      apiRequest<ApiResponse<BatchDetail>>(`/batches/${batchId}`),
      apiRequest<ApiResponse<DeliveryItem[]>>(`/batches/${batchId}/deliveries`),
    ])
      .then(([batchRes, deliveriesRes]) => {
        setBatch(batchRes.data);
        setDeliveries(deliveriesRes.data);
        setEditorId(batchRes.data.assignedEditor?.id ?? '');
        setQaId(batchRes.data.assignedQa?.id ?? '');
      })
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }, [batchId]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!canAssign) return;
    apiRequest<ApiResponse<AssignableUser[]>>('/users/assignable?role=editor')
      .then((response) => setEditors(response.data))
      .catch(() => undefined);
    apiRequest<ApiResponse<AssignableUser[]>>('/users/assignable?role=qa')
      .then((response) => setQas(response.data))
      .catch(() => undefined);
  }, [canAssign]);

  async function handleAssign() {
    setBusy(true);
    try {
      await apiRequest(`/batches/${batchId}/assign`, {
        method: 'PUT',
        body: JSON.stringify({
          assignedEditorUserId: editorId || undefined,
          assignedQaUserId: qaId || undefined,
        }),
      });
      load();
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateAsset() {
    setBusy(true);
    try {
      await apiRequest(`/batches/${batchId}/assets`, {
        method: 'POST',
        body: JSON.stringify({ name: assetName }),
      });
      setAssetName('');
      setAssetModalOpen(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateDelivery() {
    setBusy(true);
    try {
      await apiRequest(`/batches/${batchId}/deliveries`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to create delivery',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSendDelivery(deliveryId: string) {
    setBusy(true);
    try {
      await apiRequest(`/deliveries/${deliveryId}/send`, { method: 'POST' });
      load();
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <CardGridSkeleton count={3} />;
  if (errorMessage && !batch)
    return <ErrorState title="Unable to load batch" description={errorMessage} />;
  if (!batch) return null;

  const approvedCount = batch.assets.filter(
    (asset) => asset.status === 'approved',
  ).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={batch.name}
        description={batch.instructions ?? 'No instructions provided.'}
        breadcrumbs={[
          { label: 'Production', href: '/production' },
          { label: batch.code },
        ]}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={batchStatusVariant(batch.status)} className="capitalize">
            {humanize(batch.status)}
          </Badge>
          <Badge variant="neutral" className="capitalize">
            Stage: {humanize(batch.stage)}
          </Badge>
          {batch.dueDate ? (
            <span className="text-xs text-[var(--muted)]">
              Due {new Date(batch.dueDate).toLocaleDateString()}
            </span>
          ) : null}
        </div>

        {canAssign ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Select
              label="Editor"
              value={editorId}
              onChange={(event) => setEditorId(event.target.value)}
              options={[
                { value: '', label: 'Unassigned' },
                ...editors.map((editor) => ({
                  value: editor.id,
                  label: editor.fullName,
                })),
              ]}
            />
            <Select
              label="QA reviewer"
              value={qaId}
              onChange={(event) => setQaId(event.target.value)}
              options={[
                { value: '', label: 'Unassigned' },
                ...qas.map((qa) => ({ value: qa.id, label: qa.fullName })),
              ]}
            />
            <Button onClick={handleAssign} disabled={busy}>
              Save assignment
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-xs text-[var(--muted)]">
            Editor: {batch.assignedEditor?.fullName ?? 'Unassigned'} · QA:{' '}
            {batch.assignedQa?.fullName ?? 'Unassigned'}
          </p>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Assets ({batch.assets.length})
          </h2>
          {canManageAssets ? (
            <Button size="sm" onClick={() => setAssetModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Add asset
            </Button>
          ) : null}
        </div>

        <ul className="mt-3 divide-y divide-[var(--border)]">
          {batch.assets.map((asset) => (
            <li
              key={asset.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-[var(--muted)]" />
                <div>
                  <p className="text-sm text-[var(--foreground)]">{asset.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {asset.assignedEditor?.fullName ?? 'Unassigned'}
                    {asset.currentVersion
                      ? ` · v${asset.currentVersion.versionNumber}`
                      : ''}
                  </p>
                </div>
              </div>
              <Badge
                variant={assetStatusVariant(asset.status)}
                className="capitalize"
              >
                {humanize(asset.status)}
              </Badge>
            </li>
          ))}
          {batch.assets.length === 0 ? (
            <li className="py-3 text-sm text-[var(--muted)]">No assets yet.</li>
          ) : null}
        </ul>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Deliveries
          </h2>
          {canDeliver ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCreateDelivery}
              disabled={busy || approvedCount === 0}
            >
              <Plus className="h-4 w-4" />
              Bundle {approvedCount} approved
            </Button>
          ) : null}
        </div>

        <ul className="mt-3 divide-y divide-[var(--border)]">
          {deliveries.map((delivery) => (
            <li
              key={delivery.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div>
                <p className="text-sm text-[var(--foreground)] capitalize">
                  {delivery.items.length} assets · {humanize(delivery.status)}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {new Date(delivery.createdAt).toLocaleString()}
                </p>
              </div>
              {canDeliver && delivery.status === 'draft' ? (
                <Button
                  size="sm"
                  onClick={() => handleSendDelivery(delivery.id)}
                  disabled={busy}
                >
                  <Send className="h-4 w-4" />
                  Send to client
                </Button>
              ) : (
                <Badge variant="neutral" className="capitalize">
                  {humanize(delivery.status)}
                </Badge>
              )}
            </li>
          ))}
          {deliveries.length === 0 ? (
            <li className="py-3 text-sm text-[var(--muted)]">
              No deliveries yet. Bundle approved assets to deliver to the client.
            </li>
          ) : null}
        </ul>
      </Card>

      <Modal
        open={assetModalOpen}
        title="Add asset"
        onClose={() => setAssetModalOpen(false)}
        footer={
          <ModalActions
            onCancel={() => setAssetModalOpen(false)}
            onSubmit={handleCreateAsset}
            submitLabel="Add asset"
            isSubmitting={busy}
            disabled={!assetName.trim()}
          />
        }
      >
        <Input
          label="Asset name"
          value={assetName}
          onChange={(event) => setAssetName(event.target.value)}
          placeholder="e.g. hero-04.jpg"
        />
      </Modal>
    </div>
  );
}
