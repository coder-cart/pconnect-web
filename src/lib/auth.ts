import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, SESSION_COOKIE } from './config';

export type ClientPortalAccessLevel = 'chat_only' | 'chat_and_orders';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  userType: 'internal' | 'external';
  roleCodes: string[];
  permissionCodes: string[];
  mustChangePassword?: boolean;
  avatarUpdatedAt?: string | null;
  /** Explicit IANA preference; null/undefined means org or device default. */
  timeZone?: string | null;
  /** Server-resolved display timezone (user → client org). Null = use browser. */
  effectiveTimeZone?: string | null;
  /** Effective portal access for external users. Null for staff. */
  portalAccessLevel?: ClientPortalAccessLevel | null;
}

export function isClientChatOnly(user: AuthenticatedUser | null): boolean {
  return (
    Boolean(user) &&
    user!.userType === 'external' &&
    user!.portalAccessLevel === 'chat_only'
  );
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
function sessionCookieAttributes(maxAge: number): string {
  const secure =
    window.location.protocol === 'https:' ? '; secure' : '';
  return `path=/; max-age=${maxAge}; samesite=lax${secure}`;
}

function setSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=1; ${sessionCookieAttributes(60 * 60 * 24 * 30)}`;
}

function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; ${sessionCookieAttributes(0)}`;
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

export function userHasAnyPermission(
  user: AuthenticatedUser | null,
  permissions: string[],
): boolean {
  return permissions.some((permission) => userHasPermission(user, permission));
}

export function userIsExternal(user: AuthenticatedUser | null): boolean {
  return user?.userType === 'external';
}

const ELEVATED_ROLE_CODES = [
  'team_lead',
  'internal_manager',
  'internal_admin',
  'company_owner',
];

/** Editor or QA Reviewer who does not also hold a higher staff role. */
export function isProductionOnlyStaff(
  roleCodes: readonly string[] | undefined,
): boolean {
  const codes = roleCodes ?? [];
  const isProduction = codes.includes('editor') || codes.includes('qa');
  const isElevated = codes.some((code) => ELEVATED_ROLE_CODES.includes(code));
  return isProduction && !isElevated;
}
