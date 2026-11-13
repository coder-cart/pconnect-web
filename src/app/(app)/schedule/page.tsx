'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasPermission, userIsExternal } from '@/lib/auth';
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
import {
  StudioCalendar,
  type CalendarEvent,
} from '@/components/schedule/StudioCalendar';
import { BookingRequestsPanel } from '@/components/booking/BookingRequestsPanel';
import { BookingSettingsPanel } from '@/components/booking/BookingSettingsPanel';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface CandidateUser {
  id: string;
  fullName: string;
}

interface ClientOption {
  id: string;
  name: string;
}

interface OrderOption {
  id: string;
  code: string;
  name: string;
  clientOrganizationId?: string;
  clientOrganization?: { id: string; name: string } | null;
}

type ScheduleView = 'month' | 'week' | 'day';

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
  const start = startOfDay(date);
  start.setDate(start.getDate() - start.getDay());
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

function rangeForView(view: ScheduleView, anchor: Date) {
  if (view === 'day') {
    return { from: startOfDay(anchor), to: endOfDay(anchor) };
  }
  if (view === 'week') {
    return { from: startOfWeek(anchor), to: endOfWeek(anchor) };
  }
  return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
}

function toLocalInputValue(value: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function shiftAnchor(view: ScheduleView, anchor: Date, direction: -1 | 1) {
  const next = new Date(anchor);
  if (view === 'day') {
    next.setDate(next.getDate() + direction);
  } else if (view === 'week') {
    next.setDate(next.getDate() + direction * 7);
  } else {
    next.setMonth(next.getMonth() + direction);
  }
  return next;
}

function emptyForm(seed?: Date) {
  const start = seed ? new Date(seed) : new Date();
  if (!seed) {
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
  }
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return {
    title: '',
    type: 'shoot',
    startsAt: toLocalInputValue(start),
    endsAt: toLocalInputValue(end),
    location: '',
    assigneeUserId: '',
    clientOrganizationId: '',
    orderId: '',
    description: '',
  };
}

export default function SchedulePage() {
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const searchParams = useSearchParams();
  const canManage = userHasPermission(user, 'schedule.manage');
  const isExternal = userIsExternal(user);
  const [bookingClientId, setBookingClientId] = useState<string | null>(null);
  const [bookingRequestId, setBookingRequestId] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState(() => emptyForm());
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<ScheduleView>(() => {
    const param = searchParams.get('view');
    if (param === 'week' || param === 'day' || param === 'month') return param;
    return 'month';
  });
  const [anchor, setAnchor] = useState(() => new Date());
  const [assigneeFilter, setAssigneeFilter] = useState(
    () => searchParams.get('assigneeUserId') ?? '',
  );

  function loadEvents() {
    setIsLoading(true);
    setErrorMessage(null);
    const { from, to } = rangeForView(view, anchor);
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });
    if (assigneeFilter) params.set('assigneeUserId', assigneeFilter);
    apiRequest<ApiResponse<CalendarEvent[]>>(
      `/schedule/events?${params.toString()}`,
    )
      .then((response) => setEvents(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadEvents());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, view, anchor, assigneeFilter]);

  useEffect(() => {
    const nextView = searchParams.get('view');
    const nextAssignee = searchParams.get('assigneeUserId') ?? '';
    const eventId = searchParams.get('event');
    const bookingRequest = searchParams.get('bookingRequest');
    void Promise.resolve().then(() => {
      if (nextView === 'week' || nextView === 'day' || nextView === 'month') {
        setView(nextView);
      }
      setAssigneeFilter(nextAssignee);
      if (bookingRequest) setBookingRequestId(bookingRequest);
      if (eventId && events.length > 0) {
        const match = events.find((event) => event.id === eventId);
        if (match) openEdit(match);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, events]);

  useEffect(() => {
    let cancelled = false;
    apiRequest<ApiResponse<ClientOption[]>>('/clients')
      .then((response) => {
        if (cancelled) return;
        setBookingClientId(response.data[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setBookingClientId(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    let cancelled = false;
    Promise.all([
      apiRequest<
        ApiResponse<{
          portalUsers: CandidateUser[];
          internalUsers: CandidateUser[];
        }>
      >('/tasks/assignee-candidates').catch(() => null),
      isExternal
        ? Promise.resolve(null)
        : apiRequest<ApiResponse<ClientOption[]>>('/clients').catch(() => null),
      apiRequest<ApiResponse<{ items: OrderOption[] }>>(
        '/orders?pageSize=100',
      ).catch(() => null),
    ]).then(([candidatesResponse, clientsResponse, ordersResponse]) => {
      if (cancelled) return;
      const people = [
        ...(candidatesResponse?.data.portalUsers ?? []),
        ...(candidatesResponse?.data.internalUsers ?? []),
      ];
      const unique = new Map(people.map((person) => [person.id, person]));
      setCandidates(Array.from(unique.values()));
      setClients(clientsResponse?.data ?? []);
      setOrders(ordersResponse?.data.items ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, isExternal]);

  const filteredOrders = useMemo(() => {
    if (!form.clientOrganizationId) return orders;
    return orders.filter((order) => {
      const orgId =
        order.clientOrganizationId ?? order.clientOrganization?.id ?? null;
      return !orgId || orgId === form.clientOrganizationId;
    });
  }, [orders, form.clientOrganizationId]);

  const rangeLabel = useMemo(() => {
    if (view === 'day') {
      return anchor.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (view === 'week') {
      const from = startOfWeek(anchor);
      const to = endOfWeek(anchor);
      return `${from.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${to.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return anchor.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  }, [view, anchor]);

  function openCreate(seed?: Date) {
    setEditingEvent(null);
    setForm(emptyForm(seed));
    setWarnings([]);
    setModalOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditingEvent(event);
    setForm({
      title: event.title,
      type: event.type,
      startsAt: toLocalInputValue(new Date(event.startsAt)),
      endsAt: toLocalInputValue(new Date(event.endsAt)),
      location: event.location ?? '',
      assigneeUserId: event.assignees[0]?.user.id ?? '',
      clientOrganizationId: event.clientOrganization?.id ?? '',
      orderId: event.order?.id ?? '',
      description: '',
    });
    setWarnings([]);
    setModalOpen(true);
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!titleValid()) return;
    setIsSubmitting(true);
    setWarnings([]);
    setErrorMessage(null);
    const payload = {
      title: form.title.trim(),
      type: form.type,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      location: form.location.trim() || undefined,
      description: form.description.trim() || undefined,
      assigneeUserIds: form.assigneeUserId ? [form.assigneeUserId] : [],
      clientOrganizationId: form.clientOrganizationId || undefined,
      orderId: form.orderId || undefined,
      visibilityScope: 'shared_with_client' as const,
    };
    try {
      if (editingEvent) {
        const response = await apiRequest<
          ApiResponse<{ event: CalendarEvent; warnings: string[] }>
        >(`/schedule/events/${editingEvent.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...payload,
            location: form.location.trim() || null,
            clientOrganizationId: form.clientOrganizationId || null,
            orderId: form.orderId || null,
          }),
        });
        setWarnings(response.data.warnings ?? []);
      } else {
        const response = await apiRequest<
          ApiResponse<{ event: CalendarEvent; warnings: string[] }>
        >('/schedule/events', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setWarnings(response.data.warnings ?? []);
      }
      setModalOpen(false);
      setEditingEvent(null);
      loadEvents();
      notifyRefresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save event',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelEvent() {
    if (!editingEvent) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/schedule/events/${editingEvent.id}/cancel`, {
        method: 'POST',
      });
      setModalOpen(false);
      setEditingEvent(null);
      loadEvents();
      notifyRefresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to cancel event',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function titleValid() {
    return Boolean(form.title.trim() && form.startsAt && form.endsAt);
  }

  const upcoming = useMemo(
    () =>
      [...events]
        .filter((event) => event.status !== 'cancelled')
        .sort(
          (left, right) =>
            new Date(left.startsAt).getTime() -
            new Date(right.startsAt).getTime(),
        ),
    [events],
  );

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
            <Button onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              New event
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          activeId={view}
          onChange={(id) => setView(id as ScheduleView)}
          items={[
            { id: 'month', label: 'Month' },
            { id: 'week', label: 'Week' },
            { id: 'day', label: 'Day' },
          ]}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
          <Button
            variant="secondary"
            onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <p className="min-w-[10rem] text-sm font-medium text-[var(--foreground)]">
            {rangeLabel}
          </p>
        </div>
      </div>

      {warnings.length > 0 ? (
        <Card
          padding="sm"
          className="border-[var(--warning)] bg-[var(--warning-soft)]"
        >
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

      {!isLoading && !errorMessage ? (
        <StudioCalendar
          view={view}
          anchor={anchor}
          events={events}
          onSelectEvent={(event) => {
            if (canManage) openEdit(event);
          }}
          onSelectSlot={
            canManage
              ? (day) => {
                  setAnchor(day);
                  openCreate(day);
                }
              : undefined
          }
        />
      ) : null}

      {(canManage || isExternal) && bookingClientId ? (
        <BookingSettingsPanel clientOrganizationId={bookingClientId} />
      ) : null}
      {canManage || isExternal ? (
        <BookingRequestsPanel
          highlightId={bookingRequestId}
          onChanged={() => loadEvents()}
        />
      ) : null}

      {!isLoading && !errorMessage && upcoming.length === 0 ? (
        <EmptyState
          title={`No events this ${view}`}
          description={
            canManage
              ? 'Create a shoot or meeting to populate the schedule.'
              : 'No scheduled events in this range.'
          }
        />
      ) : null}

      {!isLoading && !errorMessage && upcoming.length > 0 ? (
        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Agenda
            </p>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {upcoming.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => canManage && openEdit(event)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--surface-muted)]"
                  disabled={!canManage}
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
                      {event.order?.code ? ` · ${event.order.code}` : ''}
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
                    <Badge variant="primary">
                      {event.type.replaceAll('_', ' ')}
                    </Badge>
                    <Badge variant="neutral">{event.status}</Badge>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEvent ? 'Edit schedule event' : 'New schedule event'}
        description="Create or update a shoot, session, or meeting. Overlaps warn but do not block."
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            {editingEvent && canManage ? (
              <Button
                variant="danger"
                onClick={() => void handleCancelEvent()}
                disabled={isSubmitting || editingEvent.status === 'cancelled'}
              >
                Cancel event
              </Button>
            ) : (
              <span />
            )}
            <ModalActions
              onCancel={() => setModalOpen(false)}
              onSubmit={() => void handleSubmit()}
              submitLabel={editingEvent ? 'Save changes' : 'Create event'}
              isSubmitting={isSubmitting}
              disabled={!titleValid()}
            />
          </div>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <Input
            label="Title"
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            required
          />
          <Select
            label="Type"
            value={form.type}
            onChange={(event) =>
              setForm((current) => ({ ...current, type: event.target.value }))
            }
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
            value={form.startsAt}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                startsAt: event.target.value,
              }))
            }
            required
          />
          <Input
            label="Ends"
            type="datetime-local"
            value={form.endsAt}
            onChange={(event) =>
              setForm((current) => ({ ...current, endsAt: event.target.value }))
            }
            required
          />
          <Input
            label="Location"
            value={form.location}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                location: event.target.value,
              }))
            }
          />
          {!isExternal ? (
            <Select
              label="Client studio"
              value={form.clientOrganizationId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  clientOrganizationId: event.target.value,
                  orderId: '',
                }))
              }
              options={[
                { value: '', label: 'No client' },
                ...clients.map((client) => ({
                  value: client.id,
                  label: client.name,
                })),
              ]}
            />
          ) : null}
          <Select
            label="Linked order"
            value={form.orderId}
            onChange={(event) =>
              setForm((current) => ({ ...current, orderId: event.target.value }))
            }
            options={[
              { value: '', label: 'No order' },
              ...filteredOrders.map((order) => ({
                value: order.id,
                label: `${order.code} · ${order.name}`,
              })),
            ]}
          />
          <Select
            label="Assignee"
            value={form.assigneeUserId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                assigneeUserId: event.target.value,
              }))
            }
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
