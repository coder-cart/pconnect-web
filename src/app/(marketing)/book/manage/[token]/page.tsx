'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  cancelManagedBooking,
  fetchManagedBooking,
  rescheduleManagedBooking,
  type GuestBookingRequest,
} from '@/lib/public-booking-api';
import { SITE_NAME } from '@/lib/marketing/site';

function statusLabel(status: string) {
  return status.replaceAll('_', ' ');
}

function paramValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default function ManageBookingPage() {
  const params = useParams<{ token: string }>();
  const token = paramValue(params.token);
  const [request, setRequest] = useState<GuestBookingRequest | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  async function reload() {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      const data = await fetchManagedBooking(token);
      setRequest(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to refresh',
      );
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setRequest(null);
    void fetchManagedBooking(token)
      .then((data) => {
        if (!cancelled) setRequest(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Request not found',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleCancel() {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      const data = await cancelManagedBooking(token);
      setRequest(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to cancel',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAcceptProposal() {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      const data = await rescheduleManagedBooking(token, {
        acceptProposal: true,
      });
      setRequest(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to accept proposal',
      );
    } finally {
      setIsBusy(false);
    }
  }

  if (isLoading) {
    return (
      <section className="mk-shell" style={{ paddingTop: '2.5rem' }}>
        <p className="mk-form__status">Loading booking…</p>
      </section>
    );
  }

  if (!request) {
    return (
      <section className="mk-shell" style={{ paddingTop: '2.5rem' }}>
        <div className="mk-demo-card" style={{ maxWidth: 480, margin: '0 auto' }}>
          <h1>Booking not found</h1>
          <p>{errorMessage}</p>
          <Link className="mk-btn mk-btn--outline" href="/">
            {SITE_NAME}
          </Link>
        </div>
      </section>
    );
  }

  const canAct =
    request.status === 'pending' || request.status === 'reschedule_proposed';

  return (
    <section className="mk-shell" style={{ paddingTop: '2.5rem' }}>
      <div className="mk-demo-card" style={{ maxWidth: 560, margin: '0 auto' }}>
        <p style={{ fontSize: '0.8rem', letterSpacing: '0.06em', opacity: 0.7 }}>
          BOOKING REQUEST
        </p>
        <h1>{request.studioName}</h1>
        <p>
          Status: <strong>{statusLabel(request.status)}</strong>
        </p>
        <p>
          Requested:{' '}
          {new Date(request.requestedStartsAt).toLocaleString()} –{' '}
          {new Date(request.requestedEndsAt).toLocaleTimeString()}
        </p>
        {request.proposedStartsAt && request.proposedEndsAt ? (
          <p>
            Studio proposed:{' '}
            <strong>
              {new Date(request.proposedStartsAt).toLocaleString()} –{' '}
              {new Date(request.proposedEndsAt).toLocaleTimeString()}
            </strong>
          </p>
        ) : null}
        {request.rejectionReason ? (
          <p>Reason: {request.rejectionReason}</p>
        ) : null}
        {errorMessage ? (
          <p className="mk-form__status mk-form__status--error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginTop: '1.25rem',
          }}
        >
          {request.status === 'reschedule_proposed' ? (
            <button
              type="button"
              className="mk-btn"
              disabled={isBusy}
              onClick={() => void handleAcceptProposal()}
            >
              Accept proposed time
            </button>
          ) : null}
          {canAct ? (
            <button
              type="button"
              className="mk-btn mk-btn--outline"
              disabled={isBusy}
              onClick={() => void handleCancel()}
            >
              Cancel request
            </button>
          ) : null}
          <button
            type="button"
            className="mk-btn mk-btn--ghost"
            disabled={isBusy}
            onClick={() => void reload()}
          >
            Refresh
          </button>
        </div>

        <p className="mk-form__privacy" style={{ marginTop: '1.5rem' }}>
          Powered by <Link href="/">{SITE_NAME}</Link>
        </p>
      </div>
    </section>
  );
}
