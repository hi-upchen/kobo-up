import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import type { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints'
import { getNotionSession, clearNotionSession } from '@/lib/notion/session'
import { isNotionAuthError, withNotionRateLimitRetry } from '@/lib/notion/retry'
import { buildBookPageBlocks } from '@/utils/notionBlockBuilder'
import { IBookChapter } from '@/types/kobo'

// Allow up to 180s for very large books. Real-world: ~1500 blocks = 40s,
// so 180s leaves headroom for ~6000+ block books before hitting the limit.
// (Vercel limits: Hobby 300s, Pro 800s.)
export const maxDuration = 180

interface ExportBookData {
  bookTitle: string
  author: string
  chapters: IBookChapter[]
  parentPageId: string
  /** Map of bookmarkId → Notion fileUploadId (pre-uploaded via /api/notion/upload-image) */
  imageUploads?: Record<string, string>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotionBlock = Record<string, any>

function buildAuthorBlock(author: string): NotionBlock {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: { content: author },
          annotations: { italic: true, color: 'gray' },
        },
      ],
    },
  }
}

function buildDividerBlock(): NotionBlock {
  return {
    object: 'block',
    type: 'divider',
    divider: {},
  }
}

function cleanMetaFields(block: NotionBlock): NotionBlock {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _meta, ...cleaned } = block
  return cleaned
}

function buildNotionImageBlock(fileUploadId: string): NotionBlock {
  return {
    object: 'block',
    type: 'image',
    image: {
      type: 'file_upload',
      file_upload: { id: fileUploadId },
    },
  }
}

async function appendBlocksInBatches(
  notion: Client,
  blockId: string,
  blocks: NotionBlock[],
  isAborted: () => boolean,
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  const BATCH_SIZE = 100 // Notion API max (per append_block_children endpoint docs)
  let totalCreated = 0
  const totalBlocks = blocks.length

  onProgress?.(0, totalBlocks)

  for (let i = 0; i < blocks.length; i += BATCH_SIZE) {
    if (isAborted()) break
    const batch = blocks.slice(i, i + BATCH_SIZE)
    // Retry on transient 429s so one rate-limited batch doesn't fail an
    // otherwise-successful large export (books can need dozens of batches).
    await withNotionRateLimitRetry(() =>
      notion.blocks.children.append({
        block_id: blockId,
        children: batch as BlockObjectRequest[],
      })
    )
    totalCreated += batch.length
    onProgress?.(totalCreated, totalBlocks)
  }

  return totalCreated
}

const MAX_BODY_SIZE = 5 * 1024 * 1024 // 5MB
const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  const session = await getNotionSession()
  if (!session) {
    return NextResponse.json(
      { error: 'Not connected to Notion' },
      { status: 401 }
    )
  }

  const notion = new Client({ auth: session.notionAccessToken })

  let bookData: ExportBookData

  try {
    // Best-effort size check — Vercel enforces the hard limit at the infra level.
    // Content-Length can be absent or spoofed; this rejects obviously oversized requests early.
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10)
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request payload too large' },
        { status: 400 }
      )
    }

    bookData = await request.json() as ExportBookData

    if (!bookData.bookTitle || !bookData.parentPageId || !bookData.chapters) {
      return NextResponse.json(
        { error: 'Missing required fields: bookTitle, parentPageId, chapters' },
        { status: 400 }
      )
    }

    if (!UUID_RE.test(bookData.parentPageId)) {
      return NextResponse.json(
        { error: 'Invalid parentPageId format' },
        { status: 400 }
      )
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid request data: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 400 }
    )
  }

  const imageUploads = bookData.imageUploads ?? {}
  const imageEntries = Object.entries(imageUploads)
  for (const [, id] of imageEntries) {
    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { error: 'Invalid fileUploadId format in imageUploads' },
        { status: 400 }
      )
    }
  }

  // Use streaming response to report progress
  const encoder = new TextEncoder()
  let aborted = false
  const stream = new ReadableStream({
    cancel() {
      aborted = true
    },
    async start(controller) {
      function sendEvent(data: Record<string, unknown>) {
        if (aborted) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Tracks whether notion.pages.create() succeeded, so a later failure can
      // accurately say whether a partial page exists in the user's Notion
      // workspace instead of always guessing "may have been created".
      let pageCreated = false

      try {
        // Create Notion page
        sendEvent({ stage: 'Creating page...', current: 0, total: 0 })
        const page = await withNotionRateLimitRetry(() =>
          notion.pages.create({
            parent: { page_id: bookData.parentPageId },
            properties: {
              title: {
                title: [{ text: { content: bookData.bookTitle.slice(0, 2000) } }],
              },
            },
            children: [
              ...(bookData.author ? [buildAuthorBlock(bookData.author)] : []),
              buildDividerBlock(),
            ] as BlockObjectRequest[],
          })
        )

        pageCreated = true
        const pageId = page.id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageUrl = (page as any).url as string | undefined

        // Build blocks from chapters
        const rawBlocks = buildBookPageBlocks(bookData.chapters)

        // Process markup placeholders: replace with uploaded image blocks
        const processedBlocks: NotionBlock[] = []
        for (const block of rawBlocks) {
          if (aborted) break
          if (block._meta?.isMarkup) {
            const bookmarkId = block._meta.bookmarkId as string
            const fileUploadId = imageUploads[bookmarkId]
            if (fileUploadId) {
              processedBlocks.push(buildNotionImageBlock(fileUploadId))
            } else {
              // No upload available: keep text placeholder, strip _meta
              processedBlocks.push(cleanMetaFields(block))
            }
          } else {
            processedBlocks.push(cleanMetaFields(block))
          }
        }

        // Append blocks in batches
        const blocksCreated = await appendBlocksInBatches(
          notion,
          pageId,
          processedBlocks,
          () => aborted,
          (current, total) => {
            sendEvent({ stage: 'Adding content to page', current, total })
          }
        )

        sendEvent({
          stage: 'done',
          success: true,
          pageUrl: pageUrl ?? `https://notion.so/${pageId.replace(/-/g, '')}`,
          pageId,
          blocksCreated,
        })
      } catch (err) {
        console.error('Notion export error:', err)

        if (isNotionAuthError(err)) {
          // The token was valid enough to pass getNotionSession() but Notion
          // rejected it mid-export (revoked/expired). Clear the session so the
          // client stops showing "connected" and surface a `code` the client
          // can key off of to offer a one-click reconnect instead of a dead
          // end error message.
          await clearNotionSession()
          sendEvent({
            stage: 'done',
            success: false,
            error: 'Your Notion connection has expired. Please reconnect and try again.',
            code: 'reauth_required',
          })
        } else {
          const partialPageNote = pageCreated
            ? ' A partial page was created in Notion — check your workspace before retrying to avoid a duplicate.'
            : ' No page was created in Notion; it is safe to retry.'
          sendEvent({
            stage: 'done',
            success: false,
            error: `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}.${partialPageNote}`,
          })
        }
      } finally {
        try { controller.close() } catch { /* already closed */ }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
