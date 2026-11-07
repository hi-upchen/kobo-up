/**
 * Verifies sitemap.ts lists exactly the indexable pages (the homepage, the
 * static privacy page, and the statically rendered SEO guide pages —
 * book/notes pages render from client-side state and are not crawlable).
 */
import sitemap from '../sitemap';
import { getAllArticles } from '@/lib/articles';

jest.mock('@/lib/articles', () => ({ getAllArticles: jest.fn(() => []) }));
const mockedGetAllArticles = getAllArticles as jest.Mock;


const GUIDE_URLS = [
  'https://kobo-up.runawayup.com/guides/kobo-export-not-working',
  'https://kobo-up.runawayup.com/guides/export-kobo-highlights-to-notion',
  'https://kobo-up.runawayup.com/guides/export-kobo-highlights-to-markdown-obsidian',
  'https://kobo-up.runawayup.com/guides/export-kobo-handwritten-notes',
];

describe('sitemap', () => {
  it('lists the homepage with weekly change frequency', () => {
    const result = sitemap();
    expect(result[0].url).toBe('https://kobo-up.runawayup.com');
    expect(result[0].changeFrequency).toBe('weekly');
  });

  it('lists the privacy page', () => {
    const result = sitemap();
    const privacyEntry = result.find((entry) => entry.url.endsWith('/privacy'));
    expect(privacyEntry).toBeDefined();
    expect(privacyEntry?.changeFrequency).toBe('monthly');
  });

  it('lists all guide pages with monthly change frequency', () => {
    const result = sitemap();
    for (const url of GUIDE_URLS) {
      const entry = result.find((item) => item.url === url);
      expect(entry).toBeDefined();
      expect(entry?.changeFrequency).toBe('monthly');
    }
  });

  it('lists exactly six pages when content/articles has no articles', () => {
    const result = sitemap();
    expect(result).toHaveLength(6);
  });

  it('gives every entry a fixed YYYY-MM-DD last-modified date', () => {
    for (const entry of sitemap()) {
      expect(entry.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('uses the article updated date, else its date', () => {
    mockedGetAllArticles.mockReturnValueOnce([
      { canonicalUrl: 'https://kobo-up.runawayup.com/articles/a', date: '2026-01-01', updated: '2026-02-02' },
      { canonicalUrl: 'https://kobo-up.runawayup.com/articles/b', date: '2026-03-03' },
    ]);
    const result = sitemap();
    expect(result.find((e) => e.url.endsWith('/articles/a'))?.lastModified).toBe('2026-02-02');
    expect(result.find((e) => e.url.endsWith('/articles/b'))?.lastModified).toBe('2026-03-03');
  });
});
