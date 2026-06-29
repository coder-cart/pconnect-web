'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Headphones,
  KeyRound,
  Lock,
  Mail,
  Shield,
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

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

  return (
    <div className="min-h-screen bg-[var(--background)] lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r border-[var(--border)] bg-[var(--surface)] p-6 lg:flex lg:flex-col">
        <Logo />

        {/* <Card className="mt-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Demo Workspace
              </p>
              <p className="text-xs text-[var(--muted)]">Enterprise workspace</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <Shield className="h-4 w-4 text-[var(--primary)]" />
                Secure access
              </div>
              <Badge variant="primary">SSO ready</Badge>
            </div>

            <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2 text-sm">
              <span className="text-[var(--foreground)]">Role-aware workspace</span>
              <span className="text-[var(--muted)]">Admin</span>
            </div>
          </div>
        </Card>

        <div className="mt-auto pt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Need help?
          </p>
          <Link
            href="#"
            className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]"
          >
            <Headphones className="h-4 w-4" />
            Contact support
          </Link>
        </div> */}
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
              Sign in to your workspace to continue with messages, projects,
              tasks, clients, and finance.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
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
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="transition-colors hover:text-[var(--foreground)]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                error={errorMessage ?? undefined}
                required
              />

              <div className="flex items-center justify-between text-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
                >
                  Forgot password?
                </Link>
                <Link href="#" className="text-[var(--muted)] hover:text-[var(--foreground)]">
                  Help / support
                </Link>
              </div>

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

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                Or
              </span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <Button variant="secondary" size="lg" className="w-full">
              Continue with SSO
            </Button>
          </Card>

          {/* <Card className="animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Workspace branding
            </p>
            <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
              Demo Workspace
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Protected sign-in for internal teams and clients.
            </p>

            <div className="mt-4 space-y-2">
              {[
                'Messages and threads',
                'Projects and tasks',
                'Files and finance',
              ].map((feature) => (
                <div
                  key={feature}
                  className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)]"
                >
                  {feature}
                </div>
              ))}
            </div>
          </Card> */}
        </div>
      </main>
    </div>
  );
}
