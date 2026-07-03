/**
 * Generates /sitemap.xml via the Next.js metadata file convention.
 * Lists the homepage and the static privacy page: the books/notes pages
 * render entirely from client-side state (an uploaded SQLite file) and have
 * no crawlable content.
 */
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://kobo-up.runawayup.com',
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://kobo-up.runawayup.com/privacy',
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}
