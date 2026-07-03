import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { getNotionSession, clearNotionSession } from '@/lib/notion/session'
import { isNotionAuthError } from '@/lib/notion/retry'

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
  if (!ALLOWED_TYPES.includes(file.type)) {
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
    if (isNotionAuthError(err)) {
      // An expired/revoked token used to fall through to the generic 502
      // branch below, which the client's retry logic (see
      // notionExportService.ts) treats as transient and retries 3 times with
      // backoff — for every one of up to 500 images in a book, that's minutes
      // of pointless waiting before each upload gives up anyway. Returning
      // 401 here makes the client fail fast instead, and clearing the
      // session lets the UI offer a reconnect action rather than repeating
      // the same failure on every subsequent image and on the export call
      // that follows.
      await clearNotionSession()
      return NextResponse.json(
        { error: 'Notion connection expired', code: 'reauth_required' },
        { status: 401 }
      )
    }
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
