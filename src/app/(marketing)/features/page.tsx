import Link from 'next/link';
import { JsonLd } from '@/components/marketing/JsonLd';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { ProductMockup } from '@/components/marketing/ProductMockups';
import { FEATURE_SECTIONS } from '@/lib/marketing/content';
import { breadcrumbJsonLd, marketingMetadata } from '@/lib/marketing/seo';

export const metadata = marketingMetadata({
  title: 'Features',
  description:
    'Explore Colabdeck features for team chat, projects, client portals, files, approvals, permissions, and finance visibility.',
  path: '/features',
});

type MockVariant =
  | 'workspace'
  | 'chat'
  | 'tasks'
  | 'files'
  | 'approvals'
  | 'permissions'
  | 'portal';

const MOCK_BY_ID: Record<string, MockVariant> = {
  chat: 'chat',
  projects: 'tasks',
  clients: 'portal',
  files: 'files',
  approvals: 'approvals',
  notifications: 'chat',
  permissions: 'permissions',
  finance: 'permissions',
};

export default function FeaturesPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Features', path: '/features' },
        ])}
      />

      <section className="mk-page-hero">
        <div className="mk-shell">
          <h1>Powerful features for seamless collaboration</h1>
          <p>
            Every module below is available in the Colabdeck workspace today.
            Claims stay aligned with what the product actually ships.
          </p>
        </div>
      </section>

      <section className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-shell">
          {FEATURE_SECTIONS.map((section, index) => {
            const mockVariant = MOCK_BY_ID[section.id] ?? 'workspace';
            return (
              <article
                key={section.id}
                id={section.id}
                className={`mk-feature-row ${index % 2 === 1 ? 'mk-feature-row--reverse' : ''}`}
              >
                <div className="mk-feature-row__copy">
                  <h2>{section.title}</h2>
                  <p>
                    <strong style={{ color: 'var(--mk-ink)' }}>Problem: </strong>
                    {section.problem}
                  </p>
                  <p>
                    <strong style={{ color: 'var(--mk-ink)' }}>Benefit: </strong>
                    {section.benefit}
                  </p>
                  <ul>
                    {section.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  <Link href="/book-a-demo" className="mk-card__link">
                    See it in a demo
                  </Link>
                </div>
                <ProductMockup variant={mockVariant} className="mk-mock--light" />
              </article>
            );
          })}
        </div>
      </section>

      <MarketingCta
        title="Ready to explore Colabdeck with your team?"
        description="Book a demo and we’ll focus on the modules that matter for your workflow."
      />
    </>
  );
}
