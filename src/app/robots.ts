/**
 * Generates /robots.txt via the Next.js metadata file convention.
 * Allows all crawlers on public pages, blocks the API routes (Notion OAuth,
 * debug-upload endpoints have no SEO value), and advertises the sitemap.
 */
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: 'https://kobo-up.runawayup.com/sitemap.xml',
  };
}
