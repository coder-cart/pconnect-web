import type { Metadata } from 'next';
import { Outfit, Source_Sans_3 } from 'next/font/google';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { JsonLd } from '@/components/marketing/JsonLd';
import {
  organizationJsonLd,
  websiteJsonLd,
} from '@/lib/marketing/seo';
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
} from '@/lib/marketing/site';
import '@/components/marketing/marketing.css';

const displayFont = Outfit({
  subsets: ['latin'],
  variable: '--font-marketing-display',
  display: 'swap',
});

const bodyFont = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-marketing-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`mk-root ${displayFont.variable} ${bodyFont.variable}`}
      data-theme="light"
    >
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <MarketingHeader />
      <main id="main-content">{children}</main>
      <MarketingFooter />
    </div>
  );
}
