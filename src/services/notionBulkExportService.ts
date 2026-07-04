/**
 * Client-side orchestration for exporting many books to Notion in one run.
 *
 * This intentionally does NOT introduce a server-side bulk endpoint: Vercel
 * functions have a hard 180s execution ceiling (see
 * `src/app/api/notion/export/route.ts`), and a single book's export can
 * already approach that limit for image-heavy books. A server-side loop over
 * many books would simply move the timeout problem rather than solve it. So
 * the loop lives here, in the browser, calling the existing per-book export
 * endpoint (via `exportBookToNotion`) once per book, sequentially.
 *
 * Sequential (not parallel) execution is also a deliberate choice — it stays
 * within Notion's API rate limits without needing our own throttling logic,
 * at the cost of total wall-clock time for large libraries.
 */
import type { IBook, IBookChapter } from '@/types/kobo'
import { exportBookToNotion, type NotionExportResult } from './notionExportService'

/** The outcome of exporting a single book within a bulk run. */
export interface BulkExportBookOutcome {
  contentId: string
  bookTitle: string
  status: 'success' | 'failed'
  /** Human-readable failure reason. Present only when `status` is `'failed'`. */
  error?: string
  /** Machine-readable error code from the export API, e.g. `'reauth_required'`. */
  errorCode?: string
  /** Notion page URL. Present only when `status` is `'success'`. */
  pageUrl?: string
  /** Count of markup images that failed to upload for this book (page itself still succeeded). */
  imagesFailed?: number
}

/** Why a bulk run stopped before processing every book. */
export type BulkExportStopReason = 'cancelled' | 'reauth_required'

/** Final report for a bulk export run. */
export interface BulkExportSummary {
  /** One entry per book that was actually attempted, in the order they were exported. */
  outcomes: BulkExportBookOutcome[]
  /** True if the run stopped before reaching the end of the book list. */
  stoppedEarly: boolean
  /** Set only when `stoppedEarly` is true. */
  stopReason?: BulkExportStopReason
  /** Content IDs of books that were never attempted because the run stopped early. */
  skipped: string[]
}

/**
 * Hooks that let the UI layer drive and observe a bulk export run, and let
 * tests substitute fakes for the real Kobo database and Notion API calls.
 */
export interface BulkExportHooks {
  /**
   * Loads the chapters (with attached notes/highlights) for one book, right
   * before it is exported. Kept as an injectable hook — rather than calling
   * `KoboService` directly — so unit tests can exercise the orchestration
   * loop without a real SQL.js database.
   */
  loadChapters: (contentId: string) => Promise<IBookChapter[]>
  /**
   * Exports one book to Notion. Defaults to the same function the per-book
   * export flow uses (`exportBookToNotion`); overridable in tests.
   */
  exportBook?: (
    book: IBook,
    chapters: IBookChapter[],
    parentPageId: string,
    onProgress?: (stage: string, current: number, total: number) => void
  ) => Promise<NotionExportResult>
  /** Called right before a book's export begins. */
  onBookStart?: (book: IBook, index: number, total: number) => void
  /** Called for in-flight stage updates (image upload progress, etc.) while a book is exporting. */
  onBookProgress?: (book: IBook, stage: string, current: number, total: number) => void
  /** Called once a book's export has settled (succeeded or failed). */
  onBookSettled?: (outcome: BulkExportBookOutcome, index: number, total: number) => void
}

/**
 * Reads the book's display title, falling back the same way the rest of the
 * export UI does when neither `bookTitle` nor `title` is set.
 */
function displayTitle(book: IBook): string {
  return book.bookTitle ?? book.title ?? 'Untitled'
}

/** Maps a single book's `NotionExportResult` to a `BulkExportBookOutcome`. */
function toOutcome(book: IBook, result: NotionExportResult): BulkExportBookOutcome {
  const bookTitle = displayTitle(book)
  if (result.success) {
    return {
      contentId: book.contentId,
      bookTitle,
      status: 'success',
      pageUrl: result.pageUrl,
      imagesFailed: result.imagesFailed,
    }
  }
  return {
    contentId: book.contentId,
    bookTitle,
    status: 'failed',
    error: result.error,
    errorCode: result.errorCode,
  }
}

/**
 * Exports a list of books to Notion, one at a time, as child pages under a
 * single chosen parent page.
 *
 * Failure semantics (see the file header for why this loop lives client-side):
 * - Any failure other than `reauth_required` is recorded for that book and
 *   the loop continues to the next book — one bad book should not block the
 *   rest of the library.
 * - A `reauth_required` failure means the stored Notion token is no longer
 *   valid, so every remaining book would fail identically. The loop stops
 *   immediately in that case and reports the untried books as skipped, so
 *   the UI can offer a single "Reconnect to Notion" action instead of N
 *   identical failures.
 * - The caller can request cancellation between books via `isCancelled`.
 *   This is checked before each book starts (not mid-book — a book that is
 *   already exporting is allowed to finish), so cancellation is clean: no
 *   partially-started book is left in an ambiguous state.
 *
 * @param books - Books to export, in the order they should be attempted.
 * @param parentPageId - Notion page ID every book will be created under as a child page.
 * @param isCancelled - Polled before each book starts; returning true stops the run.
 * @param hooks - Data-loading, export, and progress-reporting hooks (see {@link BulkExportHooks}).
 * @returns A summary of what succeeded, what failed and why, and what was skipped.
 */
export async function runBulkNotionExport(
  books: IBook[],
  parentPageId: string,
  isCancelled: () => boolean,
  hooks: BulkExportHooks
): Promise<BulkExportSummary> {
  const exportBook = hooks.exportBook ?? exportBookToNotion
  const outcomes: BulkExportBookOutcome[] = []
  const total = books.length

  for (let index = 0; index < total; index++) {
    if (isCancelled()) {
      return {
        outcomes,
        stoppedEarly: true,
        stopReason: 'cancelled',
        skipped: books.slice(index).map((b) => b.contentId),
      }
    }

    const book = books[index]
    hooks.onBookStart?.(book, index, total)

    let outcome: BulkExportBookOutcome
    try {
      const chapters = await hooks.loadChapters(book.contentId)
      const result = await exportBook(book, chapters, parentPageId, (stage, current, stageTotal) => {
        hooks.onBookProgress?.(book, stage, current, stageTotal)
      })
      outcome = toOutcome(book, result)
    } catch (err) {
      // A thrown exception (e.g. the chapter loader rejecting) is treated
      // the same as a failed export result for this one book — it must not
      // crash the whole bulk run.
      outcome = {
        contentId: book.contentId,
        bookTitle: displayTitle(book),
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unexpected error during export.',
      }
    }

    outcomes.push(outcome)
    hooks.onBookSettled?.(outcome, index, total)

    if (outcome.errorCode === 'reauth_required') {
      return {
        outcomes,
        stoppedEarly: true,
        stopReason: 'reauth_required',
        skipped: books.slice(index + 1).map((b) => b.contentId),
      }
    }
  }

  return { outcomes, stoppedEarly: false, skipped: [] }
}
