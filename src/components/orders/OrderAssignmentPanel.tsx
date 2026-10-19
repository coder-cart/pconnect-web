'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  ClientLifecycleStage,
  MANAGER_WORKFLOW_OPTIONS,
  clientLifecycleStage,
  toExternalHref,
} from '@/lib/orders';
import { useOrderSheetExtraSave } from '@/components/orders/OrderExcelEditor';

interface UserOption {
  id: string;
  fullName: string;
}

interface OrderAssignmentPanelProps {
  orderId: string;
  workflowStatusCode?: string | null;
  /** Editors assigned on Excel work-allocation rows (read-only). */
  assignedArtistNames?: string[];
  assignedTeamLeadUserId?: string | null;
  assignedQaUserId?: string | null;
  deliveryLink?: string | null;
  onUpdated: () => void;
  /** Render without Card chrome (for nesting in production sheet). */
  embedded?: boolean;
}

export function OrderAssignmentPanel({
  orderId,
  workflowStatusCode,
  assignedArtistNames = [],
  assignedTeamLeadUserId,
  assignedQaUserId,
  deliveryLink: initialDeliveryLink,
  onUpdated,
  embedded = false,
}: OrderAssignmentPanelProps) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [stage, setStage] = useState<ClientLifecycleStage | ''>(
    clientLifecycleStage(workflowStatusCode) ?? '',
  );
  const [teamLeadId, setTeamLeadId] = useState(assignedTeamLeadUserId ?? '');
  const [qaId, setQaId] = useState(assignedQaUserId ?? '');
  const [deliveryLink, setDeliveryLink] = useState(initialDeliveryLink ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiRequest<ApiResponse<UserOption[]>>('/orders/meta/assignable-users').then(
      (response) => setUsers(response.data),
    );
  }, []);

  useEffect(() => {
    setStage(clientLifecycleStage(workflowStatusCode) ?? '');
    setTeamLeadId(assignedTeamLeadUserId ?? '');
    setQaId(assignedQaUserId ?? '');
    setDeliveryLink(initialDeliveryLink ?? '');
  }, [workflowStatusCode, assignedTeamLeadUserId, assignedQaUserId, initialDeliveryLink]);

  const excelEditors = useMemo(() => {
    return Array.from(new Set(assignedArtistNames.filter(Boolean)));
  }, [assignedArtistNames]);

  function validate(sheetDeliveryHref: string | null) {
    const ownHref = toExternalHref(deliveryLink);
    if (!embedded && deliveryLink.trim() && !ownHref) {
      return 'Enter a valid delivery link.';
    }
    const href = embedded ? sheetDeliveryHref : ownHref;
    if (stage === 'delivered' && !href) {
      return 'Add a delivery link before marking the order Delivered.';
    }
    return null;
  }

  async function persist() {
    const ownHref = toExternalHref(deliveryLink);
    setBusy(true);
    setErrorMessage(null);
    try {
      if (stage) {
        await apiRequest(`/orders/${orderId}/lifecycle-stage`, {
          method: 'POST',
          body: JSON.stringify({
            stage,
            ...(!embedded && ownHref ? { deliveryLink: ownHref } : {}),
          }),
        });
      }
      await apiRequest(`/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          assignedTeamLeadUserId: teamLeadId || null,
          assignedQaUserId: qaId || null,
          ...(embedded ? {} : { deliveryLink: ownHref }),
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      setErrorMessage(message);
      throw error;
    } finally {
      setBusy(false);
    }
  }

  useOrderSheetExtraSave({
    validate,
    persist,
  });

  async function handleSave() {
    const message = validate(toExternalHref(deliveryLink));
    if (message) {
      setErrorMessage(message);
      return;
    }
    try {
      await persist();
      onUpdated();
    } catch {
      // persist already stored the message
    }
  }

  const body = (
    <div className={embedded ? 'space-y-3' : 'space-y-3'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-[var(--foreground)]">
            Workflow & leads
          </h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Editors are on sheet rows
            {excelEditors.length
              ? ` · ${excelEditors.join(', ')}`
              : ' · none yet'}
          </p>
        </div>
        {embedded ? null : (
          <Button size="sm" onClick={handleSave} disabled={busy}>
            Save leads
          </Button>
        )}
      </div>
      {embedded ? null : (
      <label className="block text-sm">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
          Delivery link
        </span>
        <input
          type="url"
          value={deliveryLink}
          onChange={(event) => setDeliveryLink(event.target.value)}
          placeholder="https://..."
          className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm"
        />
        <span className="mt-1 block text-xs text-[var(--muted)]">
          Required before Delivered. Saving the link does not change the status.
        </span>
      </label>
      )}
      {errorMessage ? (
        <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Workflow
          </span>
          <select
            value={stage}
            onChange={(event) => setStage(event.target.value as ClientLifecycleStage | '')}
            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm font-medium"
          >
            <option value="">Select status</option>
            {MANAGER_WORKFLOW_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Team lead
          </span>
          <select
            value={teamLeadId}
            onChange={(event) => setTeamLeadId(event.target.value)}
            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm"
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            QA
          </span>
          <select
            value={qaId}
            onChange={(event) => setQaId(event.target.value)}
            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm"
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );

  if (embedded) return body;
  return <Card className="space-y-3">{body}</Card>;
}
