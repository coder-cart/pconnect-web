import { JsonLd } from '@/components/marketing/JsonLd';
import { LeadForm } from '@/components/marketing/LeadForm';
import { breadcrumbJsonLd, marketingMetadata } from '@/lib/marketing/seo';
import { MARKETING_EMAIL } from '@/lib/marketing/site';

export const metadata = marketingMetadata({
  title: 'Contact',
  description:
    'Contact the Colabdeck team for sales, demos, or product questions.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ])}
      />

      <section className="mk-page-hero">
        <div className="mk-shell">
          <h1>Contact Colabdeck</h1>
          <p>
            Sales and product questions are welcome. For a guided walkthrough,
            prefer{' '}
            <a href="/book-a-demo" style={{ color: 'var(--mk-primary)' }}>
              Book a demo
            </a>
            .
          </p>
        </div>
      </section>

      <section className="mk-shell" style={{ paddingBottom: '3rem' }}>
        <div className="mk-demo-layout">
          <div className="mk-card">
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Reach us</h2>
            <p style={{ marginTop: '0.65rem' }}>
              Email:{' '}
              <a href={`mailto:${MARKETING_EMAIL}`}>{MARKETING_EMAIL}</a>
            </p>
            <p>
              Website: <a href="https://colabdeck.com">colabdeck.com</a>
            </p>
            <p>
              Development partner:{' '}
              <a
                href="https://codercart.com"
                rel="noopener noreferrer"
                target="_blank"
              >
                codercart.com
              </a>
            </p>
            <p className="mk-form__privacy" style={{ marginTop: '1rem' }}>
              We respond to genuine business inquiries. Do not send passwords or
              confidential client data through this form.
            </p>
          </div>

          <div className="mk-demo-card">
            <LeadForm
              type="contact"
              submitLabel="Send message"
              showExtras={false}
            />
          </div>
        </div>
      </section>
    </>
  );
}
