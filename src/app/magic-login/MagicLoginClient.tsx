'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import {
  ApiResponse,
  AuthenticatedUser,
  setStoredToken,
} from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import { ListSkeleton } from '@/components/ui/Skeleton';

export default function MagicLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMessage('Missing login token.');
      return;
    }

    let cancelled = false;

    apiRequest<
      ApiResponse<{
        accessToken: string;
        refreshToken: string;
        user: AuthenticatedUser;
      }>
    >('/auth/magic-link/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then((response) => {
        if (cancelled) return;
        setStoredToken(response.data.accessToken, response.data.refreshToken);
        router.replace('/dashboard');
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'This login link is invalid or has expired.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md space-y-6">
        <Logo />
        <Card>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            Signing you in…
          </h1>
          {!errorMessage ? (
            <div className="mt-4">
              <ListSkeleton rows={2} />
              <p className="mt-3 text-sm text-[var(--muted)]">
                Verifying your magic link.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
              <Link
                href="/login"
                className="text-sm font-medium text-[var(--primary)] hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
