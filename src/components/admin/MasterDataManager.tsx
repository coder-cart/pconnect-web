'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasAnyPermission } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

import { parseStatusMetadata, statusColor, StatusMetadata } from '@/lib/order-status';
import { StatusBadge } from '@/components/orders/StatusBadge';

interface MasterDataItem {
  id: string;
  category: string;
  name: string;
  code: string;
  displayOrder: number;
  isActive: boolean;
  metadata?: StatusMetadata | Record<string, unknown> | null;
}

interface EditorPaymentProfileRow {
  userId: string;
  fullName: string;
  paymentModel: string;
  monthlySalary: number | null;
  hourlyRate: number | null;
}

export function MasterDataManager() {
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const canViewFinance = userHasAnyPermission(user, [
    'finance.invoices.view_all',
    'finance.invoices.create',
    'payments.manage',
  ]);
  const [folderStatuses, setFolderStatuses] = useState<MasterDataItem[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<MasterDataItem[]>([]);
  const [editorProfiles, setEditorProfiles] = useState<EditorPaymentProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [folderForm, setFolderForm] = useState({
    name: '',
    code: '',
    color: '#F2F2F2',
    displayOrder: '',
  });
  const [workflowForm, setWorkflowForm] = useState({
    name: '',
    code: '',
    color: '#F2F2F2',
    displayOrder: '',
    allowedNextCodes: [] as string[],
  });
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setIsLoading(true);
    Promise.all([
      apiRequest<ApiResponse<MasterDataItem[]>>(
        '/master-data/items?category=folder_status&activeOnly=false',
      ),
      apiRequest<ApiResponse<MasterDataItem[]>>(
        '/master-data/items?category=order_status&activeOnly=false',
      ),
      canViewFinance
        ? apiRequest<ApiResponse<EditorPaymentProfileRow[]>>(
            '/orders/editor-payment-profiles',
          ).catch(() => ({ data: [] as EditorPaymentProfileRow[] }))
        : Promise.resolve({ data: [] as EditorPaymentProfileRow[] }),
    ])
      .then(([statusesResponse, orderStatusResponse, editorResponse]) => {
        setFolderStatuses(
          statusesResponse.data.map((item) => ({
            ...item,
            metadata: parseStatusMetadata(item.metadata),
          })),
        );
        setOrderStatuses(
          orderStatusResponse.data.map((item) => ({
            ...item,
            metadata: parseStatusMetadata(item.metadata),
          })),
        );
        setEditorProfiles(editorResponse.data);
      })
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [refreshKey, canViewFinance]);

  async function handleSaveEditorProfile(profile: EditorPaymentProfileRow) {
    setBusy(true);
    try {
      await apiRequest(`/orders/editor-payment-profiles/${profile.userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          paymentModel: profile.paymentModel,
          monthlySalary: profile.monthlySalary ?? undefined,
          hourlyRate: profile.hourlyRate ?? undefined,
        }),
      });
      notifyRefresh();
      load();
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveStatusColor(item: MasterDataItem, color: string) {
    setBusy(true);
    try {
      const metadata = {
        ...parseStatusMetadata(item.metadata),
        color,
      };
      await apiRequest(`/master-data/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ metadata }),
      });
      notifyRefresh();
      load();
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateFolderStatus() {
    if (!folderForm.name.trim() || !folderForm.code.trim()) return;
    setBusy(true);
    try {
      await apiRequest('/master-data/items', {
        method: 'POST',
        body: JSON.stringify({
          category: 'folder_status',
          name: folderForm.name.trim(),
          code: folderForm.code.trim().toLowerCase().replace(/\s+/g, '_'),
          displayOrder: folderForm.displayOrder
            ? Number(folderForm.displayOrder)
            : undefined,
          metadata: { color: folderForm.color },
        }),
      });
      setFolderForm({ name: '', code: '', color: '#F2F2F2', displayOrder: '' });
      notifyRefresh();
      load();
    } finally {
      setBusy(false);
    }
  }

  function startEditFolder(status: MasterDataItem) {
    const metadata = parseStatusMetadata(status.metadata);
    setEditingFolderId(status.id);
    setFolderForm({
      name: status.name,
      code: status.code,
      color: metadata.color ?? '#F2F2F2',
      displayOrder: String(status.displayOrder ?? ''),
    });
  }

  async function handleSaveFolderStatus() {
    if (!editingFolderId) return;
    setBusy(true);
    try {
      await apiRequest(`/master-data/items/${editingFolderId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: folderForm.name.trim(),
          code: folderForm.code.trim().toLowerCase().replace(/\s+/g, '_'),
          displayOrder: folderForm.displayOrder
            ? Number(folderForm.displayOrder)
            : undefined,
          metadata: { color: folderForm.color },
        }),
      });
      setEditingFolderId(null);
      setFolderForm({ name: '', code: '', color: '#F2F2F2', displayOrder: '' });
      notifyRefresh();
      load();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivateStatus(itemId: string) {
    setBusy(true);
    try {
      await apiRequest(`/master-data/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      });
      notifyRefresh();
      load();
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateWorkflowStatus() {
    if (!workflowForm.name.trim() || !workflowForm.code.trim()) return;
    setBusy(true);
    try {
      await apiRequest('/master-data/items', {
        method: 'POST',
        body: JSON.stringify({
          category: 'order_status',
          name: workflowForm.name.trim(),
          code: workflowForm.code.trim().toLowerCase().replace(/\s+/g, '_'),
          displayOrder: workflowForm.displayOrder
            ? Number(workflowForm.displayOrder)
            : undefined,
          metadata: {
            color: workflowForm.color,
            allowedNextCodes: workflowForm.allowedNextCodes,
          },
        }),
      });
      setWorkflowForm({
        name: '',
        code: '',
        color: '#F2F2F2',
        displayOrder: '',
        allowedNextCodes: [],
      });
      notifyRefresh();
      load();
    } finally {
      setBusy(false);
    }
  }

  function startEditWorkflow(status: MasterDataItem) {
    const metadata = parseStatusMetadata(status.metadata);
    setEditingWorkflowId(status.id);
    setWorkflowForm({
      name: status.name,
      code: status.code,
      color: metadata.color ?? '#F2F2F2',
      displayOrder: String(status.displayOrder ?? ''),
      allowedNextCodes: metadata.allowedNextCodes ?? [],
    });
  }

  async function handleSaveWorkflowStatus() {
    if (!editingWorkflowId) return;
    setBusy(true);
    try {
      await apiRequest(`/master-data/items/${editingWorkflowId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: workflowForm.name.trim(),
          code: workflowForm.code.trim().toLowerCase().replace(/\s+/g, '_'),
          displayOrder: workflowForm.displayOrder
            ? Number(workflowForm.displayOrder)
            : undefined,
          metadata: {
            color: workflowForm.color,
            allowedNextCodes: workflowForm.allowedNextCodes,
          },
        }),
      });
      setEditingWorkflowId(null);
      setWorkflowForm({
        name: '',
        code: '',
        color: '#F2F2F2',
        displayOrder: '',
        allowedNextCodes: [],
      });
      notifyRefresh();
      load();
    } finally {
      setBusy(false);
    }
  }

  function toggleWorkflowNextCode(code: string) {
    setWorkflowForm((prev) => ({
      ...prev,
      allowedNextCodes: prev.allowedNextCodes.includes(code)
        ? prev.allowedNextCodes.filter((item) => item !== code)
        : [...prev.allowedNextCodes, code],
    }));
  }

  if (isLoading) return <ListSkeleton rows={6} />;
  if (errorMessage) {
    return (
      <ErrorState
        title="Unable to load master data"
        description={errorMessage}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-sm font-medium text-[var(--foreground)]">
          Folder status (Excel column G)
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Uploaded, In-progress, Done — same values as Job Tracker Master Sheet.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <Input
            label="Name"
            value={folderForm.name}
            onChange={(event) =>
              setFolderForm((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="In Progress"
          />
          <Input
            label="Code"
            value={folderForm.code}
            onChange={(event) =>
              setFolderForm((prev) => ({ ...prev, code: event.target.value }))
            }
            placeholder="in_progress"
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--foreground)]">Color</span>
            <input
              type="color"
              value={folderForm.color}
              onChange={(event) =>
                setFolderForm((prev) => ({ ...prev, color: event.target.value }))
              }
              className="h-10 w-full cursor-pointer rounded border border-[var(--border)]"
            />
          </label>
          <Input
            label="Display order"
            value={folderForm.displayOrder}
            onChange={(event) =>
              setFolderForm((prev) => ({ ...prev, displayOrder: event.target.value }))
            }
            placeholder="1"
          />
          <div className="flex items-end gap-2">
            {editingFolderId ? (
              <>
                <Button onClick={handleSaveFolderStatus} disabled={busy}>
                  Save
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingFolderId(null);
                    setFolderForm({
                      name: '',
                      code: '',
                      color: '#F2F2F2',
                      displayOrder: '',
                    });
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={handleCreateFolderStatus} disabled={busy}>
                Add folder status
              </Button>
            )}
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {folderStatuses.map((status) => {
            const metadata = parseStatusMetadata(status.metadata);
            return (
              <li
                key={status.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <StatusBadge label={status.name} metadata={metadata} />
                  <span className="text-[var(--muted)]">{status.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={statusColor({ metadata }, '#F2F2F2')}
                    onChange={(event) =>
                      void handleSaveStatusColor(status, event.target.value)
                    }
                    className="h-8 w-10 cursor-pointer rounded border border-[var(--border)]"
                  />
                  <span className="text-xs text-[var(--muted)]">
                    {statusColor({ metadata }, '#F2F2F2')}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => startEditFolder(status)}
                  >
                    Edit
                  </Button>
                  {status.isActive ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDeactivateStatus(status.id)}
                      disabled={busy}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <span className="text-xs text-[var(--danger)]">Inactive</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h3 className="text-sm font-medium text-[var(--foreground)]">
          Order workflow statuses
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Fully configurable pipeline statuses (New Order → Completed). Transitions are enforced from admin metadata.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <Input
            label="Name"
            value={workflowForm.name}
            onChange={(event) =>
              setWorkflowForm((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="In Production"
          />
          <Input
            label="Code"
            value={workflowForm.code}
            onChange={(event) =>
              setWorkflowForm((prev) => ({ ...prev, code: event.target.value }))
            }
            placeholder="in_production"
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--foreground)]">Color</span>
            <input
              type="color"
              value={workflowForm.color}
              onChange={(event) =>
                setWorkflowForm((prev) => ({ ...prev, color: event.target.value }))
              }
              className="h-10 w-full cursor-pointer rounded border border-[var(--border)]"
            />
          </label>
          <Input
            label="Display order"
            value={workflowForm.displayOrder}
            onChange={(event) =>
              setWorkflowForm((prev) => ({ ...prev, displayOrder: event.target.value }))
            }
            placeholder="1"
          />
          <div className="flex items-end gap-2">
            {editingWorkflowId ? (
              <>
                <Button onClick={handleSaveWorkflowStatus} disabled={busy}>
                  Save
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingWorkflowId(null);
                    setWorkflowForm({
                      name: '',
                      code: '',
                      color: '#F2F2F2',
                      displayOrder: '',
                      allowedNextCodes: [],
                    });
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={handleCreateWorkflowStatus} disabled={busy}>
                Add workflow status
              </Button>
            )}
          </div>
        </div>
        <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
          <p className="mb-2 text-xs font-medium text-[var(--foreground)]">
            Allowed next statuses
          </p>
          <div className="flex flex-wrap gap-2">
            {orderStatuses.map((status) => (
              <label
                key={status.id}
                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs"
              >
                <input
                  type="checkbox"
                  checked={workflowForm.allowedNextCodes.includes(status.code)}
                  onChange={() => toggleWorkflowNextCode(status.code)}
                />
                {status.code}
              </label>
            ))}
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {orderStatuses.map((status) => {
            const metadata = parseStatusMetadata(status.metadata);
            return (
              <li
                key={status.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge label={status.name} metadata={metadata} />
                    <span className="text-[var(--muted)]">{status.code}</span>
                  </div>
                  {metadata.allowedNextCodes?.length ? (
                    <span className="text-xs text-[var(--muted)]">
                      Next: {metadata.allowedNextCodes.join(', ')}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={statusColor({ metadata }, '#F2F2F2')}
                    onChange={(event) =>
                      void handleSaveStatusColor(status, event.target.value)
                    }
                    className="h-8 w-10 cursor-pointer rounded border border-[var(--border)]"
                  />
                  <span className="text-xs text-[var(--muted)]">
                    {statusColor({ metadata }, '#F2F2F2')}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => startEditWorkflow(status)}
                  >
                    Edit
                  </Button>
                  {status.isActive ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDeactivateStatus(status.id)}
                      disabled={busy}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <span className="text-xs text-[var(--danger)]">Inactive</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {canViewFinance ? (
      <Card>
        <h3 className="text-sm font-medium text-[var(--foreground)]">
          Editor payment models
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Per-image, hourly, or salary. Order cost auto-calculates from out files × artist rate.
        </p>
        <ul className="mt-4 space-y-3">
          {editorProfiles.map((profile) => (
            <li
              key={profile.userId}
              className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--border)] p-3 md:grid-cols-5"
            >
              <span className="text-sm font-medium md:col-span-1">
                {profile.fullName}
              </span>
              <select
                value={profile.paymentModel}
                onChange={(event) =>
                  setEditorProfiles((prev) =>
                    prev.map((row) =>
                      row.userId === profile.userId
                        ? { ...row, paymentModel: event.target.value }
                        : row,
                    ),
                  )
                }
                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
              >
                <option value="per_image">Per image</option>
                <option value="hourly">Hourly</option>
                <option value="salary">Salary</option>
              </select>
              <Input
                label="Monthly salary"
                value={profile.monthlySalary?.toString() ?? ''}
                onChange={(event) =>
                  setEditorProfiles((prev) =>
                    prev.map((row) =>
                      row.userId === profile.userId
                        ? {
                            ...row,
                            monthlySalary: event.target.value
                              ? Number(event.target.value)
                              : null,
                          }
                        : row,
                    ),
                  )
                }
                placeholder="Salary"
              />
              <Input
                label="Hourly rate"
                value={profile.hourlyRate?.toString() ?? ''}
                onChange={(event) =>
                  setEditorProfiles((prev) =>
                    prev.map((row) =>
                      row.userId === profile.userId
                        ? {
                            ...row,
                            hourlyRate: event.target.value
                              ? Number(event.target.value)
                              : null,
                          }
                        : row,
                    ),
                  )
                }
                placeholder="Hourly"
              />
              <div className="flex items-end">
                <Button
                  size="sm"
                  onClick={() => handleSaveEditorProfile(profile)}
                  disabled={busy}
                >
                  Save
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      ) : null}
    </div>
  );
}
