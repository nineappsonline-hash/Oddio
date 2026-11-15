import type { MetadataRoute } from 'next';
import { seoAbsoluteUrl as absoluteUrl } from '@/lib/seo-origin';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/*/login',
          '/*/signup',
          '/*/library',
          '/*/settings',
          '/*/notifications',
          '/*/studio',
          '/*/admin',
          '/*/search',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
