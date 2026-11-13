'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/StatePanels';

interface BookingRequestItem {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  notes?: string | null;
  status: string;
  requestedStartsAt: string;
  requestedEndsAt: string;
  proposedStartsAt?: string | null;
  proposedEndsAt?: string | null;
  clientOrganization: { id: string; name: string };
}

interface BookingRequestsPanelProps {
  highlightId?: string | null;
  onChanged?: () => void;
}

export function BookingRequestsPanel({
  highlightId,
  onChanged,
}: BookingRequestsPanelProps) {
  const [items, setItems] = useState<BookingRequestItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [proposeForId, setProposeForId] = useState<string | null>(null);
  const [proposeStartsAt, setProposeStartsAt] = useState('');
  const [proposeEndsAt, setProposeEndsAt] = useState('');

  async function load() {
    setErrorMessage(null);
    try {
      const response = await apiRequest<
        ApiResponse<{ items: BookingRequestItem[] }>
      >('/booking-requests?status=pending');
      const pending = response.data.items ?? [];
      const proposed = await apiRequest<
        ApiResponse<{ items: BookingRequestItem[] }>
      >('/booking-requests?status=reschedule_proposed');
      setItems([...(pending ?? []), ...(proposed.data.items ?? [])]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load requests',
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await apiRequest(`/booking-requests/${id}/approve`, { method: 'POST' });
      await load();
      onChanged?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to approve',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    try {
      await apiRequest(`/booking-requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await load();
      onChanged?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to reject',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function propose(id: string) {
    if (!proposeStartsAt || !proposeEndsAt) return;
    setBusyId(id);
    try {
      await apiRequest(`/booking-requests/${id}/propose`, {
        method: 'POST',
        body: JSON.stringify({
          startsAt: new Date(proposeStartsAt).toISOString(),
          endsAt: new Date(proposeEndsAt).toISOString(),
        }),
      });
      setProposeForId(null);
      await load();
      onChanged?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to propose time',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card padding="md" className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          Booking requests
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Approve to create a confirmed studio calendar event. Reject or propose
          another time without creating an event.
        </p>
      </div>
      {errorMessage ? (
        <p className="text-xs text-[var(--danger)]">{errorMessage}</p>
      ) : null}
      {items.length === 0 ? (
        <EmptyState
          title="No open requests"
          description="Public booking requests appear here for review."
        />
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <li
              key={item.id}
              className={`space-y-2 py-3 ${
                highlightId === item.id ? 'bg-[var(--primary-soft)]/40 px-2' : ''
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {item.guestName} · {item.clientOrganization.name}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {item.guestEmail}
                    {item.guestPhone ? ` · ${item.guestPhone}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {new Date(item.requestedStartsAt).toLocaleString()} –{' '}
                    {new Date(item.requestedEndsAt).toLocaleTimeString()}
                  </p>
                  {item.notes ? (
                    <p className="mt-1 text-xs text-[var(--muted)]">{item.notes}</p>
                  ) : null}
                </div>
                <Badge variant="warning">
                  {item.status.replaceAll('_', ' ')}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busyId === item.id}
                  onClick={() => void approve(item.id)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === item.id}
                  onClick={() => void reject(item.id)}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busyId === item.id}
                  onClick={() => {
                    setProposeForId(item.id);
                    setProposeStartsAt(item.requestedStartsAt.slice(0, 16));
                    setProposeEndsAt(item.requestedEndsAt.slice(0, 16));
                  }}
                >
                  Propose time
                </Button>
              </div>
              {proposeForId === item.id ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    label="Proposed start"
                    type="datetime-local"
                    value={proposeStartsAt}
                    onChange={(event) => setProposeStartsAt(event.target.value)}
                  />
                  <Input
                    label="Proposed end"
                    type="datetime-local"
                    value={proposeEndsAt}
                    onChange={(event) => setProposeEndsAt(event.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={busyId === item.id}
                    onClick={() => void propose(item.id)}
                  >
                    Send proposal
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
