/**
 * Generates /sitemap.xml via the Next.js metadata file convention.
 * Lists the homepage, the static privacy page, and the statically rendered
 * SEO guide pages under /guides, and every article in content/articles.
 * The books and notes pages render from client-side state (an uploaded
 * SQLite file) and have no crawlable content.
 */
import { MetadataRoute } from 'next';
import { getAllArticles } from '@/lib/articles';

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
    ...getAllArticles().map((article) => ({
      url: article.canonicalUrl,
      lastModified: article.updated ?? article.date,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
