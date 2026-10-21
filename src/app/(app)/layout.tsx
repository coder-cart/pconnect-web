'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import {
  AuthenticatedUser,
  ApiResponse,
  clearStoredToken,
  getStoredRefreshToken,
  getStoredToken,
} from '@/lib/auth';
import { apiRequest } from '@/lib/api-client';
import { disableDevicePush } from '@/lib/push-notifications';
import { CardGridSkeleton } from '@/components/ui/Skeleton';
import { Logo } from '@/components/ui/Logo';

interface ProtectedLayoutProps {
  children: ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      router.replace('/login');
      return;
    }

    apiRequest<ApiResponse<AuthenticatedUser>>('/auth/me', { token })
      .then((response) => {
        setUser(response.data);
      })
      .catch((error: Error) => {
        clearStoredToken();
        setErrorMessage(error.message);
        router.replace('/login');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      return;
    }

    const response = await apiRequest<ApiResponse<AuthenticatedUser>>(
      '/auth/me',
      { token },
    );
    setUser(response.data);
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
    router.replace('/login');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <Logo />
          <CardGridSkeleton count={3} />
        </div>
      </div>
    );
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
