/**
 * Tests for the client-side bulk Notion export orchestrator. This is the
 * load-bearing verification for the "bulk export to Notion" feature: the
 * loop that decides ordering, failure handling, and cancellation never
 * touches `fetch` directly (that lives inside `exportBookToNotion`), so
 * every test here injects a fake `exportBook` hook instead of mocking
 * `fetch` — that keeps the tests focused on the orchestration decisions
 * (sequential order, continue-on-failure, abort-on-reauth_required, cancel
 * between books) rather than re-testing the already-covered per-book fetch
 * plumbing in `notionExportService.test.ts`.
 */
import { runBulkNotionExport, type BulkExportHooks } from '../notionBulkExportService'
import type { IBook, IBookChapter } from '@/types/kobo'
import type { NotionExportResult } from '../notionExportService'

const makeBook = (contentId: string, title?: string): IBook => ({
  contentId,
  bookTitle: title ?? `Book ${contentId}`,
})

const makeChapters = (contentId: string): IBookChapter[] => [
  {
    contentId: `${contentId}-ch1`,
    contentType: 899,
    bookId: contentId,
    bookTitle: `Book ${contentId}`,
    title: 'Chapter 1',
    chapterIdBookmarked: `${contentId}-ch1`,
    volumeIndex: 0,
    depth: 1,
    notes: [],
  },
]

/** Builds a `loadChapters` hook that records call order and returns per-book chapters. */
function trackingLoadChapters(calls: string[]) {
  return async (contentId: string): Promise<IBookChapter[]> => {
    calls.push(contentId)
    return makeChapters(contentId)
  }
}

describe('runBulkNotionExport', () => {
  const PARENT_PAGE_ID = 'parent-page-1'
  const neverCancel = () => false

  it('exports books sequentially, one at a time, in array order', async () => {
    const started: string[] = []
    const inFlightAtStart: number[] = []
    let currentlyInFlight = 0

    const exportBook = jest.fn(async (book: IBook): Promise<NotionExportResult> => {
      currentlyInFlight++
      inFlightAtStart.push(currentlyInFlight)
      // Yield to the microtask queue so any accidental parallelism would show up
      // as more than one book in flight at once.
      await Promise.resolve()
      currentlyInFlight--
      return { success: true, pageUrl: `https://notion.so/${book.contentId}` }
    })

    const books = [makeBook('a'), makeBook('b'), makeBook('c')]
    const hooks: BulkExportHooks = {
      loadChapters: trackingLoadChapters(started),
      exportBook,
    }

    const summary = await runBulkNotionExport(books, PARENT_PAGE_ID, neverCancel, hooks)

    expect(started).toEqual(['a', 'b', 'c'])
    expect(exportBook).toHaveBeenCalledTimes(3)
    // Never more than one book in flight at a time.
    expect(inFlightAtStart.every((n) => n === 1)).toBe(true)
    expect(summary.stoppedEarly).toBe(false)
    expect(summary.outcomes.map((o) => o.contentId)).toEqual(['a', 'b', 'c'])
    expect(summary.outcomes.every((o) => o.status === 'success')).toBe(true)
  })

  it('passes the same parentPageId to every book export call', async () => {
    const exportBook = jest.fn(async (): Promise<NotionExportResult> => ({ success: true }))
    const books = [makeBook('a'), makeBook('b')]

    await runBulkNotionExport(books, PARENT_PAGE_ID, neverCancel, {
      loadChapters: trackingLoadChapters([]),
      exportBook,
    })

    expect(exportBook).toHaveBeenNthCalledWith(1, books[0], expect.any(Array), PARENT_PAGE_ID, expect.any(Function))
    expect(exportBook).toHaveBeenNthCalledWith(2, books[1], expect.any(Array), PARENT_PAGE_ID, expect.any(Function))
  })

  it('continues past a non-reauth failure and still exports later books', async () => {
    const exportBook = jest.fn(async (book: IBook): Promise<NotionExportResult> => {
      if (book.contentId === 'b') {
        return { success: false, error: 'Notion API error' }
      }
      return { success: true, pageUrl: `https://notion.so/${book.contentId}` }
    })

    const books = [makeBook('a'), makeBook('b'), makeBook('c')]
    const summary = await runBulkNotionExport(books, PARENT_PAGE_ID, neverCancel, {
      loadChapters: trackingLoadChapters([]),
      exportBook,
    })

    expect(summary.stoppedEarly).toBe(false)
    expect(summary.skipped).toEqual([])
    expect(exportBook).toHaveBeenCalledTimes(3)
    expect(summary.outcomes).toEqual([
      expect.objectContaining({ contentId: 'a', status: 'success' }),
      expect.objectContaining({ contentId: 'b', status: 'failed', error: 'Notion API error' }),
      expect.objectContaining({ contentId: 'c', status: 'success' }),
    ])
  })

  it('treats a thrown exception from loadChapters as a per-book failure, not a crash', async () => {
    const exportBook = jest.fn(async (): Promise<NotionExportResult> => ({ success: true }))
    const books = [makeBook('a'), makeBook('b')]

    const loadChapters = async (contentId: string): Promise<IBookChapter[]> => {
      if (contentId === 'a') {
        throw new Error('Database not initialized')
      }
      return makeChapters(contentId)
    }

    const summary = await runBulkNotionExport(books, PARENT_PAGE_ID, neverCancel, {
      loadChapters,
      exportBook,
    })

    expect(summary.stoppedEarly).toBe(false)
    expect(summary.outcomes[0]).toEqual(
      expect.objectContaining({ contentId: 'a', status: 'failed', error: 'Database not initialized' })
    )
    expect(summary.outcomes[1]).toEqual(expect.objectContaining({ contentId: 'b', status: 'success' }))
    // The second book must still have been attempted despite the first throwing.
    expect(exportBook).toHaveBeenCalledTimes(1)
  })

  it('stops immediately on reauth_required and reports the remaining books as skipped', async () => {
    const exportBook = jest.fn(async (book: IBook): Promise<NotionExportResult> => {
      if (book.contentId === 'b') {
        return { success: false, error: 'Your Notion connection has expired.', errorCode: 'reauth_required' }
      }
      return { success: true }
    })

    const books = [makeBook('a'), makeBook('b'), makeBook('c'), makeBook('d')]
    const summary = await runBulkNotionExport(books, PARENT_PAGE_ID, neverCancel, {
      loadChapters: trackingLoadChapters([]),
      exportBook,
    })

    // Only 'a' and 'b' were attempted — 'c' and 'd' must never reach exportBook.
    expect(exportBook).toHaveBeenCalledTimes(2)
    expect(summary.stoppedEarly).toBe(true)
    expect(summary.stopReason).toBe('reauth_required')
    expect(summary.outcomes.map((o) => o.contentId)).toEqual(['a', 'b'])
    expect(summary.outcomes[1]).toEqual(
      expect.objectContaining({ contentId: 'b', status: 'failed', errorCode: 'reauth_required' })
    )
    expect(summary.skipped).toEqual(['c', 'd'])
  })

  it('stops between books when cancelled, leaving an in-progress book to finish', async () => {
    let cancelled = false
    const exportBook = jest.fn(async (book: IBook): Promise<NotionExportResult> => {
      if (book.contentId === 'a') {
        // Simulate the user clicking Cancel while book 'a' is still exporting.
        cancelled = true
      }
      return { success: true }
    })

    const books = [makeBook('a'), makeBook('b'), makeBook('c')]
    const summary = await runBulkNotionExport(books, PARENT_PAGE_ID, () => cancelled, {
      loadChapters: trackingLoadChapters([]),
      exportBook,
    })

    // 'a' was already in flight when cancellation was requested, so it completes.
    // 'b' and 'c' are never started.
    expect(exportBook).toHaveBeenCalledTimes(1)
    expect(summary.stoppedEarly).toBe(true)
    expect(summary.stopReason).toBe('cancelled')
    expect(summary.outcomes).toEqual([expect.objectContaining({ contentId: 'a', status: 'success' })])
    expect(summary.skipped).toEqual(['b', 'c'])
  })

  it('does not start any book when cancelled before the run begins', async () => {
    const exportBook = jest.fn(async (): Promise<NotionExportResult> => ({ success: true }))
    const books = [makeBook('a'), makeBook('b')]

    const summary = await runBulkNotionExport(books, PARENT_PAGE_ID, () => true, {
      loadChapters: trackingLoadChapters([]),
      exportBook,
    })

    expect(exportBook).not.toHaveBeenCalled()
    expect(summary.outcomes).toEqual([])
    expect(summary.stoppedEarly).toBe(true)
    expect(summary.stopReason).toBe('cancelled')
    expect(summary.skipped).toEqual(['a', 'b'])
  })

  it('returns an empty, non-stopped summary for an empty book list', async () => {
    const exportBook = jest.fn(async (): Promise<NotionExportResult> => ({ success: true }))

    const summary = await runBulkNotionExport([], PARENT_PAGE_ID, neverCancel, {
      loadChapters: trackingLoadChapters([]),
      exportBook,
    })

    expect(exportBook).not.toHaveBeenCalled()
    expect(summary).toEqual({ outcomes: [], stoppedEarly: false, skipped: [] })
  })

  it('carries pageUrl and imagesFailed through to the outcome on success', async () => {
    const exportBook = jest.fn(
      async (): Promise<NotionExportResult> => ({
        success: true,
        pageUrl: 'https://notion.so/abc123',
        imagesFailed: 2,
      })
    )

    const summary = await runBulkNotionExport([makeBook('a')], PARENT_PAGE_ID, neverCancel, {
      loadChapters: trackingLoadChapters([]),
      exportBook,
    })

    expect(summary.outcomes[0]).toEqual(
      expect.objectContaining({
        contentId: 'a',
        status: 'success',
        pageUrl: 'https://notion.so/abc123',
        imagesFailed: 2,
      })
    )
  })

  it('falls back to book.title, then "Untitled", when bookTitle is missing', async () => {
    const exportBook = jest.fn(async (): Promise<NotionExportResult> => ({ success: false, error: 'boom' }))
    const bookWithTitleOnly: IBook = { contentId: 'x', title: 'Only Title' }
    const bookWithNeither: IBook = { contentId: 'y' }

    const summary = await runBulkNotionExport(
      [bookWithTitleOnly, bookWithNeither],
      PARENT_PAGE_ID,
      neverCancel,
      { loadChapters: trackingLoadChapters([]), exportBook }
    )

    expect(summary.outcomes[0].bookTitle).toBe('Only Title')
    expect(summary.outcomes[1].bookTitle).toBe('Untitled')
  })

  it('invokes onBookStart, onBookProgress, and onBookSettled with correct index/total', async () => {
    const startCalls: Array<[string, number, number]> = []
    const settledCalls: Array<[string, number, number]> = []
    const progressCalls: Array<[string, string, number, number]> = []

    const exportBook = jest.fn(
      async (
        book: IBook,
        _chapters: IBookChapter[],
        _parentPageId: string,
        onProgress?: (stage: string, current: number, total: number) => void
      ): Promise<NotionExportResult> => {
        onProgress?.('Uploading images', 1, 2)
        return { success: true }
      }
    )

    const books = [makeBook('a'), makeBook('b')]
    await runBulkNotionExport(books, PARENT_PAGE_ID, neverCancel, {
      loadChapters: trackingLoadChapters([]),
      exportBook,
      onBookStart: (book, index, total) => startCalls.push([book.contentId, index, total]),
      onBookProgress: (book, stage, current, total) => progressCalls.push([book.contentId, stage, current, total]),
      onBookSettled: (outcome, index, total) => settledCalls.push([outcome.contentId, index, total]),
    })

    expect(startCalls).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
    ])
    expect(settledCalls).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
    ])
    expect(progressCalls).toEqual([
      ['a', 'Uploading images', 1, 2],
      ['b', 'Uploading images', 1, 2],
    ])
  })

  it('defaults exportBook to the real exportBookToNotion when no override is provided', async () => {
    // Verifies the production default wiring (no injected `exportBook`) without
    // needing a real Notion API — the underlying `fetch` call is mocked at the
    // boundary `exportBookToNotion` itself owns, same as notionExportService.test.ts.
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal error' }),
    } as Response)

    const summary = await runBulkNotionExport([makeBook('a')], PARENT_PAGE_ID, neverCancel, {
      loadChapters: trackingLoadChapters([]),
    })

    expect(fetchSpy).toHaveBeenCalledWith('/api/notion/export', expect.objectContaining({ method: 'POST' }))
    expect(summary.outcomes[0]).toEqual(expect.objectContaining({ contentId: 'a', status: 'failed' }))

    fetchSpy.mockRestore()
  })
})
