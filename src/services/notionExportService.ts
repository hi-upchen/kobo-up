import type { IBook, IBookChapter } from '@/types/kobo'
import { getMarkupFilesByIds } from '@/services/markupService'
import { compositeMarkupImage } from '@/utils/imageCompositor'

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

/**
 * Export a book (with chapters and markup images) to a Notion page.
 * Uses SSE streaming to report server-side progress.
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

  // 4. Build FormData
  onProgress?.('Preparing export...', 0, 1)
  const formData = new FormData()

  const bookData = {
    bookTitle: book.bookTitle ?? book.title ?? 'Untitled',
    author: book.author ?? 'Unknown',
    chapters,
    parentPageId,
  }
  formData.append('bookData', JSON.stringify(bookData))

  Array.from(composited.entries()).forEach(([bookmarkId, blob]) => {
    formData.append(`image_${bookmarkId}`, blob, `${bookmarkId}.jpg`)
  })

  // 5. POST to export API and read SSE stream for server-side progress
  onProgress?.('Sending to Notion...', 0, 1)
  const res = await fetch('/api/notion/export', {
    method: 'POST',
    body: formData,
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
