/**
 * Verifies sitemap.ts lists exactly the indexable pages (the homepage and
 * the static privacy page — book/notes pages render from client-side state
 * and are not crawlable).
 */
import sitemap from '../sitemap';

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

  it('lists exactly two pages', () => {
    const result = sitemap();
    expect(result).toHaveLength(2);
  });
});
