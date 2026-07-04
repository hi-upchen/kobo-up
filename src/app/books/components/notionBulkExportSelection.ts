/**
 * Shared helpers for persisting which books a bulk Notion export run should
 * cover across the full-page Notion OAuth redirect. The redirect (through
 * `/api/notion/auth` and back via `/api/notion/callback`) remounts the
 * `/books` page from scratch, so any in-memory selection state is lost — a
 * small `sessionStorage` note is the only way to resume the same run once
 * the user is back with a valid Notion session.
 */

/** Which selection mode launched a bulk export, mirroring the scope values `ExportActionBar` already uses for the Markdown/txt bulk export's `export_complete` event. */
export type BulkExportScope = 'all_books' | 'selected_books'

/** sessionStorage key holding the pending bulk-export book selection while the user is away for the Notion OAuth round trip. */
export const PENDING_SELECTION_STORAGE_KEY = 'kobo_bulk_notion_pending_selection'

/**
 * Saves the set of books a bulk export run should cover, so it can be
 * resumed after the user returns from connecting (or reconnecting) to
 * Notion.
 *
 * @param contentIds - Kobo content IDs of the books to resume exporting.
 * @param scope - Whether the original run was launched from "export all" or a specific selection.
 */
export function persistPendingBulkSelection(contentIds: string[], scope: BulkExportScope): void {
  sessionStorage.setItem(PENDING_SELECTION_STORAGE_KEY, JSON.stringify({ contentIds, scope }))
}

/**
 * Navigates the browser through the existing Notion OAuth connect flow,
 * returning to the given path afterwards. This is a full page navigation
 * (not a fetch) because Notion's OAuth flow is redirect-based.
 *
 * @param returnPath - Path (e.g. `/books`) the OAuth callback should send the browser back to.
 */
export function redirectToNotionAuth(returnPath: string): void {
  window.location.href = `/api/notion/auth?returnUrl=${encodeURIComponent(returnPath)}`
}
