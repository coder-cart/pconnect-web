import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, SESSION_COOKIE } from './config';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  userType: 'internal' | 'external';
  roleCodes: string[];
  permissionCodes: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  statusCode: number;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

// A non-sensitive marker cookie so Next middleware can gate routes server-side.
// The real token stays in localStorage; the cookie only signals "has session".
function setSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function setStoredToken(token: string, refreshToken?: string): void {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  setSessionCookie();
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  clearSessionCookie();
}

export function userHasPermission(
  user: AuthenticatedUser | null,
  permission: string,
): boolean {
  return Boolean(user?.permissionCodes.includes(permission));
}

export function userIsExternal(user: AuthenticatedUser | null): boolean {
  return user?.userType === 'external';
}
