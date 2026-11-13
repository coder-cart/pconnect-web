import type { MetadataRoute } from 'next';
import { isStagingApp } from '@/lib/app-env';

export default function robots(): MetadataRoute.Robots {
  if (isStagingApp()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
  };
}
