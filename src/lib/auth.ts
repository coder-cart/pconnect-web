import { AUTH_TOKEN_KEY } from './config';

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

export function setStoredToken(token: string): void {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
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
