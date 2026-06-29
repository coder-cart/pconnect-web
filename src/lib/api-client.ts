import { API_BASE_URL } from './config';
import {
  clearStoredToken,
  getStoredRefreshToken,
  getStoredToken,
  setStoredToken,
} from './auth';
import type { ApiErrorResponse } from './auth';

interface RequestOptions extends RequestInit {
  token?: string | null;
}

let refreshPromise: Promise<string | null> | null = null;

// Exchange the stored refresh token for a fresh access token. De-duplicated so
// concurrent 401s trigger only a single refresh round-trip.
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearStoredToken();
        return null;
      }

      const payload = (await response.json()) as {
        data: { accessToken: string; refreshToken: string };
      };
      setStoredToken(payload.data.accessToken, payload.data.refreshToken);
      return payload.data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const explicitToken = options.token !== undefined;
  const token = options.token ?? getStoredToken();
  const headers = new Headers(options.headers);

  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // On an expired access token, transparently refresh once and retry.
  if (response.status === 401 && !explicitToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
      });
    }
  }

  const payload = (await response.json()) as T;

  if (!response.ok) {
    const errorPayload = payload as unknown as ApiErrorResponse;
    throw new Error(errorPayload.message ?? 'Request failed');
  }

  return payload;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: Omit<RequestOptions, 'body' | 'headers'> = {},
): Promise<T> {
  const token = options.token ?? getStoredToken();
  const headers = new Headers();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method: 'POST',
    headers,
    body: formData,
  });

  const payload = (await response.json()) as T;

  if (!response.ok) {
    const errorPayload = payload as unknown as ApiErrorResponse;
    throw new Error(errorPayload.message ?? 'Upload failed');
  }

  return payload;
}

export async function apiDownload(path: string, filename: string): Promise<void> {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('Download failed');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
