import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import type { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints'
import { getNotionSession } from '@/lib/notion/session'
import { buildBookPageBlocks } from '@/utils/notionBlockBuilder'
import { IBookChapter } from '@/types/kobo'

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
  const BATCH_SIZE = 50
  let totalCreated = 0
  const totalBlocks = blocks.length

  onProgress?.(0, totalBlocks)

  for (let i = 0; i < blocks.length; i += BATCH_SIZE) {
    if (isAborted()) break
    const batch = blocks.slice(i, i + BATCH_SIZE)
    await notion.blocks.children.append({
      block_id: blockId,
      children: batch as BlockObjectRequest[],
    })
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
  if (imageEntries.length > 200) {
    return NextResponse.json(
      { error: 'Too many image uploads (max 200)' },
      { status: 400 }
    )
  }
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

      try {
        // Create Notion page
        sendEvent({ stage: 'Creating page...', current: 0, total: 0 })
        const page = await notion.pages.create({
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
        sendEvent({
          stage: 'done',
          success: false,
          error: `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}. A partial page may have been created in Notion.`,
        })
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
