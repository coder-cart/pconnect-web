import Link from 'next/link';
import { JsonLd } from '@/components/marketing/JsonLd';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { breadcrumbJsonLd, marketingMetadata } from '@/lib/marketing/seo';
import { DEVELOPER_NAME, DEVELOPER_URL } from '@/lib/marketing/site';

export const metadata = marketingMetadata({
  title: 'About',
  description:
    'Why Colabdeck exists — a standalone collaboration workspace for teams and clients, developed by CoderCart.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />

      <section className="mk-page-hero">
        <div className="mk-shell">
          <h1>A better way for teams and clients to work together</h1>
          <p>
            Colabdeck is a standalone SaaS product for client-delivery collaboration.
            It began with real operational needs and is built to serve agencies,
            studios, and service businesses beyond any single customer.
          </p>
        </div>
      </section>

      <section className="mk-shell mk-prose">
        <h2>The problem we address</h2>
        <p>
          Client work still gets split across chat apps, task boards, file shares,
          and finance tools. Internal teams lose context. Clients either see too
          little — or accidentally see too much.
        </p>

        <h2>Our mission</h2>
        <p>
          Give businesses one organized workspace where conversations, projects,
          files, approvals, and client delivery stay connected — with clear
          boundaries between internal work and what clients can access.
        </p>

        <h2>Product principles</h2>
        <ul>
          <li>Clarity over clutter — calm, professional product surfaces</li>
          <li>Client isolation by design — not as an afterthought</li>
          <li>Permissions enforced in both UI and API</li>
          <li>Honest packaging — we only market capabilities that ship</li>
        </ul>

        <h2>Development partner</h2>
        <p>
          Colabdeck is developed by{' '}
          <a href={DEVELOPER_URL} rel="noopener noreferrer" target="_blank">
            {DEVELOPER_NAME}
          </a>
          . Photophile NHC is an early operational use case, not the limit of who
          Colabdeck is for, and not the product owner.
        </p>

        <p>
          <Link href="/features">Explore features</Link>
          {' · '}
          <Link href="/book-a-demo">Book a demo</Link>
        </p>
      </section>

      <MarketingCta />
    </>
  );
}
