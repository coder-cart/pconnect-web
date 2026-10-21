import Link from 'next/link';

interface MarketingCtaProps {
  title?: string;
  description?: string;
}

export function MarketingCta({
  title = 'Ready to streamline your client work?',
  description = 'Book a walkthrough and see chat, projects, client visibility, files, and finance in one workspace.',
}: MarketingCtaProps) {
  return (
    <section className="mk-cta-band" aria-labelledby="mk-cta-heading">
      <div className="mk-shell mk-cta-band__inner mk-cta-band__inner--center">
        <div>
          <h2 id="mk-cta-heading">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="mk-cta-band__actions">
          <Link href="/book-a-demo" className="mk-btn mk-btn--light">
            Book a demo
          </Link>
          <Link href="/contact" className="mk-btn mk-btn--ghost">
            Contact sales
          </Link>
        </div>
      </div>
    </section>
  );
}
