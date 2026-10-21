import Link from 'next/link';
import { JsonLd } from '@/components/marketing/JsonLd';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { breadcrumbJsonLd, marketingMetadata } from '@/lib/marketing/seo';

export const metadata = marketingMetadata({
  title: 'Security',
  description:
    'How Colabdeck approaches access control, client visibility, authentication, and auditability.',
  path: '/security',
});

export default function SecurityPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Security', path: '/security' },
        ])}
      />

      <section className="mk-page-hero">
        <div className="mk-shell">
          <h1>Security and access control</h1>
          <p>
            Colabdeck is built for businesses that collaborate with clients without
            flattening permission boundaries. The claims below reflect capabilities
            present in the product architecture — not unaudited compliance badges.
          </p>
        </div>
      </section>

      <section className="mk-shell mk-prose">
        <p className="mk-note">
          We do not claim SOC 2, ISO, HIPAA, or independent audit status on this
          page. Ask during a demo for the current assurance posture.
        </p>

        <h2>Authentication</h2>
        <p>
          Users sign in with password authentication or magic-link email flows.
          Password reset is supported. Session access tokens are short-lived with
          refresh handling in the application.
        </p>

        <h2>Roles and permissions</h2>
        <p>
          Sensitive reads and writes are gated by role-based permissions in the
          API and reflected in the UI. External clients receive a restricted
          collaboration experience.
        </p>

        <h2>Client visibility</h2>
        <p>
          Content can be scoped so internal notes, internal files, and restricted
          finance records are not exposed to clients. Shared channels, approved
          tasks, shared files, and onboarding items can be made client-visible
          intentionally.
        </p>

        <h2>Auditability</h2>
        <p>
          Sensitive actions such as permission and finance-related changes are
          designed to be auditable. Ask for details relevant to your compliance
          review during onboarding.
        </p>

        <h2>Responsible disclosure</h2>
        <p>
          If you believe you have found a security issue, contact{' '}
          <a href="mailto:hello@colabdeck.com">hello@colabdeck.com</a> with enough
          detail for investigation. Do not access data that is not yours.
        </p>

        <p>
          <Link href="/book-a-demo">Book a security-focused demo</Link>
        </p>
      </section>

      <MarketingCta />
    </>
  );
}
