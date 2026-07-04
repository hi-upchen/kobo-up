'use client'

/**
 * Watches for the `?notion=connected` / `?notion=error` query params that
 * `/api/notion/callback` appends after a full-page OAuth round trip, and
 * resumes a bulk Notion export that was interrupted by that round trip.
 *
 * This only reacts to redirects the bulk-export flow itself triggered: the
 * flow persists the pending book selection to `sessionStorage` right before
 * navigating to `/api/notion/auth`, and this component only resumes when
 * that value is present. That keeps it from also intercepting the
 * unrelated per-book export flow on the book notes page, which uses the
 * same query param convention but returns to a different URL.
 *
 * Must be rendered inside a `<Suspense>` boundary — `useSearchParams`
 * requires one, same as the equivalent handler on the book notes page
 * (`src/app/book/[contentId]/notes/page.tsx`).
 */
import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import type { IBook } from '@/types/kobo'
import type { BulkExportScope } from './notionBulkExportSelection'
import { PENDING_SELECTION_STORAGE_KEY } from './notionBulkExportSelection'

interface PendingSelection {
  contentIds: string[]
  scope: BulkExportScope
}

interface NotionOAuthReturnHandlerProps {
  /** The library's full book list, used to re-resolve the persisted content IDs back into `IBook` objects. */
  books: IBook[]
  /** Called with the resumed book subset and its original scope when the OAuth round trip succeeded. */
  onResume: (books: IBook[], scope: BulkExportScope) => void
  /** Called when the OAuth round trip itself failed (Notion returned an error, or the user denied access). */
  onError: () => void
}

/**
 * Renders nothing — its only job is the side effect of detecting and
 * consuming the post-OAuth redirect exactly once per page load.
 */
export function NotionOAuthReturnHandler({ books, onResume, onError }: NotionOAuthReturnHandlerProps) {
  const searchParams = useSearchParams()
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    const notionParam = searchParams.get('notion')
    if (!notionParam) return

    handledRef.current = true

    // Always strip the query param once observed, regardless of whether we
    // end up resuming anything below, so it never lingers in the URL.
    const url = new URL(window.location.href)
    url.searchParams.delete('notion')
    window.history.replaceState({}, '', url.toString())

    const raw = sessionStorage.getItem(PENDING_SELECTION_STORAGE_KEY)
    if (!raw) return
    sessionStorage.removeItem(PENDING_SELECTION_STORAGE_KEY)

    if (notionParam === 'error') {
      onError()
      return
    }

    if (notionParam === 'connected') {
      try {
        const pending = JSON.parse(raw) as PendingSelection
        const resumedBooks = books.filter((book) => pending.contentIds.includes(book.contentId))
        if (resumedBooks.length > 0) {
          onResume(resumedBooks, pending.scope)
        }
      } catch {
        // Malformed sessionStorage payload (should not happen since we only
        // ever write it ourselves) — nothing to resume.
      }
    }
  }, [searchParams, books, onResume, onError])

  return null
}
