import Link from 'next/link';
import { JsonLd } from '@/components/marketing/JsonLd';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { SOLUTIONS } from '@/lib/marketing/content';
import { breadcrumbJsonLd, marketingMetadata } from '@/lib/marketing/seo';

export const metadata = marketingMetadata({
  title: 'Solutions',
  description:
    'How creative agencies, photo teams, marketing agencies, and client-service businesses use Colabdeck.',
  path: '/solutions',
});

export default function SolutionsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Solutions', path: '/solutions' },
        ])}
      />

      <section className="mk-page-hero">
        <div className="mk-shell">
          <h1>Built for client-facing teams across industries</h1>
          <p>
            Colabdeck helps teams that deliver work with and for clients — without
            inventing a different product for each industry.
          </p>
        </div>
      </section>

      <section className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-shell mk-grid-3">
          {SOLUTIONS.map((solution) => (
            <article key={solution.id} id={solution.id} className="mk-card">
              <h3>{solution.title}</h3>
              <p>{solution.challenge}</p>
              <Link href={`#${solution.id}-detail`} className="mk-card__link">
                See how it works
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mk-section mk-section--muted">
        <div className="mk-shell">
          {SOLUTIONS.map((solution) => (
            <article
              key={`${solution.id}-detail`}
              id={`${solution.id}-detail`}
              className="mk-feature-row"
            >
              <div className="mk-feature-row__copy">
                <h2>{solution.title}</h2>
                <p>{solution.challenge}</p>
                <ul>
                  {solution.capabilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p>
                  <strong style={{ color: 'var(--mk-ink)' }}>Outcome: </strong>
                  {solution.outcome}
                </p>
              </div>
              <div className="mk-card">
                <h3>Relevant Colabdeck capabilities</h3>
                <p>
                  Chat, projects, tasks, scoped files, client invites, approvals,
                  and role-gated finance — configured for how your team delivers.
                </p>
                <Link href="/book-a-demo" className="mk-card__link">
                  Book a tailored demo
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <MarketingCta />
    </>
  );
}
