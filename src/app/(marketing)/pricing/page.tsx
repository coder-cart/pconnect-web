import Link from 'next/link';
import { FaqAccordion } from '@/components/marketing/FaqAccordion';
import { JsonLd } from '@/components/marketing/JsonLd';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { PRICING_FAQS, PRICING_PLANS } from '@/lib/marketing/content';
import {
  breadcrumbJsonLd,
  faqJsonLd,
  marketingMetadata,
} from '@/lib/marketing/seo';

export const metadata = marketingMetadata({
  title: 'Pricing',
  description:
    'Colabdeck workspace packaging for growing client-delivery teams. Contact us for a quote — public list prices are not published yet.',
  path: '/pricing',
});

export default function PricingPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Pricing', path: '/pricing' },
        ])}
      />
      <JsonLd data={faqJsonLd(PRICING_FAQS)} />

      <section className="mk-page-hero">
        <div className="mk-shell">
          <h1>Simple, transparent packaging</h1>
          <p>
            Choose the workspace shape that matches your rollout. Final commercial
            terms are confirmed with our team until self-serve billing is published.
          </p>
        </div>
      </section>

      <section className="mk-shell">
        <p className="mk-note">
          {/* PLACEHOLDER_PRICING: replace labels when approved commercial prices exist. */}
          Pricing amounts are not published yet. The cards below describe packaging
          intent — use Contact us or Book a demo for a quote.
        </p>
        <div className="mk-pricing-grid">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={
                plan.featured ? 'mk-price mk-price--featured' : 'mk-price'
              }
            >
              {'badge' in plan && plan.badge ? (
                <span className="mk-price__badge">{plan.badge}</span>
              ) : null}
              <h3>{plan.name}</h3>
              <p className="mk-price__amount">{plan.priceLabel}</p>
              <p>{plan.description}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link
                href={plan.cta.href}
                className={plan.featured ? 'mk-btn' : 'mk-btn mk-btn--outline'}
              >
                {plan.cta.label}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mk-section mk-section--muted">
        <div className="mk-shell">
          <div className="mk-section__intro">
            <h2>Pricing FAQ</h2>
            <p>Answers based on current invite-based workspace rollout.</p>
          </div>
          <FaqAccordion items={PRICING_FAQS} />
        </div>
      </section>

      <MarketingCta
        title="Need a quote for your team size?"
        description="Tell us how many internal users and clients you expect — we’ll send clear next steps."
      />
    </>
  );
}
