'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasPermission } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import {
  BatchSummary,
  batchStatusVariant,
  humanize,
} from '@/lib/production';

export default function ProductionPage() {
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const canManage = userHasPermission(user, 'batches.manage');
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    apiRequest<ApiResponse<{ items: BatchSummary[] }>>('/batches?pageSize=50')
      .then((response) => setBatches(response.data.items))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [refreshKey]);

  async function handleCreate() {
    setIsSaving(true);
    setFormError(null);
    try {
      await apiRequest('/batches', {
        method: 'POST',
        body: JSON.stringify({
          name,
          instructions: instructions || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        }),
      });
      setCreateOpen(false);
      setName('');
      setInstructions('');
      setDueDate('');
      notifyRefresh();
      load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Production"
        description="Photo-editing batches moving through the editing, QA, and delivery pipeline."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Production' },
        ]}
        action={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New Batch
            </Button>
          ) : undefined
        }
      />

      {isLoading ? <ListSkeleton rows={5} /> : null}
      {!isLoading && errorMessage ? (
        <ErrorState title="Unable to load batches" description={errorMessage} />
      ) : null}
      {!isLoading && !errorMessage && batches.length === 0 ? (
        <EmptyState
          title="No batches yet"
          description="Create a batch to start assigning editing work."
        />
      ) : null}

      {!isLoading && batches.length > 0 ? (
        <Card padding="none" className="overflow-hidden">
          <ul className="divide-y divide-[var(--border)]">
            {batches.map((batch) => (
              <li key={batch.id}>
                <Link
                  href={`/production/${batch.id}`}
                  className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-muted)] md:grid md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] md:items-center"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {batch.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {batch.code} · {batch._count?.assets ?? 0} assets ·{' '}
                      {batch.clientOrganization?.name ?? 'Internal'}
                      {batch.order
                        ? ` · Order ${batch.order.code}`
                        : ''}
                    </p>
                  </div>
                  <Badge
                    variant={batchStatusVariant(batch.status)}
                    className="w-fit capitalize"
                  >
                    {humanize(batch.status)}
                  </Badge>
                  <span className="text-xs text-[var(--muted)]">
                    Editor: {batch.assignedEditor?.fullName ?? 'Unassigned'}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {batch.dueDate
                      ? `Due ${new Date(batch.dueDate).toLocaleDateString()}`
                      : 'No due date'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Modal
        open={createOpen}
        title="New batch"
        description="Group related images into a production batch."
        onClose={() => setCreateOpen(false)}
        footer={
          <ModalActions
            onCancel={() => setCreateOpen(false)}
            onSubmit={handleCreate}
            submitLabel="Create batch"
            isSubmitting={isSaving}
            disabled={!name.trim()}
          />
        }
      >
        <div className="space-y-3">
          <Input
            label="Batch name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Acme Spring Catalog - Retouch"
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Instructions
            </span>
            <textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
              placeholder="Editing guidance for the team..."
            />
          </label>
          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
          {formError ? (
            <p className="text-xs text-[var(--danger)]">{formError}</p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
