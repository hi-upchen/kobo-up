/**
 * Generates /sitemap.xml via the Next.js metadata file convention.
 * Lists the homepage, the static privacy page, and the statically rendered
 * SEO guide pages under /guides: the books/notes pages render entirely from
 * client-side state (an uploaded SQLite file) and have no crawlable content.
 */
import { MetadataRoute } from 'next';

const GUIDE_SLUGS = [
  'kobo-export-not-working',
  'export-kobo-highlights-to-notion',
  'export-kobo-highlights-to-markdown-obsidian',
  'export-kobo-handwritten-notes',
];

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
    ...GUIDE_SLUGS.map((slug) => ({
      url: `https://kobo-up.runawayup.com/guides/${slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
