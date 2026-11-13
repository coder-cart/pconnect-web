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

export default function ManageBookingPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [request, setRequest] = useState<GuestBookingRequest | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  async function reload() {
    const data = await fetchManagedBooking(token);
    setRequest(data);
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      setIsLoading(true);
      try {
        const data = await fetchManagedBooking(token);
        if (!cancelled) setRequest(data);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Request not found',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
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
        <p>Loading booking…</p>
      </section>
    );
  }

  if (!request) {
    return (
      <section className="mk-shell" style={{ paddingTop: '2.5rem' }}>
        <h1>Booking not found</h1>
        <p>{errorMessage}</p>
        <Link href="/">{SITE_NAME}</Link>
      </section>
    );
  }

  return (
    <section className="mk-shell" style={{ paddingTop: '2.5rem' }}>
      <div className="mk-demo-card" style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1>{request.studioName}</h1>
        <p>
          Status: <strong>{request.status.replaceAll('_', ' ')}</strong>
        </p>
        <p>
          Requested:{' '}
          {new Date(request.requestedStartsAt).toUTCString()} –{' '}
          {new Date(request.requestedEndsAt).toUTCString()}
        </p>
        {request.proposedStartsAt && request.proposedEndsAt ? (
          <p>
            Proposed:{' '}
            {new Date(request.proposedStartsAt).toUTCString()} –{' '}
            {new Date(request.proposedEndsAt).toUTCString()}
          </p>
        ) : null}
        {request.rejectionReason ? (
          <p>Reason: {request.rejectionReason}</p>
        ) : null}
        {errorMessage ? <p style={{ color: '#b91c1c' }}>{errorMessage}</p> : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {request.status === 'reschedule_proposed' ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleAcceptProposal()}
            >
              Accept proposed time
            </button>
          ) : null}
          {request.status === 'pending' ||
          request.status === 'reschedule_proposed' ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleCancel()}
            >
              Cancel request
            </button>
          ) : null}
          <button type="button" disabled={isBusy} onClick={() => void reload()}>
            Refresh
          </button>
        </div>

        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
          Powered by <Link href="/">{SITE_NAME}</Link>
        </p>
      </div>
    </section>
  );
}
