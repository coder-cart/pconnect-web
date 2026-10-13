'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  MasterDataStatus,
  allowedWorkflowStatuses,
  parseStatusMetadata,
  statusFillStyle,
} from '@/lib/order-status';

interface UserOption {
  id: string;
  fullName: string;
}

interface OrderAssignmentPanelProps {
  orderId: string;
  workflowStatusId?: string | null;
  workflowStatusCode?: string | null;
  /** Editors assigned on Excel work-allocation rows (read-only). */
  assignedArtistNames?: string[];
  assignedTeamLeadUserId?: string | null;
  assignedQaUserId?: string | null;
  onUpdated: () => void;
  /** Render without Card chrome (for nesting in production sheet). */
  embedded?: boolean;
}

export function OrderAssignmentPanel({
  orderId,
  workflowStatusId,
  workflowStatusCode,
  assignedArtistNames = [],
  assignedTeamLeadUserId,
  assignedQaUserId,
  onUpdated,
  embedded = false,
}: OrderAssignmentPanelProps) {
  const [statuses, setStatuses] = useState<MasterDataStatus[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [statusId, setStatusId] = useState(workflowStatusId ?? '');
  const [teamLeadId, setTeamLeadId] = useState(assignedTeamLeadUserId ?? '');
  const [qaId, setQaId] = useState(assignedQaUserId ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      apiRequest<ApiResponse<MasterDataStatus[]>>('/orders/meta/workflow-statuses'),
      apiRequest<ApiResponse<UserOption[]>>('/orders/meta/assignable-users'),
    ]).then(([statusResponse, userResponse]) => {
      setStatuses(
        statusResponse.data.map((status) => ({
          ...status,
          metadata: parseStatusMetadata(status.metadata),
        })),
      );
      setUsers(userResponse.data);
    });
  }, []);

  useEffect(() => {
    setStatusId(workflowStatusId ?? '');
    setTeamLeadId(assignedTeamLeadUserId ?? '');
    setQaId(assignedQaUserId ?? '');
  }, [workflowStatusId, assignedTeamLeadUserId, assignedQaUserId]);

  const selectableStatuses = useMemo(
    () => allowedWorkflowStatuses(statuses, workflowStatusCode),
    [statuses, workflowStatusCode],
  );

  const excelEditors = useMemo(() => {
    return Array.from(new Set(assignedArtistNames.filter(Boolean)));
  }, [assignedArtistNames]);

  async function handleSave() {
    setBusy(true);
    try {
      await apiRequest(`/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          workflowStatusId: statusId || undefined,
          assignedTeamLeadUserId: teamLeadId || null,
          assignedQaUserId: qaId || null,
        }),
      });
      onUpdated();
    } finally {
      setBusy(false);
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
        <Button size="sm" onClick={handleSave} disabled={busy}>
          Save leads
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Workflow
          </span>
          <select
            value={statusId}
            onChange={(event) => setStatusId(event.target.value)}
            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] px-2.5 text-sm font-medium"
            style={statusFillStyle(
              selectableStatuses.find((status) => status.id === statusId),
            )}
          >
            <option value="">Select status</option>
            {selectableStatuses.map((status) => (
              <option
                key={status.id}
                value={status.id}
                style={statusFillStyle(status)}
              >
                {status.name}
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
