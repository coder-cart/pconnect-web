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
  assignedArtistUserId?: string | null;
  assignedTeamLeadUserId?: string | null;
  assignedQaUserId?: string | null;
  onUpdated: () => void;
}

export function OrderAssignmentPanel({
  orderId,
  workflowStatusId,
  workflowStatusCode,
  assignedArtistUserId,
  assignedTeamLeadUserId,
  assignedQaUserId,
  onUpdated,
}: OrderAssignmentPanelProps) {
  const [statuses, setStatuses] = useState<MasterDataStatus[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [statusId, setStatusId] = useState(workflowStatusId ?? '');
  const [artistId, setArtistId] = useState(assignedArtistUserId ?? '');
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
    setArtistId(assignedArtistUserId ?? '');
    setTeamLeadId(assignedTeamLeadUserId ?? '');
    setQaId(assignedQaUserId ?? '');
  }, [
    workflowStatusId,
    assignedArtistUserId,
    assignedTeamLeadUserId,
    assignedQaUserId,
  ]);

  const selectableStatuses = useMemo(
    () => allowedWorkflowStatuses(statuses, workflowStatusCode),
    [statuses, workflowStatusCode],
  );

  async function handleSave() {
    setBusy(true);
    try {
      await apiRequest(`/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          workflowStatusId: statusId || undefined,
          assignedArtistUserId: artistId || null,
          assignedTeamLeadUserId: teamLeadId || null,
          assignedQaUserId: qaId || null,
        }),
      });
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-medium text-[var(--foreground)]">
        Manager assignment
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-[var(--muted)]">Workflow status</span>
          <select
            value={statusId}
            onChange={(event) => setStatusId(event.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm font-medium"
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
          <span className="mb-1 block text-xs text-[var(--muted)]">Artist / Editor</span>
          <select
            value={artistId}
            onChange={(event) => setArtistId(event.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
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
          <span className="mb-1 block text-xs text-[var(--muted)]">Team lead</span>
          <select
            value={teamLeadId}
            onChange={(event) => setTeamLeadId(event.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
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
          <span className="mb-1 block text-xs text-[var(--muted)]">QA</span>
          <select
            value={qaId}
            onChange={(event) => setQaId(event.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
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
      <Button size="sm" onClick={handleSave} disabled={busy}>
        Save assignments
      </Button>
    </Card>
  );
}
