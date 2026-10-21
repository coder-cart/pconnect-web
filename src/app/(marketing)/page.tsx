import Link from 'next/link';
import {
  Check,
  FileStack,
  FolderKanban,
  MessageSquare,
  Receipt,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { FaqAccordion } from '@/components/marketing/FaqAccordion';
import { JsonLd } from '@/components/marketing/JsonLd';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { ProductMockup } from '@/components/marketing/ProductMockups';
import {
  HOME_AUDIENCES,
  HOME_FAQS,
  HOME_SOLUTION_CARDS,
  HOME_TRUST_PILLS,
  WORKFLOW_STEPS,
} from '@/lib/marketing/content';
import {
  faqJsonLd,
  marketingMetadata,
  softwareApplicationJsonLd,
} from '@/lib/marketing/seo';
import { SITE_DESCRIPTION } from '@/lib/marketing/site';

export const metadata = marketingMetadata({
  title: 'Colabdeck — One workspace for your team and your clients',
  description: SITE_DESCRIPTION,
  path: '/',
});

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Team chat and channels',
    description:
      'Channels, DMs, threads, and mentions stay connected to delivery work.',
    href: '/features#chat',
  },
  {
    icon: FolderKanban,
    title: 'Projects and tasks',
    description:
      'List and board views with assignees, due dates, and project context.',
    href: '/features#projects',
  },
  {
    icon: Users,
    title: 'Client portals',
    description:
      'Invite clients into shared channels, onboarding, and approved tasks only.',
    href: '/features#clients',
  },
  {
    icon: FileStack,
    title: 'Shared files',
    description:
      'Organize files by project or conversation with internal vs shared scope.',
    href: '/features#files',
  },
  {
    icon: ShieldCheck,
    title: 'Approvals and delivery',
    description:
      'Route delivery reviews so stakeholders can approve or request changes.',
    href: '/features#approvals',
  },
  {
    icon: Receipt,
    title: 'Finance in context',
    description:
      'Invoices and expenses for authorized roles — never overshared by default.',
    href: '/features#finance',
  },
] as const;

const PREVIEW_POINTS = [
  'Real-time chat next to delivery work',
  'Role-based permissions for staff and clients',
  'Shared files with clear visibility rules',
  'Approvals, onboarding, and finance when you need them',
] as const;

const ISOLATION_POINTS = [
  'Role-based access on sensitive screens',
  'Clear separation of internal vs client content',
  'Audit-friendly permissions for high-trust actions',
] as const;

export default function MarketingHomePage() {
  return (
    <>
      <JsonLd data={softwareApplicationJsonLd()} />
      <JsonLd data={faqJsonLd(HOME_FAQS)} />

      <section className="mk-hero mk-hero--home">
        <div className="mk-shell mk-hero__stack">
          <div className="mk-hero__copy mk-hero__copy--center">
            <h1>
              One workspace for your{' '}
              <span className="mk-hero__accent">team</span> and your{' '}
              <span className="mk-hero__accent mk-hero__accent--alt">clients</span>
            </h1>
            <p className="mk-hero__lead">
              Bring conversations, projects, and files into one organized space —
              with clear boundaries between internal work and what clients can see.
            </p>
            <div className="mk-hero__actions mk-hero__actions--center">
              <Link href="/book-a-demo" className="mk-btn">
                Book a demo
              </Link>
              <Link href="/features" className="mk-btn mk-btn--ghost">
                Explore features
              </Link>
            </div>
          </div>

          <div className="mk-hero__visual mk-hero__visual--frame">
            <ProductMockup variant="workspace" />
          </div>

          <ul className="mk-hero__pills" aria-label="Key capabilities">
            {HOME_TRUST_PILLS.map((pill) => (
              <li key={pill}>{pill}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mk-section mk-section--tight">
        <div className="mk-shell">
          <p className="mk-eyebrow">Trusted by creative and client-service teams</p>
          <ul className="mk-audience-row">
            {HOME_AUDIENCES.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-shell">
          <div className="mk-section__intro mk-section__intro--center">
            <p className="mk-eyebrow">Powerful features</p>
            <h2>Stop stitching tools together.</h2>
            <p>
              Chat, projects, client portals, files, approvals, and finance — in one
              workspace built for delivery teams.
            </p>
          </div>
          <div className="mk-grid-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="mk-card mk-card--soft">
                  <span className="mk-card__icon">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <Link href={feature.href} className="mk-card__link">
                    Learn more
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mk-section mk-section--muted">
        <div className="mk-shell">
          <div className="mk-section__intro mk-section__intro--center">
            <p className="mk-eyebrow">How it works</p>
            <h2>From collaboration to delivery, in three simple steps.</h2>
          </div>
          <div className="mk-steps">
            {WORKFLOW_STEPS.map((step) => (
              <article key={step.title} className="mk-step">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
          <div className="mk-section__actions">
            <Link href="/book-a-demo" className="mk-btn">
              Book a demo
            </Link>
            <Link href="/features" className="mk-btn mk-btn--outline">
              Explore features
            </Link>
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-shell mk-split">
          <div className="mk-split__media">
            <ProductMockup variant="portal" className="mk-mock--light" />
          </div>
          <div className="mk-split__copy">
            <h2>Everything you need to work with clients, in one place.</h2>
            <p>
              Keep delivery conversations, status, and files together so your team
              spends less time chasing updates across tools.
            </p>
            <ul className="mk-check-list">
              {PREVIEW_POINTS.map((point) => (
                <li key={point}>
                  <Check className="h-4 w-4" aria-hidden />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <Link href="/features" className="mk-btn">
              Explore features
            </Link>
          </div>
        </div>
      </section>

      <section className="mk-isolation">
        <div className="mk-shell mk-isolation__grid">
          <div className="mk-isolation__copy">
            <h2>Keep internal work internal.</h2>
            <p>
              External clients only see shared channels, approved tasks, shared
              files, and finance you explicitly expose. Internal notes and
              restricted records stay internal — enforced in the UI and API.
            </p>
            <ul className="mk-check-list mk-check-list--on-dark">
              {ISOLATION_POINTS.map((point) => (
                <li key={point}>
                  <Check className="h-4 w-4" aria-hidden />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mk-isolation__diagram" aria-hidden="true">
            <div className="mk-isolation__panel">
              <p className="mk-isolation__label">Internal team</p>
              <p className="mk-isolation__meta">Full workspace access</p>
              <div className="mk-isolation__avatars">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="mk-isolation__hub">
              <span>Colabdeck</span>
            </div>
            <div className="mk-isolation__panel">
              <p className="mk-isolation__label">Client portal</p>
              <p className="mk-isolation__meta">Controlled access</p>
              <div className="mk-isolation__avatars">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-shell">
          <div className="mk-section__intro mk-section__intro--center">
            <h2>Built for different teams and industries.</h2>
            <p>
              Whether you run campaigns, post-production, or ongoing client
              service — Colabdeck keeps collaboration organized.
            </p>
          </div>
          <div className="mk-solution-grid">
            {HOME_SOLUTION_CARDS.map((card) => (
              <article key={card.id} className="mk-solution-card">
                <div
                  className={`mk-solution-card__media mk-solution-card__media--${card.tone}`}
                  aria-hidden="true"
                />
                <div className="mk-solution-card__body">
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                  <Link href={`/solutions#${card.id}`} className="mk-card__link">
                    Learn more
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <MarketingCta
        title="Ready to streamline your client work?"
        description="Book a walkthrough and see chat, projects, client visibility, files, and finance in one workspace."
      />

      <section className="mk-section">
        <div className="mk-shell">
          <div className="mk-section__intro mk-section__intro--center">
            <h2>Frequently asked questions</h2>
            <p>Quick answers before you book a walkthrough.</p>
          </div>
          <div className="mk-faq mk-faq--split">
            <FaqAccordion items={HOME_FAQS} />
          </div>
        </div>
      </section>
    </>
  );
}
