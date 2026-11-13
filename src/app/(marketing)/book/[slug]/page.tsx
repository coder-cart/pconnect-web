'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  createPublicBookingRequest,
  fetchPublicSlots,
  fetchPublicStudio,
  type PublicStudioProfile,
} from '@/lib/public-booking-api';
import { SITE_NAME } from '@/lib/marketing/site';

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59),
  );
}

function formatDayLabel(dayKey: string, timeZone: string) {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone,
  });
}

function formatSlotTime(iso: string, timeZone: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  });
}

export default function PublicBookPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [profile, setProfile] = useState<PublicStudioProfile | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [manageToken, setManageToken] = useState<string | null>(null);

  const timeZone = profile?.timezone || 'UTC';

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await fetchPublicStudio(slug);
        if (!cancelled) setProfile(data);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Booking page not found',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      setSlotsLoading(true);
      try {
        const from = startOfMonth(monthAnchor).toISOString();
        const to = endOfMonth(monthAnchor).toISOString();
        const data = await fetchPublicSlots(slug, from, to);
        if (!cancelled) {
          setSlots(data.slots);
          setSelectedDay(null);
          setSelectedSlot(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load slots',
          );
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profile, monthAnchor, slug]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const slot of slots) {
      const key = new Date(slot).toLocaleDateString('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return map;
  }, [slots, timeZone]);

  const selectedDaySlots = selectedDay
    ? slotsByDay.get(selectedDay) ?? []
    : [];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedSlot || !guestName.trim() || !guestEmail.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await createPublicBookingRequest(slug, {
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        startsAt: selectedSlot,
        website: honeypot,
      });
      setManageToken(result.manageToken);
      setSubmitted(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to submit request',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <section className="mk-shell" style={{ paddingTop: '2.5rem' }}>
        <p className="mk-form__status">Loading booking page…</p>
      </section>
    );
  }

  if (errorMessage && !profile) {
    return (
      <section className="mk-shell" style={{ paddingTop: '2.5rem' }}>
        <div className="mk-demo-card" style={{ maxWidth: 480, margin: '0 auto' }}>
          <h1>Booking unavailable</h1>
          <p>{errorMessage}</p>
          <Link className="mk-btn mk-btn--outline" href="/book-a-demo">
            Explore {SITE_NAME}
          </Link>
        </div>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="mk-shell" style={{ paddingTop: '2.5rem' }}>
        <div className="mk-demo-card" style={{ maxWidth: 520, margin: '0 auto' }}>
          <p className="mk-form__status mk-form__status--success">
            Request sent
          </p>
          <h1 style={{ marginTop: '0.75rem' }}>Thanks{guestName ? `, ${guestName}` : ''}</h1>
          <p>
            {profile?.studioName} will review your booking request and follow up
            at <strong>{guestEmail}</strong>.
          </p>
          {manageToken ? (
            <p style={{ marginTop: '1rem' }}>
              <Link className="mk-btn" href={`/book/manage/${manageToken}`}>
                Manage your request
              </Link>
            </p>
          ) : null}
          <p className="mk-form__privacy" style={{ marginTop: '1.5rem' }}>
            Powered by <Link href="/">{SITE_NAME}</Link>
            {' · '}
            <Link href="/book-a-demo">Book a product demo</Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mk-shell mk-demo-layout" style={{ paddingTop: '2.5rem' }}>
      <div className="mk-demo-panel">
        <p style={{ fontSize: '0.8rem', letterSpacing: '0.06em', opacity: 0.7 }}>
          PUBLIC STUDIO BOOKING
        </p>
        <h1>{profile?.title}</h1>
        <p>
          {profile?.description ||
            `Request a session with ${profile?.studioName}. The studio confirms before anything is booked.`}
        </p>
        <ul>
          <li>{profile?.slotDurationMinutes}-minute sessions</li>
          <li>Times shown in {timeZone}</li>
          <li>You will get an email when the studio responds</li>
        </ul>
        <p className="mk-form__privacy" style={{ marginTop: '1.5rem' }}>
          Powered by <strong>{SITE_NAME}</strong> —{' '}
          <Link href="/book-a-demo">see how studios use Colabdeck</Link>
        </p>
      </div>

      <div className="mk-demo-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <button
            type="button"
            className="mk-btn mk-btn--ghost mk-btn--sm"
            onClick={() =>
              setMonthAnchor(
                new Date(
                  Date.UTC(
                    monthAnchor.getUTCFullYear(),
                    monthAnchor.getUTCMonth() - 1,
                    1,
                  ),
                ),
              )
            }
          >
            Previous
          </button>
          <strong>
            {monthAnchor.toLocaleString(undefined, {
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            })}
          </strong>
          <button
            type="button"
            className="mk-btn mk-btn--ghost mk-btn--sm"
            onClick={() =>
              setMonthAnchor(
                new Date(
                  Date.UTC(
                    monthAnchor.getUTCFullYear(),
                    monthAnchor.getUTCMonth() + 1,
                    1,
                  ),
                ),
              )
            }
          >
            Next
          </button>
        </div>

        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>1. Pick a day</p>
        {slotsLoading ? (
          <p className="mk-form__status">Loading available times…</p>
        ) : Array.from(slotsByDay.keys()).length === 0 ? (
          <p className="mk-form__status">No open slots this month. Try next month.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {Array.from(slotsByDay.keys()).map((day) => (
              <button
                key={day}
                type="button"
                className={`mk-btn mk-btn--sm ${
                  selectedDay === day ? '' : 'mk-btn--outline'
                }`}
                onClick={() => {
                  setSelectedDay(day);
                  setSelectedSlot(null);
                }}
              >
                {formatDayLabel(day, timeZone)}
              </button>
            ))}
          </div>
        )}

        {selectedDay ? (
          <div style={{ marginTop: '1.25rem' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>2. Pick a time</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {selectedDaySlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={`mk-btn mk-btn--sm ${
                    selectedSlot === slot ? '' : 'mk-btn--outline'
                  }`}
                  onClick={() => setSelectedSlot(slot)}
                >
                  {formatSlotTime(slot, timeZone)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form
          className="mk-form"
          onSubmit={(event) => void handleSubmit(event)}
          style={{ marginTop: '1.5rem' }}
          noValidate
        >
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
            3. Your details
          </p>
          <label className="mk-field">
            <span>
              Name <abbr title="required">*</abbr>
            </span>
            <input
              required
              autoComplete="name"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
            />
          </label>
          <label className="mk-field">
            <span>
              Email <abbr title="required">*</abbr>
            </span>
            <input
              required
              type="email"
              autoComplete="email"
              value={guestEmail}
              onChange={(event) => setGuestEmail(event.target.value)}
            />
          </label>
          <label className="mk-field">
            <span>Phone</span>
            <input
              autoComplete="tel"
              value={guestPhone}
              onChange={(event) => setGuestPhone(event.target.value)}
            />
          </label>
          <label className="mk-field">
            <span>What do you need?</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Shoot type, location, or anything the studio should know"
            />
          </label>
          <input
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
          />
          {selectedSlot ? (
            <p className="mk-form__privacy">
              Selected:{' '}
              {formatDayLabel(
                selectedDay ?? selectedSlot.slice(0, 10),
                timeZone,
              )}{' '}
              at {formatSlotTime(selectedSlot, timeZone)}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mk-form__status mk-form__status--error" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <button
            type="submit"
            className="mk-btn"
            disabled={isSubmitting || !selectedSlot}
          >
            {isSubmitting ? 'Sending…' : 'Request booking'}
          </button>
        </form>
      </div>
    </section>
  );
}
