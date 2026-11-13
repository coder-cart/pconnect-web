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

export default function PublicBookPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [profile, setProfile] = useState<PublicStudioProfile | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manageToken, setManageToken] = useState<string | null>(null);

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
      try {
        const from = startOfMonth(monthAnchor).toISOString();
        const to = endOfMonth(monthAnchor).toISOString();
        const data = await fetchPublicSlots(slug, from, to);
        if (!cancelled) {
          setSlots(data.slots);
          setSelectedSlot(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load slots',
          );
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profile, monthAnchor, slug]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const slot of slots) {
      const key = slot.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return map;
  }, [slots]);

  const selectedDaySlots = selectedSlot
    ? slotsByDay.get(selectedSlot.slice(0, 10)) ?? []
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
        <p>Loading booking page…</p>
      </section>
    );
  }

  if (errorMessage && !profile) {
    return (
      <section className="mk-shell" style={{ paddingTop: '2.5rem' }}>
        <h1>Booking unavailable</h1>
        <p>{errorMessage}</p>
        <Link href="/book-a-demo">Explore {SITE_NAME}</Link>
      </section>
    );
  }

  if (manageToken) {
    return (
      <section className="mk-shell" style={{ paddingTop: '2.5rem' }}>
        <div className="mk-demo-card" style={{ maxWidth: 520, margin: '0 auto' }}>
          <h1>Request sent</h1>
          <p>
            Thanks{guestName ? `, ${guestName}` : ''}. {profile?.studioName} will
            review your booking request and email you at {guestEmail}.
          </p>
          <p>
            <Link href={`/book/manage/${manageToken}`}>Manage your request</Link>
          </p>
          <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
            Powered by <Link href="/">{SITE_NAME}</Link> —{' '}
            <Link href="/book-a-demo">Book a product demo</Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mk-shell" style={{ paddingTop: '2.5rem' }}>
      <div
        style={{
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
        }}
      >
        <div className="mk-demo-panel">
          <p style={{ fontSize: '0.85rem', letterSpacing: '0.04em' }}>
            PUBLIC STUDIO BOOKING
          </p>
          <h1>{profile?.title}</h1>
          <p>{profile?.description || `Request a session with ${profile?.studioName}.`}</p>
          <p style={{ fontSize: '0.9rem' }}>
            Duration: {profile?.slotDurationMinutes} minutes · Times shown in{' '}
            {profile?.timezone}
          </p>
          <p style={{ marginTop: '2rem', fontSize: '0.9rem' }}>
            Powered by <strong>{SITE_NAME}</strong>. Studios run scheduling on
            Colabdeck — <Link href="/book-a-demo">see how it works</Link>.
          </p>
        </div>

        <div className="mk-demo-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <button
              type="button"
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
              Prev
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

          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontWeight: 600 }}>Available days</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {Array.from(slotsByDay.keys()).length === 0 ? (
                <p>No open slots this month.</p>
              ) : (
                Array.from(slotsByDay.keys()).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedSlot(slotsByDay.get(day)?.[0] ?? null)}
                    style={{
                      padding: '0.4rem 0.7rem',
                      borderRadius: 8,
                      border:
                        selectedSlot?.startsWith(day)
                          ? '1px solid #0f766e'
                          : '1px solid #d4d4d8',
                      background: selectedSlot?.startsWith(day)
                        ? '#ccfbf1'
                        : '#fff',
                    }}
                  >
                    {day}
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedSlot ? (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontWeight: 600 }}>Times</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {selectedDaySlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    style={{
                      padding: '0.4rem 0.7rem',
                      borderRadius: 8,
                      border:
                        selectedSlot === slot
                          ? '1px solid #0f766e'
                          : '1px solid #d4d4d8',
                      background: selectedSlot === slot ? '#ccfbf1' : '#fff',
                    }}
                  >
                    {new Date(slot).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZone: 'UTC',
                    })}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <form
            onSubmit={(event) => void handleSubmit(event)}
            style={{ marginTop: '1.25rem', display: 'grid', gap: '0.75rem' }}
          >
            <label>
              Name
              <input
                required
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={guestEmail}
                onChange={(event) => setGuestEmail(event.target.value)}
              />
            </label>
            <label>
              Phone
              <input
                value={guestPhone}
                onChange={(event) => setGuestPhone(event.target.value)}
              />
            </label>
            <label>
              Details
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
              style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
            />
            {errorMessage ? <p style={{ color: '#b91c1c' }}>{errorMessage}</p> : null}
            <button
              type="submit"
              disabled={isSubmitting || !selectedSlot}
            >
              {isSubmitting ? 'Sending…' : 'Request booking'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
