import { JsonLd } from '@/components/marketing/JsonLd';
import { LeadForm } from '@/components/marketing/LeadForm';
import { breadcrumbJsonLd, marketingMetadata } from '@/lib/marketing/seo';

export const metadata = marketingMetadata({
  title: 'Book a demo',
  description:
    'Request a Colabdeck demo. We’ll follow up to schedule a personalized walkthrough of chat, projects, client visibility, and finance.',
  path: '/book-a-demo',
});

export default function BookADemoPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Book a demo', path: '/book-a-demo' },
        ])}
      />

      <section className="mk-shell mk-demo-layout" style={{ paddingTop: '2.5rem' }}>
        <div className="mk-demo-panel">
          <h1>See Colabdeck in action</h1>
          <p>
            Tell us about your team. We’ll follow up by email to schedule a short,
            personalized walkthrough — no fake calendar booking.
          </p>
          <ul>
            <li>Personalized product walkthrough</li>
            <li>Client visibility and permissions explained</li>
            <li>Modules matched to your workflow</li>
            <li>Clear next steps for evaluation</li>
          </ul>
        </div>

        <div className="mk-demo-card">
          <LeadForm type="demo" submitLabel="Request a demo" showExtras />
        </div>
      </section>
    </>
  );
}
