'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { BookingSettingsPanel } from '@/components/booking/BookingSettingsPanel';
import { PublicBookingSettingsPanel } from '@/components/booking/PublicBookingSettingsPanel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ErrorState } from '@/components/ui/StatePanels';
import { ListSkeleton } from '@/components/ui/Skeleton';

interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  booked: boolean;
  bookingRequestId: string | null;
  startsAt: string | null;
}

interface BookingSettingsSummary {
  exists: boolean;
  enabled: boolean;
  publicUrl: string | null;
  publicSlug: string | null;
}

interface StudioAvailabilityPanelProps {
  clientOrganizationId: string;
  onPreviewAsClient: () => void;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthCells(anchor: Date) {
  const first = startOfMonth(anchor);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function tomorrowKey() {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() + 1);
  return formatDateKey(day);
}

export function StudioAvailabilityPanel({
  clientOrganizationId,
  onPreviewAsClient,
}: StudioAvailabilityPanelProps) {
  const [settings, setSettings] = useState<BookingSettingsSummary | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(tomorrowKey);
  const [newTime, setNewTime] = useState('10:00');
  const [newDuration, setNewDuration] = useState(60);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const range = useMemo(() => {
    const from = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const to = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
    // include next month days shown in grid + repeat window buffer
    to.setDate(to.getDate() + 35);
    return {
      from: formatDateKey(from),
      to: formatDateKey(to),
    };
  }, [monthAnchor]);

  async function loadSettings() {
    const response = await apiRequest<ApiResponse<BookingSettingsSummary>>(
      `/clients/${clientOrganizationId}/booking-settings`,
    );
    setSettings(response.data);
    return response.data;
  }

  async function loadSlots() {
    const params = new URLSearchParams({
      from: range.from,
      to: range.to,
    });
    const response = await apiRequest<
      ApiResponse<{ items: AvailabilitySlot[] }>
    >(`/clients/${clientOrganizationId}/availability-slots?${params}`);
    setSlots(response.data.items ?? []);
  }

  async function refresh() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const nextSettings = await loadSettings();
      if (nextSettings.exists) {
        await loadSlots();
      } else {
        setSlots([]);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load availability',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientOrganizationId, range.from, range.to]);

  const today = useMemo(() => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    return day;
  }, []);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    for (const slot of slots) {
      const list = map.get(slot.date) ?? [];
      list.push(slot);
      map.set(slot.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [slots]);

  const selectedSlots = slotsByDay.get(selectedDate) ?? [];
  const openCountByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const [date, list] of slotsByDay) {
      map.set(date, list.filter((slot) => !slot.booked).length);
    }
    return map;
  }, [slotsByDay]);

  const selectedLabel = useMemo(() => {
    const date = new Date(`${selectedDate}T12:00:00`);
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, [selectedDate]);

  async function enableBooking() {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/clients/${clientOrganizationId}/booking-settings/enable`, {
        method: 'POST',
      });
      await refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to enable booking',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function addSlot() {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/clients/${clientOrganizationId}/availability-slots`, {
        method: 'POST',
        body: JSON.stringify({
          date: selectedDate,
          startTime: newTime,
          durationMinutes: newDuration,
        }),
      });
      await loadSlots();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to add slot',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function removeSlot(slotId: string) {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await apiRequest(
        `/clients/${clientOrganizationId}/availability-slots/${slotId}`,
        { method: 'DELETE' },
      );
      await loadSlots();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to remove slot',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function bulk(action: 'standard' | 'repeat' | 'clearOpen') {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<
        ApiResponse<{ items: AvailabilitySlot[] }>
      >(`/clients/${clientOrganizationId}/availability-slots/bulk`, {
        method: 'POST',
        body: JSON.stringify({ action, date: selectedDate }),
      });
      setSlots(response.data.items ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update slots',
      );
    } finally {
      setIsBusy(false);
    }
  }

  if (isLoading) return <ListSkeleton rows={5} />;
  if (errorMessage && !settings) {
    return (
      <ErrorState title="Unable to load availability" description={errorMessage} />
    );
  }

  if (!settings?.exists || !settings.enabled) {
    return (
      <Card padding="md" className="space-y-3">
        <p className="text-sm text-[var(--muted)]">
          Enable public booking for this studio, then post the dates and times
          you are open.
        </p>
        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
        <Button disabled={isBusy} onClick={() => void enableBooking()}>
          Enable public booking
        </Button>
      </Card>
    );
  }

  const cells = monthCells(monthAnchor);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        Post the dates and times you are open. Clients book straight from your
        link, and booked slots lock automatically.
      </p>

      <Card
        padding="sm"
        className="flex flex-wrap items-center gap-2"
      >
        <p className="mr-auto min-w-0 truncate text-sm font-medium text-[var(--foreground)]">
          {settings.publicUrl}
          <span className="ml-2 font-normal text-[var(--muted)]">
            (public link)
          </span>
        </p>
        <Button
          size="sm"
          variant="secondary"
          disabled={!settings.publicUrl}
          onClick={async () => {
            if (!settings.publicUrl) return;
            await navigator.clipboard.writeText(settings.publicUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        <Button size="sm" onClick={onPreviewAsClient}>
          Preview as client
        </Button>
      </Card>

      {errorMessage ? (
        <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="secondary"
              aria-label="Previous month"
              onClick={() =>
                setMonthAnchor(
                  new Date(
                    monthAnchor.getFullYear(),
                    monthAnchor.getMonth() - 1,
                    1,
                  ),
                )
              }
            >
              ‹
            </Button>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {monthAnchor.toLocaleString(undefined, {
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <Button
              size="sm"
              variant="secondary"
              aria-label="Next month"
              onClick={() =>
                setMonthAnchor(
                  new Date(
                    monthAnchor.getFullYear(),
                    monthAnchor.getMonth() + 1,
                    1,
                  ),
                )
              }
            >
              ›
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
              <span
                key={`${label}-${index}`}
                className="text-xs font-medium text-[var(--muted)]"
              >
                {label}
              </span>
            ))}
            {cells.map((day) => {
              const key = formatDateKey(day);
              const inMonth = day.getMonth() === monthAnchor.getMonth();
              const past = day < today;
              const openCount = openCountByDay.get(key) ?? 0;
              const selected = selectedDate === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!inMonth || past}
                  onClick={() => setSelectedDate(key)}
                  className={[
                    'relative aspect-[1/0.9] min-h-[44px] rounded-[12px] border text-sm font-semibold transition-colors',
                    selected
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                      : openCount > 0
                        ? 'border-[var(--border)] bg-[var(--info-soft)] text-[var(--foreground)]'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]',
                    (!inMonth || past) && 'cursor-default opacity-35',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {day.getDate()}
                  {openCount > 0 ? (
                    <em
                      className={[
                        'absolute bottom-1 right-1 not-italic text-[10px] font-bold',
                        selected ? 'text-white' : 'text-[var(--success)]',
                      ].join(' ')}
                    >
                      {openCount}
                    </em>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Card>

        <Card padding="md" className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            {selectedLabel}
          </h3>

          {selectedSlots.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No slots yet. Add one below.
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedSlots.map((slot) => (
                <li
                  key={slot.id}
                  className="flex items-center gap-3 rounded-[12px] bg-[var(--surface-muted)] px-3 py-2"
                >
                  <b className="min-w-[3.5rem] text-sm">{slot.startTime}</b>
                  <span className="mr-auto text-sm text-[var(--muted)]">
                    {slot.durationMinutes} min
                  </span>
                  <span
                    className={[
                      'text-xs font-bold',
                      slot.booked
                        ? 'text-[var(--warning)]'
                        : 'text-[var(--success)]',
                    ].join(' ')}
                  >
                    {slot.booked ? 'Booked' : 'Open'}
                  </span>
                  {!slot.booked ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove slot ${slot.startTime}`}
                      disabled={isBusy}
                      onClick={() => void removeSlot(slot.id)}
                    >
                      ×
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            <Input
              type="time"
              value={newTime}
              onChange={(event) => setNewTime(event.target.value)}
              aria-label="Start time"
            />
            <Select
              value={String(newDuration)}
              onChange={(event) => setNewDuration(Number(event.target.value))}
              aria-label="Duration"
              options={[
                { value: '30', label: '30 min' },
                { value: '60', label: '60 min' },
                { value: '90', label: '90 min' },
              ]}
            />
            <Button disabled={isBusy} onClick={() => void addSlot()}>
              Add slot
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={isBusy}
              onClick={() => void bulk('standard')}
            >
              Add 3 standard slots
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={isBusy}
              onClick={() => void bulk('repeat')}
            >
              Repeat for next 4 weeks
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={isBusy}
              onClick={() => void bulk('clearOpen')}
            >
              Clear open slots
            </Button>
          </div>
        </Card>
      </div>

      <PublicBookingSettingsPanel
        clientOrganizationId={clientOrganizationId}
      />

      <div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowRules((current) => !current)}
        >
          {showRules ? 'Hide session rules' : 'Edit session rules'}
        </Button>
        {showRules ? (
          <div className="mt-3">
            <BookingSettingsPanel clientOrganizationId={clientOrganizationId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
