import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/marketing/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/features',
          '/solutions',
          '/pricing',
          '/about',
          '/contact',
          '/book-a-demo',
          '/security',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/dashboard',
          '/chat',
          '/projects',
          '/tasks',
          '/files',
          '/finance',
          '/clients',
          '/orders',
          '/production',
          '/admin',
          '/account',
          '/inbox',
          '/team',
          '/staff',
          '/qa',
          '/approvals',
          '/integrations',
          '/my-work',
          '/reports',
          '/api/',
          '/magic-login',
          '/reset-password',
          '/forgot-password',
          '/login',
          '/sign-in',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
