'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface ApprovalRequest {
  id: string;
  status: string;
  createdAt: string;
  delivery?: {
    message: string | null;
    batch: { id: string; name: string; code: string };
    items: { id: string; asset: { id: string; name: string } }[];
  } | null;
}

export default function ApprovalsPage() {
  const { refreshKey, notifyRefresh } = useWorkspace();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [respondTo, setRespondTo] = useState<{
    approval: ApprovalRequest;
    decision: 'approved' | 'rejected';
  } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    setIsLoading(true);
    apiRequest<ApiResponse<ApprovalRequest[]>>('/approvals/pending')
      .then((response) => setApprovals(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [refreshKey]);

  async function submit() {
    if (!respondTo) return;
    setBusy(true);
    try {
      await apiRequest(`/approvals/${respondTo.approval.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({
          decision: respondTo.decision,
          decisionNote: note || undefined,
        }),
      });
      setRespondTo(null);
      setNote('');
      notifyRefresh();
      load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Approvals"
        description="Review delivered work and approve it or request changes."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Approvals' },
        ]}
      />

      {isLoading ? <ListSkeleton rows={3} /> : null}
      {!isLoading && errorMessage ? (
        <ErrorState title="Unable to load approvals" description={errorMessage} />
      ) : null}
      {!isLoading && !errorMessage && approvals.length === 0 ? (
        <EmptyState
          title="Nothing to approve"
          description="Deliveries awaiting your approval will appear here."
        />
      ) : null}

      {!isLoading && approvals.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {approvals.map((approval) => (
            <Card key={approval.id}>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {approval.delivery?.batch.name ?? 'Delivery'}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {approval.delivery?.items.length ?? 0} deliverables ·{' '}
                {new Date(approval.createdAt).toLocaleDateString()}
              </p>
              {approval.delivery?.message ? (
                <p className="mt-2 text-xs text-[var(--foreground)]">
                  {approval.delivery.message}
                </p>
              ) : null}

              <ul className="mt-2 space-y-1">
                {approval.delivery?.items.map((item) => (
                  <li key={item.id} className="text-xs text-[var(--muted)]">
                    {item.asset.name}
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    setRespondTo({ approval, decision: 'approved' })
                  }
                >
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    setRespondTo({ approval, decision: 'rejected' })
                  }
                >
                  <X className="h-4 w-4" />
                  Request changes
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <Modal
        open={Boolean(respondTo)}
        title={
          respondTo?.decision === 'approved'
            ? 'Approve delivery'
            : 'Request changes'
        }
        onClose={() => setRespondTo(null)}
        footer={
          <ModalActions
            onCancel={() => setRespondTo(null)}
            onSubmit={submit}
            submitLabel={
              respondTo?.decision === 'approved' ? 'Approve' : 'Send back'
            }
            isSubmitting={busy}
          />
        }
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Note (optional)
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
            placeholder="Add a comment for the team..."
          />
        </label>
      </Modal>
    </div>
  );
}
