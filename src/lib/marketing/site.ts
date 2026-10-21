export const SITE_NAME = 'Colabdeck';
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://colabdeck.com';
export const SITE_TAGLINE = 'One workspace for your team and your clients.';
export const SITE_DESCRIPTION =
  'Bring conversations, projects, files, and client delivery together in one organized workspace, with clear boundaries between internal work and what clients can see.';
export const MARKETING_EMAIL = 'hello@colabdeck.com';
export const DEVELOPER_NAME = 'CoderCart';
export const DEVELOPER_URL = 'https://codercart.com';

export const NAV_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
] as const;

export const FOOTER_GROUPS = [
  {
    title: 'Product',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/solutions', label: 'Solutions' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/security', label: 'Security' },
      { href: '/login', label: 'Sign in' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
      { href: '/book-a-demo', label: 'Book a demo' },
      { href: DEVELOPER_URL, label: 'CoderCart', external: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
] as const;

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
