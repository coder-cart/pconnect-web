'use client';

import { useEffect, useState } from 'react';
import { Upload, Play } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { AssetSummary, assetStatusVariant, humanize } from '@/lib/production';

interface MyWorkAsset extends AssetSummary {
  revisions?: { id: string; round: number; instructions: string }[];
}

export default function MyWorkPage() {
  const { refreshKey, notifyRefresh } = useWorkspace();
  const [assets, setAssets] = useState<MyWorkAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitFor, setSubmitFor] = useState<MyWorkAsset | null>(null);
  const [storageKey, setStorageKey] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    setIsLoading(true);
    apiRequest<ApiResponse<MyWorkAsset[]>>('/assets/my-work')
      .then((response) => setAssets(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [refreshKey]);

  async function handleStart(asset: MyWorkAsset) {
    setBusy(true);
    try {
      await apiRequest(`/assets/${asset.id}/start`, { method: 'POST' });
      load();
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!submitFor) return;
    setBusy(true);
    try {
      await apiRequest(`/assets/${submitFor.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          storageKey: storageKey || undefined,
          notes: notes || undefined,
        }),
      });
      setSubmitFor(null);
      setStorageKey('');
      setNotes('');
      notifyRefresh();
      load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Work"
        description="Assets assigned to you. Edit, then submit deliverables to QA."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'My Work' },
        ]}
      />

      {isLoading ? <ListSkeleton rows={4} /> : null}
      {!isLoading && errorMessage ? (
        <ErrorState title="Unable to load your work" description={errorMessage} />
      ) : null}
      {!isLoading && !errorMessage && assets.length === 0 ? (
        <EmptyState
          title="Nothing assigned"
          description="Assets assigned to you will appear here."
        />
      ) : null}

      {!isLoading && assets.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {assets.map((asset) => {
            const openRevision = asset.revisions?.[0];
            return (
              <Card key={asset.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {asset.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {asset.batch?.name ?? ''}
                    </p>
                  </div>
                  <Badge
                    variant={assetStatusVariant(asset.status)}
                    className="capitalize"
                  >
                    {humanize(asset.status)}
                  </Badge>
                </div>

                {asset.instructions ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {asset.instructions}
                  </p>
                ) : null}

                {openRevision ? (
                  <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--danger)]/40 bg-[var(--danger)]/5 px-3 py-2">
                    <p className="text-xs font-medium text-[var(--danger)]">
                      Revision round {openRevision.round}
                    </p>
                    <p className="text-xs text-[var(--foreground)]">
                      {openRevision.instructions}
                    </p>
                  </div>
                ) : null}

                {asset.dueDate ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Due {new Date(asset.dueDate).toLocaleDateString()}
                  </p>
                ) : null}

                <div className="mt-3 flex gap-2">
                  {asset.status === 'assigned' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStart(asset)}
                      disabled={busy}
                    >
                      <Play className="h-4 w-4" />
                      Start
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    onClick={() => setSubmitFor(asset)}
                    disabled={busy}
                  >
                    <Upload className="h-4 w-4" />
                    Submit to QA
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Modal
        open={Boolean(submitFor)}
        title={`Submit ${submitFor?.name ?? ''}`}
        description="Provide the deliverable reference and notes for QA review."
        onClose={() => setSubmitFor(null)}
        footer={
          <ModalActions
            onCancel={() => setSubmitFor(null)}
            onSubmit={handleSubmit}
            submitLabel="Submit to QA"
            isSubmitting={busy}
          />
        }
      >
        <div className="space-y-3">
          <Input
            label="Deliverable reference (storage key / URL)"
            value={storageKey}
            onChange={(event) => setStorageKey(event.target.value)}
            placeholder="e.g. deliverables/hero-01-final.jpg"
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Notes for QA
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
              placeholder="What changed in this version..."
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
