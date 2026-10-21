import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/marketing/site';

const MARKETING_PATHS = [
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
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return MARKETING_PATHS.map((path) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    lastModified,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path === '/book-a-demo' ? 0.9 : 0.7,
  }));
}
