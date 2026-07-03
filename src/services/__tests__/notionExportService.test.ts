/**
 * Tests for the Notion export client service, focused on the error-recovery
 * paths added to fix dead-end failure states: an expired/revoked Notion
 * token surfacing as a typed error the UI can react to (instead of a
 * generic message with no way forward), and a stalled export stream being
 * reported as a timeout rather than silently hanging.
 *
 * Chapters in these tests intentionally contain no `type: 'markup'` notes so
 * `exportBookToNotion` skips the IndexedDB/image-compositing steps entirely
 * and only exercises the fetch-driven parts of the flow being tested here.
 */
import {
  fetchNotionPages,
  exportBookToNotion,
  NotionReauthRequiredError,
} from '../notionExportService'
import type { IBook, IBookChapter } from '@/types/kobo'

const makeChapter = (overrides: Partial<IBookChapter> = {}): IBookChapter => ({
  contentId: 'chapter-1',
  contentType: 899,
  bookId: 'book-1',
  bookTitle: 'Test Book',
  title: 'Chapter 1',
  chapterIdBookmarked: 'chapter-1',
  volumeIndex: 0,
  depth: 1,
  notes: [],
  ...overrides,
})

const book: IBook = { contentId: 'book-1', bookTitle: 'Test Book', author: 'Jane Doe' }

/** Encodes a list of SSE event payloads the same way the export route does. */
function sseBody(events: Array<Record<string, unknown>>): string {
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('')
}

/**
 * Builds a minimal fetch Response stand-in whose `body.getReader()` streams
 * the given SSE text in one chunk, matching the shape `exportBookToNotion`
 * consumes (`res.body.getReader().read()` in a loop).
 */
function makeStreamResponse(text: string) {
  const encoder = new TextEncoder()
  let delivered = false
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => {
          if (!delivered) {
            delivered = true
            return { done: false, value: encoder.encode(text) }
          }
          return { done: true, value: undefined }
        },
      }),
    },
  }
}

describe('fetchNotionPages', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns the page list on success', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ pages: [{ id: '1', title: 'Notes', lastEdited: '' }] }),
    } as Response)

    const pages = await fetchNotionPages()

    expect(pages).toEqual([{ id: '1', title: 'Notes', lastEdited: '' }])
  })

  it('throws NotionReauthRequiredError on a 401 reauth_required response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Notion connection expired. Please reconnect.', code: 'reauth_required' }),
    } as Response)

    await expect(fetchNotionPages()).rejects.toBeInstanceOf(NotionReauthRequiredError)
  })

  it('throws a generic Error for other failures (not a reauth prompt)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Failed to fetch pages: boom' }),
    } as Response)

    await expect(fetchNotionPages()).rejects.toThrow('Failed to fetch Notion pages')
    await expect(fetchNotionPages()).rejects.not.toBeInstanceOf(NotionReauthRequiredError)
  })
})

describe('exportBookToNotion', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('surfaces errorCode "reauth_required" when the export call itself is rejected with 401', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Notion connection expired', code: 'reauth_required' }),
    } as Response)

    const result = await exportBookToNotion(book, [makeChapter()], 'parent-page-id')

    expect(result).toEqual({
      success: false,
      error: 'Notion connection expired',
      errorCode: 'reauth_required',
    })
  })

  it('surfaces errorCode "reauth_required" when the token expires mid-stream', async () => {
    const body = sseBody([
      {
        stage: 'done',
        success: false,
        error: 'Your Notion connection has expired. Please reconnect and try again.',
        code: 'reauth_required',
      },
    ])
    jest.spyOn(global, 'fetch').mockResolvedValue(makeStreamResponse(body) as unknown as Response)

    const result = await exportBookToNotion(book, [makeChapter()], 'parent-page-id')

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('reauth_required')
    expect(result.error).toMatch(/expired/)
  })

  it('reports a timeout-style error when the stream ends without a final "done" event', async () => {
    // Simulates a Vercel function timeout: progress events arrive but the
    // connection closes before the server can send its final result.
    const body = sseBody([{ stage: 'Adding content to page', current: 1, total: 10 }])
    jest.spyOn(global, 'fetch').mockResolvedValue(makeStreamResponse(body) as unknown as Response)

    const result = await exportBookToNotion(book, [makeChapter()], 'parent-page-id')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/interrupted before completion/)
  })

  it('returns success with pageUrl when the export completes normally', async () => {
    const body = sseBody([
      { stage: 'done', success: true, pageUrl: 'https://notion.so/abc123' },
    ])
    jest.spyOn(global, 'fetch').mockResolvedValue(makeStreamResponse(body) as unknown as Response)

    const result = await exportBookToNotion(book, [makeChapter()], 'parent-page-id')

    expect(result).toEqual({ success: true, pageUrl: 'https://notion.so/abc123', imagesFailed: undefined })
  })
})
