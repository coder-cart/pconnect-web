'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasPermission, userIsExternal } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
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
import { StudioAvailabilityPanel } from '@/components/schedule/StudioAvailabilityPanel';
import { StudioProjectsBoard } from '@/components/schedule/StudioProjectsBoard';
import { PublicBookFlow } from '@/components/public-booking/PublicBookFlow';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

type StudioSection = 'availability' | 'booking' | 'projects';

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
  const canConfigureBooking =
    canManage || Boolean(isExternal && user?.isOrgAdmin);
  const [bookingClientId, setBookingClientId] = useState<string | null>(null);
  const [bookingClients, setBookingClients] = useState<ClientOption[]>([]);
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
  const [section, setSection] = useState<StudioSection>(() => {
    const param = searchParams.get('section');
    if (param === 'booking' || param === 'projects' || param === 'availability') {
      return param;
    }
    if (searchParams.get('bookingRequest')) return 'projects';
    return 'availability';
  });
  const [anchor, setAnchor] = useState(() => new Date());
  const [assigneeFilter, setAssigneeFilter] = useState(
    () => searchParams.get('assigneeUserId') ?? '',
  );
  const [bookingSlug, setBookingSlug] = useState<string | null>(null);

  function loadEvents() {
    if (!canManage && !userHasPermission(user, 'schedule.view')) {
      setEvents([]);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }
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
  }, [refreshKey, view, anchor, assigneeFilter, canManage, user]);

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
      if (bookingRequest && (canManage || canConfigureBooking)) {
        setBookingRequestId(bookingRequest);
        setSection('projects');
      } else if (!canManage && !canConfigureBooking) {
        setSection('availability');
      }
      if (eventId && events.length > 0) {
        const match = events.find((event) => event.id === eventId);
        if (match) openEdit(match);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, events, canManage, canConfigureBooking]);

  useEffect(() => {
    if (!canConfigureBooking) return;
    let cancelled = false;
    apiRequest<ApiResponse<ClientOption[]>>('/clients')
      .then((response) => {
        if (cancelled) return;
        const orgAdminIds = user?.orgAdminClientIds ?? [];
        const clients =
          canManage || !isExternal
            ? response.data
            : response.data.filter((client) => orgAdminIds.includes(client.id));
        setBookingClients(clients);
        setBookingClientId((current) => {
          if (current && clients.some((client) => client.id === current)) {
            return current;
          }
          return clients[0]?.id ?? null;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setBookingClients([]);
          setBookingClientId(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canConfigureBooking, canManage, isExternal, user?.orgAdminClientIds]);

  useEffect(() => {
    if (!bookingClientId || !canConfigureBooking) {
      setBookingSlug(null);
      return;
    }
    let cancelled = false;
    apiRequest<
      ApiResponse<{
        publicSlug?: string | null;
        enabled?: boolean;
        publishStatus?: string;
      }>
    >(`/clients/${bookingClientId}/booking-settings`)
      .then((response) => {
        if (cancelled) return;
        const published =
          response.data.enabled &&
          (response.data.publishStatus === 'published' ||
            !response.data.publishStatus);
        setBookingSlug(
          published ? response.data.publicSlug ?? null : null,
        );
      })
      .catch(() => {
        if (!cancelled) setBookingSlug(null);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingClientId, canConfigureBooking, section]);

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
      description: event.description ?? '',
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

  const showAvailability =
    section === 'availability' || (!canManage && !canConfigureBooking);
  const showStudioHub = canConfigureBooking;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Studio"
        description="Post availability, share your booking page, and run jobs on the project board."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Studio' },
        ]}
      />

      {showStudioHub ? (
        <Tabs
          activeId={section}
          onChange={(id) => setSection(id as StudioSection)}
          items={[
            { id: 'availability', label: 'Availability' },
            { id: 'booking', label: 'Booking page' },
            { id: 'projects', label: 'Projects' },
          ]}
        />
      ) : null}

      {showStudioHub && showAvailability ? (
        <div className="space-y-4">
          {bookingClients.length > 1 ? (
            <Card padding="sm">
              <Select
                label="Studio / client"
                value={bookingClientId ?? ''}
                onChange={(event) =>
                  setBookingClientId(event.target.value || null)
                }
                options={bookingClients.map((client) => ({
                  value: client.id,
                  label: client.name,
                }))}
              />
            </Card>
          ) : null}
          {bookingClientId ? (
            <StudioAvailabilityPanel
              clientOrganizationId={bookingClientId}
              onPreviewAsClient={() => setSection('booking')}
            />
          ) : (
            <EmptyState
              title="No studio linked"
              description="Link a client organization before posting availability."
            />
          )}
        </div>
      ) : null}

      {!showStudioHub && showAvailability ? (
        <div className="space-y-4">
          {isLoading ? <ListSkeleton rows={5} /> : null}
          {!isLoading && errorMessage ? (
            <ErrorState
              title="Unable to load schedule"
              description={errorMessage}
            />
          ) : null}
          {!isLoading && !errorMessage ? (
            <StudioCalendar
              view={view}
              anchor={anchor}
              events={events}
              onSelectEvent={(event) => openEdit(event)}
            />
          ) : null}
        </div>
      ) : null}

      {showStudioHub && section === 'booking' ? (
        <div className="space-y-4">
          {bookingClients.length > 1 ? (
            <Card padding="sm">
              <Select
                label="Studio / client"
                value={bookingClientId ?? ''}
                onChange={(event) =>
                  setBookingClientId(event.target.value || null)
                }
                options={bookingClients.map((client) => ({
                  value: client.id,
                  label: client.name,
                }))}
              />
            </Card>
          ) : null}
          {bookingSlug ? (
            <PublicBookFlow
              slug={bookingSlug}
              showAttribution={false}
              lead="This is the page your clients see. Only dates with open slots can be picked."
              onSubmitted={() => setSection('projects')}
            />
          ) : (
            <EmptyState
              title="Public booking is off"
              description="Enable public booking, publish the page, and post open slots on Availability, then preview here."
            />
          )}
        </div>
      ) : null}

      {showStudioHub && section === 'projects' ? (
        <StudioProjectsBoard
          highlightRequestId={bookingRequestId}
          onChanged={() => loadEvents()}
        />
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          !canManage && editingEvent
            ? 'Event details'
            : editingEvent
              ? 'Edit schedule event'
              : 'New schedule event'
        }
        description={
          canManage
            ? 'Create or update a shoot, session, or meeting. Overlaps warn but do not block.'
            : 'View-only. Ask a teammate with schedule manage access to make changes.'
        }
        footer={
          canManage ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              {editingEvent ? (
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
          ) : (
            <div className="flex w-full justify-end">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Close
              </Button>
            </div>
          )
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canManage) void handleSubmit(event);
          }}
        >
          <Input
            label="Title"
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            required
            readOnly={!canManage}
            disabled={!canManage}
          />
          <Select
            label="Type"
            value={form.type}
            onChange={(event) =>
              setForm((current) => ({ ...current, type: event.target.value }))
            }
            disabled={!canManage}
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
            readOnly={!canManage}
            disabled={!canManage}
          />
          <Input
            label="Ends"
            type="datetime-local"
            value={form.endsAt}
            onChange={(event) =>
              setForm((current) => ({ ...current, endsAt: event.target.value }))
            }
            required
            readOnly={!canManage}
            disabled={!canManage}
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
            readOnly={!canManage}
            disabled={!canManage}
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Notes
            </span>
            <textarea
              className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm disabled:opacity-70"
              rows={3}
              value={form.description}
              readOnly={!canManage}
              disabled={!canManage}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Internal session notes"
            />
          </label>
          {!isExternal ? (
            <Select
              label="Client studio"
              value={form.clientOrganizationId}
              disabled={!canManage}
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
            disabled={!canManage}
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
            disabled={!canManage}
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
