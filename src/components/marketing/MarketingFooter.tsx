import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import {
  DEVELOPER_NAME,
  DEVELOPER_URL,
  FOOTER_GROUPS,
  MARKETING_EMAIL,
  SITE_DESCRIPTION,
} from '@/lib/marketing/site';

function SocialIcon({
  label,
  href,
  children,
}: {
  label: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <a href={href} rel="noopener noreferrer" target="_blank" aria-label={label}>
      {children}
    </a>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-shell mk-footer__grid">
        <div className="mk-footer__brand">
          <Logo />
          <p>{SITE_DESCRIPTION}</p>
          <div className="mk-footer__social">
            <SocialIcon label="Colabdeck on LinkedIn" href="https://www.linkedin.com/">
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
                <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V23h-4v-6.6c0-1.57-.03-3.6-2.2-3.6-2.2 0-2.54 1.72-2.54 3.5V23h-4V8.5z" />
              </svg>
            </SocialIcon>
            <SocialIcon label="Colabdeck on X" href="https://x.com/">
              <span className="mk-footer__x" aria-hidden="true">
                𝕏
              </span>
            </SocialIcon>
            <SocialIcon label="Colabdeck on YouTube" href="https://www.youtube.com/">
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.2 3.5-6.2 3.5z" />
              </svg>
            </SocialIcon>
          </div>
          <p className="mk-footer__partner">
            Built by{' '}
            <a href={DEVELOPER_URL} rel="noopener noreferrer" target="_blank">
              {DEVELOPER_NAME}
            </a>
          </p>
        </div>

        {FOOTER_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mk-footer__heading">{group.title}</p>
            <ul className="mk-footer__list">
              {group.links.map((link) => (
                <li key={link.href}>
                  {'external' in link && link.external ? (
                    <a href={link.href} rel="noopener noreferrer" target="_blank">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href}>{link.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="mk-footer__subscribe">
          <p className="mk-footer__heading">Subscribe to updates</p>
          <p className="mk-footer__subscribe-copy">
            Product notes and rollout tips. No spam.
          </p>
          <p className="mk-footer__subscribe-copy">
            Email{' '}
            <a href={`mailto:${MARKETING_EMAIL}`}>{MARKETING_EMAIL}</a>
            {' '}or{' '}
            <Link href="/contact">contact us</Link>.
          </p>
          <Link href="/book-a-demo" className="mk-btn mk-btn--sm">
            Book a demo
          </Link>
        </div>
      </div>

      <div className="mk-shell mk-footer__bottom">
        <p>© {new Date().getFullYear()} Colabdeck. All rights reserved.</p>
      </div>
    </footer>
  );
}
