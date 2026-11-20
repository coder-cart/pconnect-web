'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BuiltByColabdeck } from '@/components/public-booking/BuiltByColabdeck';
import {
  cancelManagedBooking,
  fetchManagedBooking,
  rescheduleManagedBooking,
  type GuestBookingRequest,
} from '@/lib/public-booking-api';

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
      <div className="sb-wrap">
        <p className="sb-status">Loading booking…</p>
        <BuiltByColabdeck />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="sb-wrap">
        <div className="sb-card">
          <h1>Booking not found</h1>
          <p className="sb-lead">{errorMessage}</p>
        </div>
        <BuiltByColabdeck />
      </div>
    );
  }

  const canAct =
    request.status === 'pending' || request.status === 'reschedule_proposed';

  return (
    <div className="sb-wrap">
      <div className="sb-card">
        <header className="sb-hero">
          <h1>{request.studioName}</h1>
          <p>Your booking request</p>
        </header>

        <p className="sb-lead">
          Status: <strong>{statusLabel(request.status)}</strong>
        </p>
        <p className="sb-status">
          Requested:{' '}
          {new Date(request.requestedStartsAt).toLocaleString()} –{' '}
          {new Date(request.requestedEndsAt).toLocaleTimeString()}
        </p>
        {request.proposedStartsAt && request.proposedEndsAt ? (
          <p className="sb-status" style={{ marginTop: '0.5rem' }}>
            Studio proposed:{' '}
            <strong>
              {new Date(request.proposedStartsAt).toLocaleString()} –{' '}
              {new Date(request.proposedEndsAt).toLocaleTimeString()}
            </strong>
          </p>
        ) : null}
        {request.rejectionReason ? (
          <p className="sb-status" style={{ marginTop: '0.5rem' }}>
            Reason: {request.rejectionReason}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="sb-status error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="sb-actions">
          {request.status === 'reschedule_proposed' ? (
            <button
              type="button"
              className="sb-btn"
              disabled={isBusy}
              onClick={() => void handleAcceptProposal()}
            >
              Accept proposed time
            </button>
          ) : null}
          {canAct ? (
            <button
              type="button"
              className="sb-btn outline"
              disabled={isBusy}
              onClick={() => void handleCancel()}
            >
              Cancel request
            </button>
          ) : null}
          <button
            type="button"
            className="sb-btn ghost"
            disabled={isBusy}
            onClick={() => void reload()}
          >
            Refresh
          </button>
        </div>
      </div>
      <BuiltByColabdeck />
    </div>
  );
}
