/**
 * Generates /sitemap.xml via the Next.js metadata file convention.
 * Lists the homepage, the static privacy page, and the statically rendered
 * SEO guide pages under /guides, and every article in content/articles.
 * The books and notes pages render from client-side state (an uploaded
 * SQLite file) and have no crawlable content.
 */
import { MetadataRoute } from 'next';
import { getAllArticles } from '@/lib/articles';

// Each date is the day the page's source files last changed in git.
// Update the date in the same commit that changes the page.
// Home: src/app/(landing)/ and src/app/components/FAQ.tsx, commit 51e62cd (2026-11-06).
// Privacy: src/app/privacy/, commit 79929da (2026-10-20).
// Guides: src/app/guides/<slug>/, commit 9fa1f85 (2026-07-05) for all four.
const HOME_LAST_MODIFIED = '2026-11-06';
const PRIVACY_LAST_MODIFIED = '2026-10-20';
const GUIDES_LAST_MODIFIED = '2026-07-05';

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
      lastModified: HOME_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://kobo-up.runawayup.com/privacy',
      lastModified: PRIVACY_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    ...GUIDE_SLUGS.map((slug) => ({
      url: `https://kobo-up.runawayup.com/guides/${slug}`,
      lastModified: GUIDES_LAST_MODIFIED,
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
