import { JsonLd } from '@/components/marketing/JsonLd';
import { breadcrumbJsonLd, marketingMetadata } from '@/lib/marketing/seo';
import { MARKETING_EMAIL } from '@/lib/marketing/site';

export const metadata = marketingMetadata({
  title: 'Privacy Policy',
  description:
    'How Colabdeck handles account and workspace information. Draft for legal review.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Privacy', path: '/privacy' },
        ])}
      />

      <section className="mk-page-hero">
        <div className="mk-shell">
          <h1>Privacy Policy</h1>
          <p>
            Last updated: 22 October 2026. This page is a product-facing draft and
            should be reviewed by qualified counsel before relying on it as final
            legal terms.
          </p>
        </div>
      </section>

      <section className="mk-shell mk-prose">
        <p className="mk-note">
          Unresolved for legal review: formal controller identity, retention
          schedules, subprocessors list, international transfer mechanisms, and
          jurisdiction-specific rights processes.
        </p>

        <h2>Who we are</h2>
        <p>
          Colabdeck is a collaboration workspace operated for business customers.
          For privacy questions, contact{' '}
          <a href={`mailto:${MARKETING_EMAIL}`}>{MARKETING_EMAIL}</a>.
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li>Account details such as name, email, and authentication data</li>
          <li>Workspace content your organization stores in Colabdeck</li>
          <li>Marketing inquiry details submitted via demo or contact forms</li>
          <li>Technical logs needed to operate, secure, and improve the service</li>
        </ul>

        <h2>How we use information</h2>
        <p>
          We use information to provide the product, authenticate users, enforce
          permissions, communicate service updates, respond to inquiries, and
          maintain security and reliability.
        </p>

        <h2>Visibility and access inside the product</h2>
        <p>
          Colabdeck supports internal vs client-shared content scopes and
          role-based permissions. Workspace administrators control invitations and
          what external clients can access.
        </p>

        <h2>Sharing</h2>
        <p>
          We do not sell personal information. Service providers (for example email
          delivery or hosting) may process data only to operate Colabdeck under
          appropriate agreements. [Subprocessor list pending legal approval.]
        </p>

        <h2>Retention</h2>
        <p>
          We retain account and workspace data for as long as needed to provide the
          service and meet legal obligations. Specific retention schedules are
          defined with customers and legal counsel. [Details pending.]
        </p>

        <h2>Security</h2>
        <p>
          We apply access controls, authentication, and operational safeguards
          appropriate for a business collaboration product. No method of
          transmission or storage is perfectly secure.
        </p>

        <h2>Your rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct, or
          delete personal information. Contact{' '}
          <a href={`mailto:${MARKETING_EMAIL}`}>{MARKETING_EMAIL}</a> to make a
          request. We may need to verify your identity and coordinate with your
          workspace administrator for customer-controlled data.
        </p>

        <h2>Changes</h2>
        <p>
          We may update this policy as the product and legal requirements evolve.
          Material changes will be reflected on this page with an updated date.
        </p>
      </section>
    </>
  );
}
