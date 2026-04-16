import type { IBook, IBookChapter } from '@/types/kobo'
import { getMarkupFilesByIds } from '@/services/markupService'
import { compositeMarkupImage } from '@/utils/imageCompositor'
import { concurrentMap } from '@/utils/concurrentMap'

export interface NotionConnectionStatus {
  connected: boolean
}

export interface NotionPage {
  id: string
  title: string
  lastEdited: string
}

export interface NotionExportResult {
  success: boolean
  pageUrl?: string
  error?: string
}

/**
 * Check if the user is connected to Notion via OAuth.
 */
export async function checkNotionConnection(): Promise<NotionConnectionStatus> {
  const res = await fetch('/api/notion/status')
  if (!res.ok) {
    return { connected: false }
  }
  return res.json()
}

/**
 * Disconnect the current Notion integration.
 */
export async function disconnectNotion(): Promise<void> {
  const res = await fetch('/api/notion/disconnect', { method: 'POST' })
  if (!res.ok) {
    throw new Error('Failed to disconnect from Notion')
  }
}

/**
 * Fetch the user's available Notion pages for export targeting.
 */
export async function fetchNotionPages(): Promise<NotionPage[]> {
  const res = await fetch('/api/notion/pages')
  if (!res.ok) {
    throw new Error('Failed to fetch Notion pages')
  }
  const data = await res.json()
  return data.pages as NotionPage[]
}

const UPLOAD_MAX_RETRIES = 3
const UPLOAD_BASE_DELAY_MS = 1000
const UPLOAD_MAX_DELAY_MS = 30_000
const UPLOAD_CONCURRENCY = 6

/**
 * Compute retry delay: use Retry-After header if available, otherwise exponential backoff.
 * Clamped to UPLOAD_MAX_DELAY_MS to prevent unbounded waits.
 */
function computeRetryDelay(attempt: number, retryAfterHeader: string | null): number {
  let delayMs: number
  if (retryAfterHeader) {
    const parsed = parseFloat(retryAfterHeader)
    delayMs = Number.isFinite(parsed) ? parsed * 1000 : UPLOAD_BASE_DELAY_MS * Math.pow(2, attempt)
  } else {
    delayMs = UPLOAD_BASE_DELAY_MS * Math.pow(2, attempt)
  }
  return Math.min(delayMs, UPLOAD_MAX_DELAY_MS)
}

/**
 * Upload a single image to Notion via the server-side upload endpoint.
 * Retries up to 3 times with exponential backoff; respects Retry-After on 429.
 * Returns the Notion fileUploadId or null on failure.
 */
async function uploadImageToNotion(blob: Blob, filename: string): Promise<string | null> {
  for (let attempt = 0; attempt <= UPLOAD_MAX_RETRIES; attempt++) {
    try {
      const formData = new FormData()
      formData.append('file', blob, filename)
      const res = await fetch('/api/notion/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        return data.fileUploadId ?? null
      }

      // Retry on 429 or 5xx; give up on other errors
      if (res.status !== 429 && res.status < 500) {
        return null
      }

      if (attempt < UPLOAD_MAX_RETRIES) {
        const delayMs = computeRetryDelay(attempt, res.headers.get('Retry-After'))
        await new Promise((r) => setTimeout(r, delayMs))
      }
    } catch {
      // Network error — retry with backoff
      if (attempt < UPLOAD_MAX_RETRIES) {
        const delayMs = computeRetryDelay(attempt, null)
        await new Promise((r) => setTimeout(r, delayMs))
      }
    }
  }
  return null
}

/**
 * Export a book (with chapters and markup images) to a Notion page.
 * Images are uploaded individually first, then bookData is sent as JSON.
 */
export async function exportBookToNotion(
  book: IBook,
  chapters: IBookChapter[],
  parentPageId: string,
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<NotionExportResult> {
  // 1. Collect all markup bookmarkIds
  const markupIds: string[] = []
  for (const chapter of chapters) {
    for (const note of chapter.notes) {
      if (note.type === 'markup') {
        markupIds.push(note.bookmarkId)
      }
    }
  }

  // 2. Load markup files from IndexedDB
  onProgress?.('Loading annotations...', 0, 1)
  const markupFiles = markupIds.length > 0
    ? await getMarkupFilesByIds(markupIds)
    : new Map()

  // 3. Composite each markup image, tracking progress
  const composited = new Map<string, Blob>()
  const markupEntries = Array.from(markupFiles.entries())
  const imageTotal = markupEntries.length

  for (let i = 0; i < markupEntries.length; i++) {
    const [bookmarkId, file] = markupEntries[i]
    onProgress?.('Processing images', i + 1, imageTotal)
    try {
      const blob = await compositeMarkupImage(file.jpg, file.svg)
      composited.set(bookmarkId, blob)
    } catch (err) {
      console.warn(`Failed to composite markup image for ${bookmarkId}:`, err)
    }
  }

  // 4. Upload images to Notion with sliding window concurrency
  const imageUploads: Record<string, string> = {}
  const compositedEntries = Array.from(composited.entries())
  const totalUploads = compositedEntries.length
  let uploadedCount = 0

  const uploadResults = await concurrentMap(
    compositedEntries,
    UPLOAD_CONCURRENCY,
    async ([bookmarkId, blob]) => {
      const fileUploadId = await uploadImageToNotion(blob, `${bookmarkId}.jpg`)
      const current = ++uploadedCount
      onProgress?.('Uploading images', current, totalUploads)
      return { bookmarkId, fileUploadId }
    }
  )
  for (const { bookmarkId, fileUploadId } of uploadResults) {
    if (fileUploadId) imageUploads[bookmarkId] = fileUploadId
  }

  // 5. Send JSON bookData with imageUploads map to export API
  onProgress?.('Sending to Notion...', 0, 1)

  const bookData = {
    bookTitle: book.bookTitle ?? book.title ?? 'Untitled',
    author: book.author ?? 'Unknown',
    chapters,
    parentPageId,
    imageUploads,
  }

  const res = await fetch('/api/notion/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookData),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return {
      success: false,
      error: body.error ?? `Export failed (${res.status})`,
    }
  }

  // Read SSE stream
  const reader = res.body?.getReader()
  if (!reader) {
    return { success: false, error: 'No response stream' }
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let result: NotionExportResult = { success: false, error: 'No response from server' }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const data = JSON.parse(line.slice(6))
        if (data.stage === 'done') {
          result = data.success
            ? { success: true, pageUrl: data.pageUrl }
            : { success: false, error: data.error }
        } else {
          onProgress?.(data.stage, data.current ?? 0, data.total ?? 0)
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  return result
}
