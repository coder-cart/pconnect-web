'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Eye,
  EyeOff,
  FileStack,
  FolderKanban,
  KeyRound,
  Lock,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import {
  ApiResponse,
  AuthenticatedUser,
  setStoredToken,
} from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import './login.css';

type LoginMode = 'password' | 'magic';

const SHOWCASE_FEATURES = [
  { icon: MessageSquare, label: 'Team communication' },
  { icon: FolderKanban, label: 'Projects and tasks' },
  { icon: Users, label: 'Client portals' },
  { icon: FileStack, label: 'File sharing and delivery' },
  { icon: ShieldCheck, label: 'Controlled access' },
] as const;

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
    <div className="login-root" data-theme="light">
      <aside className="login-showcase" aria-label="Product highlights">
        <div className="login-showcase__brand">
          <Link href="/" aria-label="Colabdeck home">
            <Logo />
          </Link>
        </div>

        <h1>
          One workspace for your <em>team</em> and your <em>clients</em>
        </h1>
        <p className="login-showcase__lead">
          Bring conversations, projects, files, approvals, and client delivery
          together in one organized workspace.
        </p>

        <ul className="login-showcase__features">
          {SHOWCASE_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <li key={feature.label}>
                <span className="login-showcase__icon">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {feature.label}
              </li>
            );
          })}
        </ul>

        <div className="login-showcase__visual" aria-hidden="true">
          <div className="login-showcase__panel">
            <div className="login-showcase__chrome">
              <span />
              <span />
              <span />
            </div>
            <div className="login-showcase__row login-showcase__row--accent" />
            <div className="login-showcase__row login-showcase__row--mid" />
            <div className="login-showcase__row" />
            <div className="login-showcase__row login-showcase__row--short" />
          </div>
          <div className="login-showcase__float login-showcase__float--top">
            <strong>Client</strong>
            Great work! The edits look perfect.
          </div>
          <div className="login-showcase__float login-showcase__float--mid">
            <strong>Approved</strong>
            Delivery ready for handoff
          </div>
        </div>

        <div className="login-showcase__steps">
          <span>Organize work</span>
          <span aria-hidden>→</span>
          <span>Collaborate with clients</span>
          <span aria-hidden>→</span>
          <span>Deliver faster</span>
        </div>
      </aside>

      <section className="login-panel">
        <div className="login-panel__top">
          <span className="login-panel__top-label">New to Colabdeck?</span>
          <Link href="/book-a-demo" className="login-panel__demo">
            Book a demo
          </Link>
        </div>

        <div className="login-panel__main">
          <div className="login-card">
            <div className="login-card__logo lg:hidden">
              <Link href="/" aria-label="Colabdeck home">
                <Logo />
              </Link>
            </div>
            <div className="login-card__logo hidden lg:block">
              <Logo />
            </div>

            <h1>Sign in to your workspace</h1>
            <p className="login-card__subtitle">
              Access your projects, chats, files, and more.
            </p>

            <div className="login-tabs" role="tablist" aria-label="Sign-in method">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'password'}
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
                role="tab"
                aria-selected={mode === 'magic'}
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
                className="login-form"
                onSubmit={handlePasswordLogin}
                noValidate
              >
                <Input
                  label="Email address"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
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

                <div className="login-form__row">
                  <span />
                  <Link href="/forgot-password">Forgot password?</Link>
                </div>

                {errorMessage ? (
                  <p className="login-error" role="alert">
                    {errorMessage}
                  </p>
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
              <form className="login-form" onSubmit={handleMagicLink} noValidate>
                <Input
                  label="Email address"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  leadingIcon={<Mail className="h-4 w-4" />}
                  required
                />
                <p className="login-hint">
                  We’ll email a one-time link that signs you in. It expires in 30
                  minutes.
                </p>

                {errorMessage ? (
                  <p className="login-error" role="alert">
                    {errorMessage}
                  </p>
                ) : null}
                {successMessage ? (
                  <p className="login-success" role="status">
                    {successMessage}
                  </p>
                ) : null}

                <div className="login-divider">or continue with</div>

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

            <div className="login-secure">
              <Lock className="h-4 w-4" aria-hidden />
              <p>
                Your data is secure. We use role-based access and session
                controls to keep workspace information protected.
              </p>
            </div>
          </div>
        </div>

        <footer>
          <nav className="login-footer" aria-label="Legal">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <p className="login-copy">
            © {new Date().getFullYear()} Colabdeck. All rights reserved.
          </p>
        </footer>
      </section>
    </div>
  );
}
