import { API_BASE_URL } from '@/lib/config';

export interface PublicStudioProfile {
  slug: string;
  studioName: string;
  logoUpdatedAt?: string | null;
  title: string;
  description?: string | null;
  timezone: string;
  slotDurationMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
}

export interface GuestBookingRequest {
  id: string;
  status: string;
  studioName: string;
  guestName: string;
  guestEmail: string;
  requestedStartsAt: string;
  requestedEndsAt: string;
  proposedStartsAt?: string | null;
  proposedEndsAt?: string | null;
  rejectionReason?: string | null;
}

async function publicFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    message?: string;
  } | null;
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message ?? 'Request failed');
  }
  return payload.data as T;
}

export function fetchPublicStudio(slug: string) {
  return publicFetch<PublicStudioProfile>(
    `/public/booking/${encodeURIComponent(slug)}`,
  );
}

export function fetchPublicSlots(slug: string, from: string, to: string) {
  const params = new URLSearchParams({ from, to });
  return publicFetch<{ slotDurationMinutes: number; slots: string[] }>(
    `/public/booking/${encodeURIComponent(slug)}/slots?${params}`,
  );
}

export function createPublicBookingRequest(
  slug: string,
  body: {
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    notes?: string;
    startsAt: string;
    website?: string;
  },
) {
  return publicFetch<{
    received: true;
    requestId: string | null;
    manageToken: string | null;
  }>(`/public/booking/${encodeURIComponent(slug)}/requests`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchManagedBooking(token: string) {
  return publicFetch<GuestBookingRequest>(
    `/public/booking/manage/${encodeURIComponent(token)}`,
  );
}

export function cancelManagedBooking(token: string) {
  return publicFetch<GuestBookingRequest>(
    `/public/booking/manage/${encodeURIComponent(token)}/cancel`,
    { method: 'POST', body: '{}' },
  );
}

export function rescheduleManagedBooking(
  token: string,
  body: { startsAt?: string; acceptProposal?: boolean },
) {
  return publicFetch<GuestBookingRequest>(
    `/public/booking/manage/${encodeURIComponent(token)}/reschedule`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}
