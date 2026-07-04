/**
 * Shared constants for demo mode — the no-signup "try with a sample
 * library" flow. Kept separate from `appConstants.ts` so the generation
 * script (`scripts/build-demo-db.mjs`, which runs under plain Node, not
 * Next.js) and the app code can both reference the same output path
 * without either one importing the other's module graph.
 */

/** Public URL the sanitized demo database is served from and fetched from. */
export const DEMO_DATABASE_PATH = '/demo/KoboReader-demo.sqlite'
