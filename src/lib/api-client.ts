import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';
import type { ApiErrorResponse } from './auth';

interface RequestOptions extends RequestInit {
  token?: string | null;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = options.token ?? getStoredToken();
  const headers = new Headers(options.headers);

  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

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
