'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { readEmailLinkToken } from '@/lib/email-link-token';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useParams<{ token?: string }>();
  const pathToken = typeof params.token === 'string' ? params.token : '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = readEmailLinkToken(window.location.search, pathToken);

    if (!token) {
      setErrorMessage('Reset token is missing. Request a new link.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest<ApiResponse<{ reset: boolean }>>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });

      router.replace('/login');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to reset password',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Reset password
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Choose a new password for your account.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Input
          label="New password"
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          leadingIcon={<KeyRound className="h-4 w-4" />}
          minLength={8}
          required
        />
        <Input
          label="Confirm password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          leadingIcon={<KeyRound className="h-4 w-4" />}
          minLength={8}
          required
        />

        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Reset password'}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md space-y-6">
        <Logo />
        <Suspense fallback={<Card>Loading reset form...</Card>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
