'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  Circle,
  CircleCheck,
  Plus,
  UserPlus,
  Users,
  Workflow,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasPermission } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingState, ErrorState } from '@/components/ui/StatePanels';
import { CreateOnboardingModal } from '@/components/modals/CreateOnboardingModal';
import { LinkClientUserModal } from '@/components/modals/LinkClientUserModal';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface OnboardingItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  dueDate?: string | null;
}

interface OnboardingWorkflow {
  id: string;
  name: string;
  status: string;
  clientOrganization?: { id: string; name: string } | null;
  items: OnboardingItem[];
}

interface ClientMember {
  id: string;
  linkedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    userType: string;
    status: string;
  };
}

function statusVariant(status: string) {
  if (status === 'completed') return 'success' as const;
  if (status === 'in_progress') return 'primary' as const;
  if (status === 'blocked') return 'danger' as const;
  return 'neutral' as const;
}

function clientStatusVariant(status: string) {
  if (status === 'active') return 'success' as const;
  if (status === 'onboarding') return 'warning' as const;
  return 'neutral' as const;
}

function userStatusVariant(status: string) {
  if (status === 'active') return 'success' as const;
  if (status === 'inactive') return 'neutral' as const;
  return 'warning' as const;
}

function formatLinkedDate(value: string) {
  return new Date(value).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ClientOnboardingDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const { user } = useWorkspace();
  const canManage = userHasPermission(user, 'clients.manage');

  const [workflows, setWorkflows] = useState<OnboardingWorkflow[]>([]);
  const [members, setMembers] = useState<ClientMember[]>([]);
  const [clientName, setClientName] = useState<string>('Client');
  const [clientStatus, setClientStatus] = useState<string>('onboarding');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({});
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [busyWorkflowId, setBusyWorkflowId] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [workflowsResponse, clientsResponse, membersResponse] =
        await Promise.all([
          apiRequest<ApiResponse<OnboardingWorkflow[]>>('/onboarding/workflows'),
          apiRequest<
            ApiResponse<Array<{ id: string; name: string; status: string }>>
          >('/clients'),
          apiRequest<ApiResponse<ClientMember[]>>(`/clients/${clientId}/users`),
        ]);

      const scoped = workflowsResponse.data.filter(
        (workflow) => workflow.clientOrganization?.id === clientId,
      );
      setWorkflows(scoped);
      setMembers(membersResponse.data);

      const matchedClient = clientsResponse.data.find(
        (client) => client.id === clientId,
      );
      setClientName(
        matchedClient?.name ??
          scoped[0]?.clientOrganization?.name ??
          'Client',
      );
      if (matchedClient?.status) {
        setClientStatus(matchedClient.status);
      }
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function activateClient() {
    setIsActivating(true);
    try {
      await apiRequest(`/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      });
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to activate client',
      );
    } finally {
      setIsActivating(false);
    }
  }

  async function setWorkflowStatus(workflowId: string, status: string) {
    setBusyWorkflowId(workflowId);
    try {
      await apiRequest(`/onboarding/workflows/${workflowId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update workflow',
      );
    } finally {
      setBusyWorkflowId(null);
    }
  }

  async function toggleItem(workflowId: string, item: OnboardingItem) {
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    setBusyItemId(item.id);
    try {
      await apiRequest(
        `/onboarding/workflows/${workflowId}/items/${item.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update item',
      );
    } finally {
      setBusyItemId(null);
    }
  }

  async function addItem(workflowId: string) {
    const title = (newItemTitles[workflowId] ?? '').trim();
    if (!title) return;

    setBusyItemId(`add-${workflowId}`);
    try {
      await apiRequest(`/onboarding/workflows/${workflowId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          visibilityScope: 'shared_with_client',
        }),
      });
      setNewItemTitles((prev) => ({ ...prev, [workflowId]: '' }));
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to add item',
      );
    } finally {
      setBusyItemId(null);
    }
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Loading client"
        description="Fetching organization members and onboarding progress."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={clientName}
        description="Organization members, onboarding progress, and activation."
        breadcrumbs={[
          { label: 'Clients', href: '/clients' },
          { label: clientName },
        ]}
        action={
          <>
            {canManage && clientStatus !== 'active' ? (
              <Button onClick={() => void activateClient()} disabled={isActivating}>
                <CircleCheck className="h-4 w-4" />
                Activate client
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New workflow
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--muted)]">Client status:</span>
        <Badge variant={clientStatusVariant(clientStatus)} className="capitalize">
          {clientStatus.replaceAll('_', ' ')}
        </Badge>
      </div>

      {errorMessage ? (
        <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Organization members
            </h2>
          </div>
          {canManage ? (
            <Button size="sm" variant="secondary" onClick={() => setLinkOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Add member
            </Button>
          ) : null}
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No client users linked yet. Add a member so they can log in and receive
            an invite to the client messages hub.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Linked</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="py-3 pr-4 font-medium text-[var(--foreground)]">
                      {member.user.fullName}
                    </td>
                    <td className="py-3 pr-4 text-[var(--muted-foreground)]">
                      {member.user.email}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={userStatusVariant(member.user.status)}
                        className="capitalize"
                      >
                        {member.user.status.replaceAll('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 text-[var(--muted)]">
                      {formatLinkedDate(member.linkedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {workflows.length === 0 ? (
        <ErrorState
          title="No onboarding workflows yet"
          description="Create a workflow to start tracking this client's onboarding checklist."
        />
      ) : (
        <div className="space-y-5">
          {workflows.map((workflow) => {
            const total = workflow.items.length;
            const done = workflow.items.filter(
              (item) => item.status === 'completed',
            ).length;

            return (
              <Card key={workflow.id}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-[var(--primary)]" />
                    <h2 className="text-base font-semibold text-[var(--foreground)]">
                      {workflow.name}
                    </h2>
                    <Badge
                      variant={statusVariant(workflow.status)}
                      className="capitalize"
                    >
                      {workflow.status.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--muted)]">
                      {done}/{total} complete
                    </span>
                    {canManage && workflow.status !== 'completed' ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          void setWorkflowStatus(workflow.id, 'completed')
                        }
                        disabled={busyWorkflowId === workflow.id}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark complete
                      </Button>
                    ) : null}
                    {canManage && workflow.status === 'completed' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void setWorkflowStatus(workflow.id, 'active')
                        }
                        disabled={busyWorkflowId === workflow.id}
                      >
                        Reopen
                      </Button>
                    ) : null}
                  </div>
                </div>

                <ul className="space-y-2">
                  {workflow.items.map((item) => {
                    const isComplete = item.status === 'completed';
                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2"
                      >
                        <button
                          type="button"
                          onClick={() => void toggleItem(workflow.id, item)}
                          disabled={busyItemId === item.id}
                          className="flex flex-1 items-center gap-3 text-left disabled:opacity-50"
                        >
                          {isComplete ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--success)]" />
                          ) : (
                            <Circle className="h-5 w-5 shrink-0 text-[var(--muted)]" />
                          )}
                          <span
                            className={
                              isComplete
                                ? 'text-sm text-[var(--muted)] line-through'
                                : 'text-sm text-[var(--foreground)]'
                            }
                          >
                            {item.title}
                          </span>
                        </button>
                        <Badge
                          variant={statusVariant(item.status)}
                          className="capitalize"
                        >
                          {item.status.replaceAll('_', ' ')}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>

                <form
                  className="mt-4 flex items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void addItem(workflow.id);
                  }}
                >
                  <div className="flex-1">
                    <Input
                      placeholder="Add a checklist item..."
                      value={newItemTitles[workflow.id] ?? ''}
                      onChange={(event) =>
                        setNewItemTitles((prev) => ({
                          ...prev,
                          [workflow.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={
                      busyItemId === `add-${workflow.id}` ||
                      !(newItemTitles[workflow.id] ?? '').trim()
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </form>
              </Card>
            );
          })}
        </div>
      )}

      <CreateOnboardingModal
        open={createOpen}
        defaultClientId={clientId}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void load()}
      />
      <LinkClientUserModal
        open={linkOpen}
        clientId={clientId}
        clientName={clientName}
        onClose={() => setLinkOpen(false)}
        onLinked={() => void load()}
      />
    </div>
  );
}
