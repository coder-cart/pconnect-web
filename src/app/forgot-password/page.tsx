'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await apiRequest<
        ApiResponse<{ message: string; found?: boolean }>
      >('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (response.data.found === false) {
        setErrorMessage(response.data.message);
      } else {
        setMessage(response.data.message);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to send reset email',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md space-y-6">
        <Logo />

        <Card>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Forgot password
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Enter your email and we will send a password reset link.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              leadingIcon={<Mail className="h-4 w-4" />}
              required
            />

            {message ? (
              <p className="text-sm text-[var(--success)]">{message}</p>
            ) : null}
            {errorMessage ? (
              <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send reset link'}
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
      </div>
    </div>
  );
}
