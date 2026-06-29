'use client';

import { useEffect, useState } from 'react';
import { Check, X, RefreshCw, ImageIcon } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { AssetSummary, AssetVersion, humanize } from '@/lib/production';

interface QaAsset extends AssetSummary {
  versions?: AssetVersion[];
}

type Decision = 'approved' | 'rejected' | 'revision_requested';

// Render a deliverable preview; treats a URL-like key as an image, otherwise
// shows a labelled placeholder (no real binary in demo data).
function VersionPreview({
  label,
  version,
}: {
  label: string;
  version: AssetVersion | null | undefined;
}) {
  const src = version?.thumbnailKey ?? version?.storageKey ?? null;
  const isUrl = src?.startsWith('http');

  return (
    <div className="flex-1">
      <p className="mb-1 text-xs font-medium text-[var(--muted)]">{label}</p>
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]">
        {isUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src!} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 p-3 text-center">
            <ImageIcon className="h-6 w-6 text-[var(--muted)]" />
            <span className="text-xs text-[var(--muted)]">
              {src ?? 'No preview'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QaPage() {
  const { refreshKey, notifyRefresh } = useWorkspace();
  const [assets, setAssets] = useState<QaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<QaAsset | null>(null);
  const [decision, setDecision] = useState<Decision>('approved');
  const [notes, setNotes] = useState('');
  const [revisionInstructions, setRevisionInstructions] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    setIsLoading(true);
    apiRequest<ApiResponse<QaAsset[]>>('/qa/queue')
      .then((response) => setAssets(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [refreshKey]);

  async function openReview(assetId: string) {
    const detail = await apiRequest<ApiResponse<QaAsset>>(`/assets/${assetId}`);
    setSelected(detail.data);
    setDecision('approved');
    setNotes('');
    setRevisionInstructions('');
  }

  async function submitReview() {
    if (!selected) return;
    setBusy(true);
    try {
      await apiRequest(`/qa/assets/${selected.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          notes: notes || undefined,
          revisionInstructions:
            decision === 'revision_requested'
              ? revisionInstructions
              : undefined,
        }),
      });
      setSelected(null);
      notifyRefresh();
      load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Review failed');
    } finally {
      setBusy(false);
    }
  }

  const versions = selected?.versions ?? [];
  const latest = versions[0] ?? null;
  const previous = versions[1] ?? null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="QA Review"
        description="Review submitted deliverables and approve, reject, or request revisions."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'QA Review' },
        ]}
      />

      {isLoading ? <ListSkeleton rows={4} /> : null}
      {!isLoading && errorMessage ? (
        <ErrorState title="Unable to load queue" description={errorMessage} />
      ) : null}
      {!isLoading && !errorMessage && assets.length === 0 ? (
        <EmptyState
          title="Queue is clear"
          description="No assets are awaiting review."
        />
      ) : null}

      {!isLoading && assets.length > 0 ? (
        <Card padding="none" className="overflow-hidden">
          <ul className="divide-y divide-[var(--border)]">
            {assets.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  onClick={() => openReview(asset.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {asset.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {asset.batch?.name ?? ''} ·{' '}
                      {asset.assignedEditor?.fullName ?? 'Unassigned'}
                    </p>
                  </div>
                  <Badge variant="warning" className="capitalize">
                    {humanize(asset.status)}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Modal
        open={Boolean(selected)}
        title={`Review ${selected?.name ?? ''}`}
        description="Compare the latest deliverable against the prior version."
        size="lg"
        onClose={() => setSelected(null)}
        footer={
          <ModalActions
            onCancel={() => setSelected(null)}
            onSubmit={submitReview}
            submitLabel="Submit review"
            isSubmitting={busy}
            disabled={
              decision === 'revision_requested' && !revisionInstructions.trim()
            }
          />
        }
      >
        <div className="space-y-4">
          <div className="flex gap-3">
            <VersionPreview label="Previous" version={previous} />
            <VersionPreview label="Latest" version={latest} />
          </div>

          {latest?.notes ? (
            <p className="text-xs text-[var(--muted)]">
              Editor notes: {latest.notes}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={decision === 'approved' ? 'primary' : 'secondary'}
              onClick={() => setDecision('approved')}
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant={decision === 'revision_requested' ? 'primary' : 'secondary'}
              onClick={() => setDecision('revision_requested')}
            >
              <RefreshCw className="h-4 w-4" />
              Request revision
            </Button>
            <Button
              size="sm"
              variant={decision === 'rejected' ? 'danger' : 'secondary'}
              onClick={() => setDecision('rejected')}
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Review notes
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
            />
          </label>

          {decision === 'revision_requested' ? (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--foreground)]">
                Revision instructions (required)
              </span>
              <textarea
                value={revisionInstructions}
                onChange={(event) =>
                  setRevisionInstructions(event.target.value)
                }
                rows={2}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
                placeholder="What needs to change before this can be approved..."
              />
            </label>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
