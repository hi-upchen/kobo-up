/**
 * Verifies sitemap.ts lists exactly the indexable pages (the homepage, the
 * static privacy page, and the three statically rendered SEO guide pages —
 * book/notes pages render from client-side state and are not crawlable).
 */
import sitemap from '../sitemap';

const GUIDE_URLS = [
  'https://kobo-up.runawayup.com/guides/kobo-export-not-working',
  'https://kobo-up.runawayup.com/guides/export-kobo-highlights-to-notion',
  'https://kobo-up.runawayup.com/guides/export-kobo-highlights-to-markdown-obsidian',
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

  it('lists all three guide pages with monthly change frequency', () => {
    const result = sitemap();
    for (const url of GUIDE_URLS) {
      const entry = result.find((item) => item.url === url);
      expect(entry).toBeDefined();
      expect(entry?.changeFrequency).toBe('monthly');
    }
  });

  it('lists exactly five pages', () => {
    const result = sitemap();
    expect(result).toHaveLength(5);
  });
});
