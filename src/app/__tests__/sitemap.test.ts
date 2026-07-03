/**
 * Verifies sitemap.ts lists exactly the indexable pages (only the homepage —
 * book/notes pages render from client-side state and are not crawlable).
 */
import sitemap from '../sitemap';

describe('sitemap', () => {
  it('lists only the homepage with weekly change frequency', () => {
    const result = sitemap();
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://kobo-up.runawayup.com');
    expect(result[0].changeFrequency).toBe('weekly');
  });
});
