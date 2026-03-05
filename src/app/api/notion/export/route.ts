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
  const { _meta, ...cleaned } = block
  void _meta
  return cleaned
}

async function tryUploadImage(
  notion: Client,
  file: File
): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notionAny = notion as any
    const filename = file.name || 'annotation.jpg'

    // Step 1: Create file upload (single_part for files < 20MB)
    // Ref: https://developers.notion.com/docs/uploading-small-files
    const fileUpload = await notionAny.fileUploads.create({
      mode: 'single_part',
    })
    const fileUploadId = fileUpload?.id
    if (!fileUploadId) throw new Error('File upload creation failed: no ID returned')

    // Step 2: Send the file data
    const arrayBuffer = await file.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: file.type || 'image/jpeg' })
    await notionAny.fileUploads.send({
      file_upload_id: fileUploadId,
      file: {
        filename,
        data: blob,
      },
    })

    // Step 3: Return ID — attach to block via image block type: 'file_upload'
    // No complete() needed for single_part mode
    return fileUploadId
  } catch (err) {
    console.error('[Notion upload] Image upload failed:', err instanceof Error ? err.message : err)
    return null
  }
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
  const imageFiles = new Map<string, File>()

  try {
    const formData = await request.formData()

    const bookDataRaw = formData.get('bookData')
    if (!bookDataRaw || typeof bookDataRaw !== 'string') {
      return NextResponse.json(
        { error: 'Missing bookData field' },
        { status: 400 }
      )
    }

    bookData = JSON.parse(bookDataRaw) as ExportBookData

    if (!bookData.bookTitle || !bookData.parentPageId || !bookData.chapters) {
      return NextResponse.json(
        { error: 'Missing required fields: bookTitle, parentPageId, chapters' },
        { status: 400 }
      )
    }

    // Validate parentPageId is a UUID
    const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i
    if (!UUID_RE.test(bookData.parentPageId)) {
      return NextResponse.json(
        { error: 'Invalid parentPageId format' },
        { status: 400 }
      )
    }

    // Collect image files keyed as image_{bookmarkId}
    formData.forEach((value, key) => {
      if (key.startsWith('image_') && value instanceof File) {
        const bookmarkId = key.replace('image_', '')
        imageFiles.set(bookmarkId, value)
      }
    })
    if (imageFiles.size > 200) {
      return NextResponse.json(
        { error: 'Too many image files (max 200)' },
        { status: 400 }
      )
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid request data: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 400 }
    )
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

        // Count total markup blocks for progress
        const markupBlocks = rawBlocks.filter(b => b._meta?.isMarkup)
        const totalImages = markupBlocks.length
        let uploadedCount = 0

        // Process markup placeholders: try to upload images
        const processedBlocks: NotionBlock[] = []
        for (const block of rawBlocks) {
          if (aborted) break
          if (block._meta?.isMarkup) {
            const bookmarkId = block._meta.bookmarkId as string
            const imageFile = imageFiles.get(bookmarkId)
            uploadedCount++
            sendEvent({ stage: 'Uploading images', current: uploadedCount, total: totalImages })

            if (imageFile) {
              const fileUploadId = await tryUploadImage(notion, imageFile)
              if (fileUploadId) {
                processedBlocks.push(buildNotionImageBlock(fileUploadId))
                continue
              }
            }
            // No image or upload failed: keep text placeholder, strip _meta
            processedBlocks.push(cleanMetaFields(block))
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
        controller.close()
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
