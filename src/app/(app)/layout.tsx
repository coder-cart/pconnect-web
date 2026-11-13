'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  AuthenticatedUser,
  ApiResponse,
  clearStoredToken,
  getStoredRefreshToken,
  getStoredToken,
  reconcileSessionMarker,
} from '@/lib/auth';
import { apiRequest } from '@/lib/api-client';
import { disableDevicePush } from '@/lib/push-notifications';
import { AppBootSplash } from '@/components/ui/AppBootSplash';

interface ProtectedLayoutProps {
  children: ReactNode;
}

function redirectToLogin() {
  // Hard navigation is more reliable than soft replace in iOS standalone PWAs.
  window.location.replace('/login');
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Cookie without tokens (common after Add to Home Screen) must not keep
    // the splash up or bounce through middleware forever.
    if (!reconcileSessionMarker()) {
      setIsLoading(false);
      redirectToLogin();
      return;
    }

    const token = getStoredToken();
    if (!token) {
      clearStoredToken();
      setIsLoading(false);
      redirectToLogin();
      return;
    }

    // Rely on stored token + refresh-on-401 (do not pass token explicitly,
    // or an expired access token skips refresh and surfaces as Unauthorized).
    apiRequest<ApiResponse<AuthenticatedUser>>('/auth/me')
      .then((response) => {
        if (cancelled) return;
        setUser(response.data);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        clearStoredToken();
        setErrorMessage(error.message);
        setUser(null);
        redirectToLogin();
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    if (!reconcileSessionMarker()) {
      setUser(null);
      redirectToLogin();
      return;
    }

    const token = getStoredToken();
    if (!token) {
      clearStoredToken();
      setUser(null);
      redirectToLogin();
      return;
    }

    try {
      const response = await apiRequest<ApiResponse<AuthenticatedUser>>(
        '/auth/me',
      );
      setUser(response.data);
    } catch (error) {
      clearStoredToken();
      setUser(null);
      setErrorMessage(
        error instanceof Error ? error.message : 'Session expired',
      );
      redirectToLogin();
    }
  }, []);

  async function handleLogout() {
    try {
      await disableDevicePush();
    } catch {
      // Drop the local session even if the device subscription cannot be removed.
    }
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: getStoredRefreshToken() }),
      });
    } catch {
      // Clear local session even if the API call fails.
    }

    clearStoredToken();
    redirectToLogin();
  }

  if (isLoading) {
    return <AppBootSplash />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
        <p className="text-sm text-[var(--muted)]">
          {errorMessage ?? 'Redirecting to login...'}
        </p>
      </div>
    );
  }

  return (
    <AppShell user={user} onLogout={handleLogout} refreshUser={refreshUser}>
      {children}
    </AppShell>
  );
}
