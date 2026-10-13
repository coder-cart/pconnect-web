'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Sparkles,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import {
  ApiResponse,
  AuthenticatedUser,
  setStoredToken,
} from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { Badge } from '@/components/ui/Badge';

type LoginMode = 'password' | 'magic';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await apiRequest<
        ApiResponse<{
          accessToken: string;
          refreshToken: string;
          user: AuthenticatedUser;
        }>
      >('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setStoredToken(response.data.accessToken, response.data.refreshToken);
      router.replace('/dashboard');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to sign in',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await apiRequest<
        ApiResponse<{ message: string; found?: boolean }>
      >('/auth/magic-link/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (response.data.found === false) {
        setErrorMessage(response.data.message);
      } else {
        setSuccessMessage(response.data.message);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to send login link',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r border-[var(--border)] bg-[var(--surface)] p-6 lg:flex lg:flex-col">
        <Logo />
      </aside>

      <main className="flex min-h-screen items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="lg:hidden">
            <Logo />
          </div>

          <Card className="animate-fade-in">
            <Badge variant="primary" className="mb-4">
              <Lock className="mr-1 inline h-3 w-3" />
              Secure sign in
            </Badge>

            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Sign in with your password or request a one-time magic link.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-[var(--radius-md)] border border-[var(--border)] p-1">
              <button
                type="button"
                className={`rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors ${
                  mode === 'password'
                    ? 'bg-[var(--surface-muted)] text-[var(--foreground)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
                onClick={() => {
                  setMode('password');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              >
                Password
              </button>
              <button
                type="button"
                className={`rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors ${
                  mode === 'magic'
                    ? 'bg-[var(--surface-muted)] text-[var(--foreground)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
                onClick={() => {
                  setMode('magic');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              >
                Magic link
              </button>
            </div>

            {mode === 'password' ? (
              <form
                className="mt-6 space-y-4"
                onSubmit={handlePasswordLogin}
                noValidate
              >
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  leadingIcon={<Mail className="h-4 w-4" />}
                  required
                />

                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  leadingIcon={<KeyRound className="h-4 w-4" />}
                  trailingIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      className="transition-colors hover:text-[var(--foreground)]"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                  required
                />

                <div className="flex items-center justify-between text-sm">
                  <Link
                    href="/forgot-password"
                    className="font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
                  >
                    Forgot password?
                  </Link>
                </div>

                {errorMessage ? (
                  <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <form
                className="mt-6 space-y-4"
                onSubmit={handleMagicLink}
                noValidate
              >
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  leadingIcon={<Mail className="h-4 w-4" />}
                  required
                />
                <p className="text-xs text-[var(--muted)]">
                  We’ll email a one-time link that signs you in. It expires in 30
                  minutes.
                </p>

                {errorMessage ? (
                  <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
                ) : null}
                {successMessage ? (
                  <p className="text-sm text-[var(--success)]">{successMessage}</p>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting || !email.trim()}
                >
                  <Sparkles className="h-4 w-4" />
                  {isSubmitting ? 'Sending...' : 'Email magic link'}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
