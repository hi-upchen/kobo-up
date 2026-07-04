/**
 * Shared constants for demo mode — the no-signup "try with a sample
 * library" flow. Kept separate from `appConstants.ts` so the generation
 * script (`scripts/build-demo-db.mjs`, which runs under plain Node, not
 * Next.js) and the app code can both reference the same output path
 * without either one importing the other's module graph.
 */

/** Public URL the sanitized demo database is served from and fetched from. */
export const DEMO_DATABASE_PATH = '/demo/KoboReader-demo.sqlite'

/**
 * Identifier that ties the demo's one handwritten annotation together across
 * three places: the `Bookmark.BookmarkID` written into the demo database by
 * `scripts/build-demo-db.mjs`, the paired asset filenames under
 * `public/demo/markups/`, and the `KoboMarkups` IndexedDB key the notes page
 * reads it back by. All three MUST use this exact string. The build script
 * hard-codes the same literal (it runs under plain Node and cannot import
 * this module) — keep them in sync.
 */
export const DEMO_MARKUP_BOOKMARK_ID = 'demo-markup-alice-1'

/** Public URL of the demo handwriting stroke overlay (transparent SVG). */
export const DEMO_MARKUP_SVG_PATH = `/demo/markups/${DEMO_MARKUP_BOOKMARK_ID}.svg`

/** Public URL of the demo page-background image the strokes were drawn over. */
export const DEMO_MARKUP_JPG_PATH = `/demo/markups/${DEMO_MARKUP_BOOKMARK_ID}.jpg`
