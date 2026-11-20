'use client';

import Link from 'next/link';
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import { BuiltByColabdeck } from '@/components/public-booking/BuiltByColabdeck';
import '@/components/public-booking/public-booking.css';
import {
  createPublicBookingRequest,
  fetchPublicSlots,
  fetchPublicStudio,
  publicBookingAssetUrl,
  type PublicSessionType,
  type PublicStudioProfile,
} from '@/lib/public-booking-api';

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59),
  );
}

function formatSlotTime(iso: string, timeZone: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  });
}

function monthCells(anchor: Date) {
  const first = startOfMonth(anchor);
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - first.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return day;
  });
}

function dayKeyFromDate(date: Date) {
  return date.toLocaleDateString('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

interface PublicBookFlowProps {
  slug: string;
  /** When true, show Built by Colabdeck footer (public page). */
  showAttribution?: boolean;
  /** Optional lead above the card (hub preview). */
  lead?: string | null;
  /** Compact layout for website iframe embeds. */
  embed?: boolean;
  onSubmitted?: () => void;
}

export function PublicBookFlow({
  slug,
  showAttribution = true,
  lead = null,
  embed = false,
  onSubmitted,
}: PublicBookFlowProps) {
  const [profile, setProfile] = useState<PublicStudioProfile | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [manageToken, setManageToken] = useState<string | null>(null);

  const timeZone = profile?.timezone || 'UTC';
  const sessionTypes: PublicSessionType[] = profile?.sessionTypes?.length
    ? profile.sessionTypes
    : [
        {
          id: 'default',
          name: 'Session',
          durationMinutes: profile?.slotDurationMinutes ?? 60,
        },
      ];
  const selectedType =
    sessionTypes.find((type) => type.id === selectedTypeId) ??
    sessionTypes[0] ??
    null;

  const brandStyle = {
    ['--sb-br' as string]: profile?.primaryColor || undefined,
    ['--sb-soft' as string]: profile?.secondaryColor
      ? `${profile.secondaryColor}33`
      : undefined,
    background: profile?.backgroundColor || undefined,
  } as CSSProperties;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);
    setProfile(null);
    setSubmitted(false);
    void fetchPublicStudio(slug)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setSelectedTypeId(data.sessionTypes?.[0]?.id ?? 'default');
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Booking page not found',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!profile || !selectedType) return;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      setSlotsLoading(true);
      try {
        const from = startOfMonth(monthAnchor).toISOString();
        const to = endOfMonth(monthAnchor).toISOString();
        const data = await fetchPublicSlots(slug, from, to, {
          sessionTypeId:
            selectedType.id === 'default' ? undefined : selectedType.id,
          durationMinutes: selectedType.durationMinutes,
        });
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
  }, [
    profile,
    monthAnchor,
    slug,
    selectedType?.id,
    selectedType?.durationMinutes,
  ]);

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
  const cells = monthCells(monthAnchor);
  const monthLabel = monthAnchor.toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedSlot || !guestName.trim() || !guestEmail.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await createPublicBookingRequest(slug, {
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        notes: notes.trim() || undefined,
        startsAt: selectedSlot,
        sessionTypeId:
          selectedType && selectedType.id !== 'default'
            ? selectedType.id
            : undefined,
        website: honeypot,
      });
      setManageToken(result.manageToken);
      setSubmitted(true);
      onSubmitted?.();
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
      <div className={`sb-wrap${embed ? ' sb-wrap--embed' : ''}`} style={brandStyle}>
        <p className="sb-status">Loading booking page…</p>
        {showAttribution && !embed ? <BuiltByColabdeck /> : null}
      </div>
    );
  }

  if (errorMessage && !profile) {
    return (
      <div className={`sb-wrap${embed ? ' sb-wrap--embed' : ''}`} style={brandStyle}>
        <div className="sb-card">
          <h1>Booking unavailable</h1>
          <p className="sb-lead">{errorMessage}</p>
        </div>
        {showAttribution && !embed ? <BuiltByColabdeck /> : null}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={`sb-wrap${embed ? ' sb-wrap--embed' : ''}`} style={brandStyle}>
        <div className="sb-card">
          <div className="sb-ok" aria-hidden>
            ✓
          </div>
          <p className="sb-status success">Request sent</p>
          <h2 style={{ margin: '0.5rem 0' }}>
            Thanks{guestName ? `, ${guestName}` : ''}
          </h2>
          <p className="sb-lead">
            Your session is held while {profile?.studioName} confirms it. In the
            studio view it now appears under Projects, in the Inquiry column.
          </p>
          <div className="sb-actions">
            {manageToken && showAttribution && !embed ? (
              <Link className="sb-btn" href={`/book/manage/${manageToken}`}>
                Manage your request
              </Link>
            ) : null}
            <button
              type="button"
              className="sb-btn"
              onClick={() => {
                setSubmitted(false);
                setManageToken(null);
                setSelectedSlot(null);
                setSelectedDay(null);
                setNotes('');
              }}
            >
              Book another session
            </button>
          </div>
        </div>
        {showAttribution ? <BuiltByColabdeck /> : null}
      </div>
    );
  }

  return (
    <div className={`sb-wrap${embed ? ' sb-wrap--embed' : ''}`} style={brandStyle}>
      {lead ? <p className="sb-lead">{lead}</p> : null}
      <div className="sb-card">
        {profile?.hasBanner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicBookingAssetUrl(
              slug,
              'banner',
              profile.bannerUpdatedAt,
            )}
            alt=""
            className="sb-banner"
          />
        ) : null}
        <header className="sb-hero">
          {profile?.hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={publicBookingAssetUrl(slug, 'logo', profile.logoUpdatedAt)}
              alt=""
              className="sb-logo"
            />
          ) : null}
          <h1>{profile?.studioName}</h1>
          <p>{profile?.title || 'Book a session online'}</p>
        </header>

        {profile?.description ? (
          <p className="sb-lead">{profile.description}</p>
        ) : null}

        <p className="sb-section-label">1. Choose a session</p>
        <div className="sb-chips" role="group" aria-label="Session types">
          {sessionTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              className={`sb-chip${selectedType?.id === type.id ? ' on' : ''}`}
              aria-pressed={selectedType?.id === type.id}
              onClick={() => {
                setSelectedTypeId(type.id);
                setSelectedSlot(null);
              }}
            >
              {type.name}
              <small>{type.durationMinutes} min</small>
            </button>
          ))}
        </div>

        <p className="sb-section-label">2. Pick a date</p>
        <div className="sb-cal-nav">
          <button
            type="button"
            className="sb-ib"
            aria-label="Previous month"
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
            ‹
          </button>
          <strong>{monthLabel}</strong>
          <button
            type="button"
            className="sb-ib"
            aria-label="Next month"
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
            ›
          </button>
        </div>

        {slotsLoading ? (
          <p className="sb-status">Loading available times…</p>
        ) : (
          <div className="sb-cg" role="grid" aria-label="Available days">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
              <i key={`${label}-${index}`}>{label}</i>
            ))}
            {cells.map((day) => {
              const key = dayKeyFromDate(day);
              const inMonth =
                day.getUTCMonth() === monthAnchor.getUTCMonth() &&
                day.getUTCFullYear() === monthAnchor.getUTCFullYear();
              const daySlots = slotsByDay.get(key) ?? [];
              const hasSlots = daySlots.length > 0;
              const isSelected = selectedDay === key;
              return (
                <button
                  key={key + String(day.getTime())}
                  type="button"
                  className={`sb-dy${hasSlots ? ' has' : ''}${
                    isSelected ? ' on' : ''
                  }`}
                  disabled={!inMonth || !hasSlots}
                  onClick={() => {
                    setSelectedDay(key);
                    setSelectedSlot(null);
                  }}
                >
                  {day.getUTCDate()}
                  {hasSlots ? <em>{daySlots.length}</em> : null}
                </button>
              );
            })}
          </div>
        )}

        {selectedDay ? (
          <>
            <p className="sb-section-label">3. Pick a time</p>
            <div className="sb-chips" role="group" aria-label="Available times">
              {selectedDaySlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={`sb-chip${selectedSlot === slot ? ' on' : ''}`}
                  aria-pressed={selectedSlot === slot}
                  onClick={() => setSelectedSlot(slot)}
                >
                  {formatSlotTime(slot, timeZone)}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {selectedSlot ? (
          <form
            className="sb-frm"
            onSubmit={(event) => void handleSubmit(event)}
            noValidate
          >
            <p className="sb-section-label">4. Your details</p>
            <label className="sb-field">
              <span>Full name</span>
              <input
                required
                autoComplete="name"
                placeholder="Full name"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
              />
            </label>
            <label className="sb-field">
              <span>Email</span>
              <input
                required
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={guestEmail}
                onChange={(event) => setGuestEmail(event.target.value)}
              />
            </label>
            <label className="sb-field">
              <span>Notes</span>
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Anything we should know?"
              />
            </label>
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
              style={{
                position: 'absolute',
                left: '-9999px',
                opacity: 0,
                height: 0,
              }}
            />
            {errorMessage ? (
              <p className="sb-status error" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <button type="submit" className="sb-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Sending…' : 'Request booking'}
            </button>
          </form>
        ) : null}
      </div>
      {showAttribution ? <BuiltByColabdeck /> : null}
    </div>
  );
}
