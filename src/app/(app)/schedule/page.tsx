'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasPermission } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface StudioEvent {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  status: string;
  clientOrganization?: { id: string; name: string } | null;
  assignees: Array<{ user: { id: string; fullName: string } }>;
  warnings?: string[];
}

interface CandidateUser {
  id: string;
  fullName: string;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
  );
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const start = startOfDay(date);
  start.setDate(start.getDate() - day);
  return start;
}

function endOfWeek(date: Date) {
  const end = startOfWeek(date);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}

type ScheduleView = 'month' | 'week' | 'day';

function rangeForView(view: ScheduleView, anchor: Date) {
  if (view === 'day') {
    return { from: startOfDay(anchor), to: endOfDay(anchor) };
  }
  if (view === 'week') {
    return { from: startOfWeek(anchor), to: endOfWeek(anchor) };
  }
  return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
}

export default function SchedulePage() {
  const { user, refreshKey } = useWorkspace();
  const canManage = userHasPermission(user, 'schedule.manage');
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('shoot');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<ScheduleView>('month');
  const [anchor] = useState(() => new Date());

  function loadEvents() {
    setIsLoading(true);
    setErrorMessage(null);
    const { from, to } = rangeForView(view, anchor);
    apiRequest<ApiResponse<StudioEvent[]>>(
      `/schedule/events?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
    )
      .then((response) => setEvents(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadEvents());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, view, anchor]);

  useEffect(() => {
    if (!createOpen) return;
    let cancelled = false;
    apiRequest<
      ApiResponse<{
        portalUsers: CandidateUser[];
        internalUsers: CandidateUser[];
      }>
    >('/tasks/assignee-candidates')
      .then((response) => {
        if (cancelled) return;
        const people = [
          ...(response.data.portalUsers ?? []),
          ...(response.data.internalUsers ?? []),
        ];
        const unique = new Map(people.map((person) => [person.id, person]));
        setCandidates(Array.from(unique.values()));
      })
      .catch(() => {
        if (!cancelled) setCandidates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [createOpen]);

  const upcoming = useMemo(
    () =>
      [...events]
        .filter((event) => event.status !== 'cancelled')
        .sort(
          (left, right) =>
            new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
        ),
    [events],
  );

  async function handleCreate(event?: FormEvent) {
    event?.preventDefault();
    if (!title.trim() || !startsAt || !endsAt) return;
    setIsSubmitting(true);
    setWarnings([]);
    try {
      const response = await apiRequest<
        ApiResponse<{ event: StudioEvent; warnings: string[] }>
      >('/schedule/events', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          type,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          location: location.trim() || undefined,
          assigneeUserIds: assigneeUserId ? [assigneeUserId] : [],
          visibilityScope: 'shared_with_client',
        }),
      });
      setWarnings(response.data.warnings ?? []);
      setCreateOpen(false);
      setTitle('');
      setStartsAt('');
      setEndsAt('');
      setLocation('');
      setAssigneeUserId('');
      loadEvents();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create event',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Schedule"
        description="Studio shoots, sessions, and meetings."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Schedule' },
        ]}
        action={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New event
            </Button>
          ) : null
        }
      />

      <Tabs
        activeId={view}
        onChange={(id) => setView(id as ScheduleView)}
        items={[
          { id: 'month', label: 'Month' },
          { id: 'week', label: 'Week' },
          { id: 'day', label: 'Day' },
        ]}
      />

      {warnings.length > 0 ? (
        <Card padding="sm" className="border-[var(--warning)] bg-[var(--warning-soft)]">
          <p className="text-sm font-medium text-[var(--foreground)]">
            Scheduling warnings
          </p>
          <ul className="mt-1 list-disc pl-5 text-xs text-[var(--muted)]">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {isLoading ? <ListSkeleton rows={5} /> : null}
      {!isLoading && errorMessage ? (
        <ErrorState title="Unable to load schedule" description={errorMessage} />
      ) : null}
      {!isLoading && !errorMessage && upcoming.length === 0 ? (
        <EmptyState
          title={`No events this ${view}`}
          description="Create a shoot or meeting to populate the schedule."
        />
      ) : null}

      {!isLoading && !errorMessage && upcoming.length > 0 ? (
        <Card padding="none" className="overflow-hidden">
          <ul className="divide-y divide-[var(--border)]">
            {upcoming.map((event) => (
              <li
                key={event.id}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">
                    {event.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {new Date(event.startsAt).toLocaleString()} –{' '}
                    {new Date(event.endsAt).toLocaleTimeString()}
                    {event.location ? ` · ${event.location}` : ''}
                    {event.clientOrganization?.name
                      ? ` · ${event.clientOrganization.name}`
                      : ''}
                  </p>
                  {event.assignees.length > 0 ? (
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {event.assignees
                        .map((row) => row.user.fullName)
                        .join(', ')}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="primary">{event.type.replaceAll('_', ' ')}</Badge>
                  <Badge variant="neutral">{event.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New schedule event"
        description="Create a shoot, session, or meeting. Overlaps warn but do not block."
        footer={
          <ModalActions
            onCancel={() => setCreateOpen(false)}
            onSubmit={() => void handleCreate()}
            submitLabel="Create event"
            isSubmitting={isSubmitting}
            disabled={!title.trim() || !startsAt || !endsAt}
          />
        }
      >
        <form className="space-y-4" onSubmit={(event) => void handleCreate(event)}>
          <Input
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <Select
            label="Type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            options={[
              { value: 'shoot', label: 'Shoot' },
              { value: 'studio_session', label: 'Studio session' },
              { value: 'client_meeting', label: 'Client meeting' },
              { value: 'internal_meeting', label: 'Internal meeting' },
              { value: 'appointment', label: 'Appointment' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <Input
            label="Starts"
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            required
          />
          <Input
            label="Ends"
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            required
          />
          <Input
            label="Location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
          <Select
            label="Assignee"
            value={assigneeUserId}
            onChange={(event) => setAssigneeUserId(event.target.value)}
            options={[
              { value: '', label: 'Unassigned' },
              ...candidates.map((person) => ({
                value: person.id,
                label: person.fullName,
              })),
            ]}
          />
        </form>
      </Modal>
    </div>
  );
}
