/**
 * Generates /sitemap.xml via the Next.js metadata file convention.
 * Lists only the homepage: the books/notes pages render entirely from
 * client-side state (an uploaded SQLite file) and have no crawlable content.
 */
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://kobo-up.runawayup.com',
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
