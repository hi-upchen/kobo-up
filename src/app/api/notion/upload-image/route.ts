import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { getNotionSession } from '@/lib/notion/session'

const MAX_IMAGE_SIZE = 20 * 1024 * 1024 // 20MB (Notion single_part limit)

export async function POST(request: NextRequest) {
  const session = await getNotionSession()
  if (!session) {
    return NextResponse.json(
      { error: 'Not connected to Notion' },
      { status: 401 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'Missing file field' },
      { status: 400 }
    )
  }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Only image files are accepted' },
      { status: 400 }
    )
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json(
      { error: 'File too large (max 20MB)' },
      { status: 400 }
    )
  }

  const notion = new Client({ auth: session.notionAccessToken })

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notionAny = notion as any
    const filename = file.name || 'annotation.jpg'

    const fileUpload = await notionAny.fileUploads.create({
      mode: 'single_part',
    })
    const fileUploadId = fileUpload?.id
    if (!fileUploadId) {
      return NextResponse.json(
        { error: 'File upload creation failed' },
        { status: 502 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: file.type || 'image/jpeg' })
    await notionAny.fileUploads.send({
      file_upload_id: fileUploadId,
      file: { filename, data: blob },
    })

    return NextResponse.json({ fileUploadId })
  } catch (err) {
    // Forward Notion 429 rate limit to client with Retry-After header
    if (err && typeof err === 'object' && 'status' in err && err.status === 429) {
      // Notion SDK errors expose headers as a plain object, not a Headers instance
      const headers = 'headers' in err && err.headers && typeof err.headers === 'object'
        ? err.headers as Record<string, string>
        : null
      const retryAfter = headers?.['retry-after'] ?? null
      return NextResponse.json(
        { error: 'Rate limited by Notion' },
        {
          status: 429,
          headers: { 'Retry-After': retryAfter || '1' },
        }
      )
    }
    console.error('[Notion upload] Image upload failed:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'Image upload failed' },
      { status: 502 }
    )
  }
}
