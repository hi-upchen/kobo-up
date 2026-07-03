/**
 * Verifies robots.ts allows crawling of public pages, blocks API routes,
 * and points crawlers at the sitemap.
 */
import robots from '../robots';

describe('robots', () => {
  it('allows all user agents, disallows /api/, and links the sitemap', () => {
    const result = robots();
    expect(result.rules).toEqual({ userAgent: '*', allow: '/', disallow: '/api/' });
    expect(result.sitemap).toBe('https://kobo-up.runawayup.com/sitemap.xml');
  });
});
