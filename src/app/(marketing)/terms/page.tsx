import { JsonLd } from '@/components/marketing/JsonLd';
import { breadcrumbJsonLd, marketingMetadata } from '@/lib/marketing/seo';
import { MARKETING_EMAIL } from '@/lib/marketing/site';

export const metadata = marketingMetadata({
  title: 'Terms of Service',
  description:
    'Terms of use for the Colabdeck workspace. Draft for legal review.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Terms', path: '/terms' },
        ])}
      />

      <section className="mk-page-hero">
        <div className="mk-shell">
          <h1>Terms of Service</h1>
          <p>
            Last updated: 22 October 2026. This is a structured draft requiring
            review by qualified counsel. It is not finalized commercial or legal
            advice.
          </p>
        </div>
      </section>

      <section className="mk-shell mk-prose">
        <p className="mk-note">
          Unresolved for legal review: governing law, venue, limitation of
          liability caps, SLA commitments, subscription billing mechanics, and
          enterprise order-form precedence.
        </p>

        <h2>Using Colabdeck</h2>
        <p>
          Access is limited to authorized users invited by a workspace
          administrator. You agree to keep credentials secure and use the product
          only for legitimate business collaboration.
        </p>

        <h2>Accounts and workspace content</h2>
        <p>
          Your organization owns the content it stores in Colabdeck. Admins are
          responsible for managing members, client access, and retention policies
          appropriate for their business.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Do not attempt to access data you are not permitted to see, disrupt the
          service, reverse engineer the product beyond applicable law, or use
          Colabdeck for unlawful activity.
        </p>

        <h2>Subscriptions and fees</h2>
        <p>
          Commercial terms, fees, and renewal conditions are confirmed in your
          agreement or order form. Public self-serve pricing may be published later.
          [Billing policy pending approval.]
        </p>

        <h2>Intellectual property</h2>
        <p>
          Colabdeck software, branding, and documentation remain the property of
          their respective owners. Customer content remains customer property.
        </p>

        <h2>Service availability</h2>
        <p>
          We aim to keep Colabdeck available and reliable. Planned maintenance and
          unforeseen outages may occur. Formal uptime commitments, if any, will
          appear in a customer agreement. [SLA pending.]
        </p>

        <h2>Termination</h2>
        <p>
          Access may be suspended or terminated for material breach, non-payment
          under an agreement, or security risk. Customers may stop using the
          service according to their contract.
        </p>

        <h2>Liability</h2>
        <p>
          To the extent permitted by law, liability limitations will be defined in
          the final customer agreement. This draft does not set numeric caps.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms:{' '}
          <a href={`mailto:${MARKETING_EMAIL}`}>{MARKETING_EMAIL}</a>.
        </p>
      </section>
    </>
  );
}
