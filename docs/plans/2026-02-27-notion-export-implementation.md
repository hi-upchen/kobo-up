# Notion Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-book Notion export with OAuth, remove TXT export, and label Notion export as experimental.

**Architecture:** Browser collects book data and composites handwriting images (SVG+JPG → JPG via canvas). All Notion API calls go through Next.js API routes because Notion blocks CORS. OAuth token stored in encrypted httpOnly cookie via iron-session (stateless, no database). Notion page created with chapter headings, colored quote blocks for highlights, callout blocks for annotations, and image blocks for handwriting.

**Tech Stack:** Next.js 14 API routes, @notionhq/client, iron-session, HTML Canvas API, TypeScript

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install @notionhq/client and iron-session**

Run:
```bash
npm install @notionhq/client iron-session
```

**Step 2: Verify installation**

Run: `npm run build`
Expected: Build succeeds, no errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @notionhq/client and iron-session dependencies"
```

---

### Task 2: Add Environment Variables and Session Config

**Files:**
- Create: `src/lib/notion/session.ts`
- Modify: `.env.local` (or create if not exists)
- Modify: `.env.example` (or create if not exists)

**Step 1: Create session configuration**

Create `src/lib/notion/session.ts`:
```typescript
import { SessionOptions } from 'iron-session'

export interface NotionSessionData {
  notionAccessToken?: string
  notionWorkspaceId?: string
  notionPageId?: string
}

export const sessionOptions: SessionOptions = {
  password: process.env.IRON_SESSION_SECRET!,
  cookieName: 'kobo_notion_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
}
```

**Step 2: Create `.env.example`**

Create `.env.example` with placeholder values:
```
# Notion OAuth (required for Notion export)
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
NOTION_REDIRECT_URI=http://localhost:3000/api/notion/callback

# Iron Session (required for Notion export)
IRON_SESSION_SECRET=a-random-string-at-least-32-characters-long
```

**Step 3: Add actual values to `.env.local`**

Create/update `.env.local` with real values (user must fill in their own Notion integration credentials):
```
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
NOTION_REDIRECT_URI=http://localhost:3000/api/notion/callback
IRON_SESSION_SECRET=
```

**Step 4: Verify .gitignore includes .env.local**

Run: `grep '.env.local' .gitignore`
Expected: `.env.local` is listed. If not, add it.

**Step 5: Commit**

```bash
git add src/lib/notion/session.ts .env.example .gitignore
git commit -m "feat: add Notion session config and env example"
```

---

### Task 3: Create OAuth Auth Route

**Files:**
- Create: `src/app/api/notion/auth/route.ts`

**Step 1: Create the auth route**

Create `src/app/api/notion/auth/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/books'

  const clientId = process.env.NOTION_CLIENT_ID
  const redirectUri = process.env.NOTION_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Notion OAuth is not configured' },
      { status: 500 }
    )
  }

  // Encode returnUrl in state parameter so we can redirect back after OAuth
  const state = Buffer.from(JSON.stringify({ returnUrl })).toString('base64url')

  const authUrl = new URL('https://api.notion.com/v1/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('owner', 'user')
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
```

**Step 2: Verify the route loads**

Run: `npm run dev`
Navigate to: `http://localhost:3000/api/notion/auth?returnUrl=/books`
Expected: Redirects to `api.notion.com/v1/oauth/authorize` (will show error if NOTION_CLIENT_ID is not set, which is expected at this stage).

**Step 3: Commit**

```bash
git add src/app/api/notion/auth/route.ts
git commit -m "feat: add Notion OAuth auth redirect route"
```

---

### Task 4: Create OAuth Callback Route

**Files:**
- Create: `src/app/api/notion/callback/route.ts`

**Step 1: Create the callback route**

Create `src/app/api/notion/callback/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, NotionSessionData } from '@/lib/notion/session'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const error = request.nextUrl.searchParams.get('error')

  // Parse returnUrl from state
  let returnUrl = '/books'
  if (state) {
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString())
      returnUrl = parsed.returnUrl || '/books'
    } catch {
      // Use default returnUrl
    }
  }

  if (error || !code) {
    const redirectUrl = new URL(returnUrl, request.nextUrl.origin)
    redirectUrl.searchParams.set('notion', 'error')
    return NextResponse.redirect(redirectUrl.toString())
  }

  const clientId = process.env.NOTION_CLIENT_ID!
  const clientSecret = process.env.NOTION_CLIENT_SECRET!
  const redirectUri = process.env.NOTION_REDIRECT_URI!

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text()
      console.error('Notion token exchange failed:', errBody)
      const redirectUrl = new URL(returnUrl, request.nextUrl.origin)
      redirectUrl.searchParams.set('notion', 'error')
      return NextResponse.redirect(redirectUrl.toString())
    }

    const tokenData = await tokenResponse.json()

    // Store token in encrypted session cookie
    const session = await getIronSession<NotionSessionData>(await cookies(), sessionOptions)
    session.notionAccessToken = tokenData.access_token
    session.notionWorkspaceId = tokenData.workspace_id
    // Store the duplicated_template_id or the page the user selected
    // The user picks pages during OAuth; we'll query search to find available pages later
    await session.save()

    const redirectUrl = new URL(returnUrl, request.nextUrl.origin)
    redirectUrl.searchParams.set('notion', 'connected')
    return NextResponse.redirect(redirectUrl.toString())
  } catch (err) {
    console.error('Notion OAuth callback error:', err)
    const redirectUrl = new URL(returnUrl, request.nextUrl.origin)
    redirectUrl.searchParams.set('notion', 'error')
    return NextResponse.redirect(redirectUrl.toString())
  }
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No type errors in the new file.

**Step 3: Commit**

```bash
git add src/app/api/notion/callback/route.ts
git commit -m "feat: add Notion OAuth callback route with token exchange"
```

---

### Task 5: Create Notion Connection Status and Disconnect Routes

**Files:**
- Create: `src/app/api/notion/status/route.ts`
- Create: `src/app/api/notion/disconnect/route.ts`

**Step 1: Create status check route**

Create `src/app/api/notion/status/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, NotionSessionData } from '@/lib/notion/session'

export async function GET() {
  const session = await getIronSession<NotionSessionData>(await cookies(), sessionOptions)
  return NextResponse.json({
    connected: !!session.notionAccessToken,
    workspaceId: session.notionWorkspaceId || null,
  })
}
```

**Step 2: Create disconnect route**

Create `src/app/api/notion/disconnect/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, NotionSessionData } from '@/lib/notion/session'

export async function POST() {
  const session = await getIronSession<NotionSessionData>(await cookies(), sessionOptions)
  session.destroy()
  return NextResponse.json({ disconnected: true })
}
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 4: Commit**

```bash
git add src/app/api/notion/status/route.ts src/app/api/notion/disconnect/route.ts
git commit -m "feat: add Notion connection status and disconnect routes"
```

---

### Task 6: Create Notion Block Builder Utility

**Files:**
- Create: `src/utils/notionBlockBuilder.ts`
- Create: `src/utils/__tests__/notionBlockBuilder.test.ts`

**Step 1: Write failing tests**

Create `src/utils/__tests__/notionBlockBuilder.test.ts`:
```typescript
import {
  buildBookPageBlocks,
  mapKoboColorToNotion,
  buildHighlightBlock,
  buildAnnotationBlock,
  buildChapterHeadingBlock,
} from '../notionBlockBuilder'

describe('mapKoboColorToNotion', () => {
  it('should map Kobo color 0 to yellow_background', () => {
    expect(mapKoboColorToNotion(0)).toBe('yellow_background')
  })

  it('should map Kobo color 1 to pink_background', () => {
    expect(mapKoboColorToNotion(1)).toBe('pink_background')
  })

  it('should map Kobo color 2 to blue_background', () => {
    expect(mapKoboColorToNotion(2)).toBe('blue_background')
  })

  it('should map Kobo color 3 to green_background', () => {
    expect(mapKoboColorToNotion(3)).toBe('green_background')
  })

  it('should return default for null/undefined', () => {
    expect(mapKoboColorToNotion(null)).toBe('default')
    expect(mapKoboColorToNotion(undefined)).toBe('default')
  })
})

describe('buildHighlightBlock', () => {
  it('should create a quote block with text and color', () => {
    const block = buildHighlightBlock('Some highlighted text', 0)
    expect(block.type).toBe('quote')
    expect(block.quote.rich_text[0].text.content).toBe('Some highlighted text')
    expect(block.quote.color).toBe('yellow_background')
  })

  it('should use default color when no color provided', () => {
    const block = buildHighlightBlock('Text without color', null)
    expect(block.quote.color).toBe('default')
  })
})

describe('buildAnnotationBlock', () => {
  it('should create a callout block with memo emoji', () => {
    const block = buildAnnotationBlock('My note about this passage')
    expect(block.type).toBe('callout')
    expect(block.callout.rich_text[0].text.content).toBe('My note about this passage')
    expect(block.callout.icon.emoji).toBe('📝')
  })
})

describe('buildChapterHeadingBlock', () => {
  it('should create heading_2 for depth 1', () => {
    const block = buildChapterHeadingBlock('Chapter Title', 1)
    expect(block.type).toBe('heading_2')
  })

  it('should create heading_3 for depth 2', () => {
    const block = buildChapterHeadingBlock('Section Title', 2)
    expect(block.type).toBe('heading_3')
  })

  it('should create heading_3 for depth > 2', () => {
    const block = buildChapterHeadingBlock('Subsection', 3)
    expect(block.type).toBe('heading_3')
  })
})

describe('buildBookPageBlocks', () => {
  it('should build complete block array from chapters', () => {
    const chapters = [
      {
        contentId: 'ch1',
        contentType: 0,
        bookId: 'book1',
        bookTitle: 'Test Book',
        title: 'Chapter 1',
        chapterIdBookmarked: 'ch1',
        volumeIndex: 0,
        depth: 1,
        notes: [
          {
            bookmarkId: 'bm1',
            text: 'A highlight',
            annotation: 'My note',
            type: 'highlight',
            color: 0,
            startContainerPath: '',
            startOffset: 0,
            chapterProgress: 0,
            contentId: 'ch1',
            dateCreated: '',
            hidden: '',
            volumeId: '',
          },
          {
            bookmarkId: 'bm2',
            text: '',
            annotation: null,
            type: 'markup',
            color: null,
            startContainerPath: '',
            startOffset: 0,
            chapterProgress: 0,
            contentId: 'ch1',
            dateCreated: '',
            hidden: '',
            volumeId: '',
          },
        ],
      },
    ]

    const result = buildBookPageBlocks(chapters)

    // Should have: heading + highlight quote + annotation callout + markup placeholder
    expect(result.length).toBe(4)
    expect(result[0].type).toBe('heading_2')
    expect(result[1].type).toBe('quote')
    expect(result[2].type).toBe('callout')
    // Markup is a paragraph placeholder (image URL filled later)
    expect(result[3].type).toBe('paragraph')
    expect(result[3]._meta.bookmarkId).toBe('bm2')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=notionBlockBuilder`
Expected: FAIL — module not found.

**Step 3: Implement the block builder**

Create `src/utils/notionBlockBuilder.ts`:
```typescript
import type { IBookChapter } from '@/types/kobo'

type NotionColor =
  | 'default'
  | 'yellow_background'
  | 'pink_background'
  | 'blue_background'
  | 'green_background'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotionBlock = Record<string, any>

export function mapKoboColorToNotion(colorCode?: number | null): NotionColor {
  switch (colorCode) {
    case 0: return 'yellow_background'
    case 1: return 'pink_background'
    case 2: return 'blue_background'
    case 3: return 'green_background'
    default: return 'default'
  }
}

export function buildHighlightBlock(text: string, color?: number | null): NotionBlock {
  return {
    type: 'quote',
    quote: {
      rich_text: [{ type: 'text', text: { content: text } }],
      color: mapKoboColorToNotion(color),
    },
  }
}

export function buildAnnotationBlock(annotation: string): NotionBlock {
  return {
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: annotation } }],
      icon: { type: 'emoji', emoji: '📝' },
      color: 'gray_background',
    },
  }
}

export function buildChapterHeadingBlock(title: string, depth: number): NotionBlock {
  // depth 1 → heading_2 (since heading_1 is used for book title)
  // depth 2+ → heading_3
  if (depth <= 1) {
    return {
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: title } }],
      },
    }
  }
  return {
    type: 'heading_3',
    heading_3: {
      rich_text: [{ type: 'text', text: { content: title } }],
    },
  }
}

export function buildMarkupPlaceholder(bookmarkId: string): NotionBlock {
  return {
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: { content: '✏️ [Handwriting annotation]' },
          annotations: { italic: true, color: 'gray' },
        },
      ],
    },
    _meta: { bookmarkId, isMarkup: true },
  }
}

export function buildImageBlock(imageUrl: string): NotionBlock {
  return {
    type: 'image',
    image: {
      type: 'external',
      external: { url: imageUrl },
    },
  }
}

export function buildBookPageBlocks(chapters: IBookChapter[]): NotionBlock[] {
  const blocks: NotionBlock[] = []

  for (const chapter of chapters) {
    // Chapter heading
    blocks.push(buildChapterHeadingBlock(chapter.title, chapter.depth))

    if (!chapter.notes || chapter.notes.length === 0) continue

    for (const note of chapter.notes) {
      if (note.type === 'markup') {
        // Placeholder — will be replaced with image block after upload
        blocks.push(buildMarkupPlaceholder(note.bookmarkId))
      } else if (note.text) {
        blocks.push(buildHighlightBlock(note.text.trim(), note.color))

        if (note.annotation) {
          blocks.push(buildAnnotationBlock(note.annotation.trim()))
        }
      }
    }
  }

  return blocks
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=notionBlockBuilder`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/utils/notionBlockBuilder.ts src/utils/__tests__/notionBlockBuilder.test.ts
git commit -m "feat: add Notion block builder with color mapping and tests"
```

---

### Task 7: Create Image Compositor Utility

**Files:**
- Create: `src/utils/imageCompositor.ts`

**Step 1: Create the compositor**

This runs in the browser only (uses Canvas API). It composites an SVG overlay on top of a JPG background and returns a Blob.

Create `src/utils/imageCompositor.ts`:
```typescript
/**
 * Composite an SVG overlay on top of a JPG background using HTML Canvas.
 * Returns the combined image as a JPEG Blob.
 * Browser-only (requires Canvas API).
 */
export async function compositeMarkupImage(
  jpgData: ArrayBuffer,
  svgData: ArrayBuffer,
  quality: number = 0.85
): Promise<Blob> {
  const jpgBlob = new Blob([jpgData], { type: 'image/jpeg' })
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml' })

  const jpgUrl = URL.createObjectURL(jpgBlob)
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const [jpgImg, svgImg] = await Promise.all([
      loadImage(jpgUrl),
      loadImage(svgUrl),
    ])

    const canvas = document.createElement('canvas')
    canvas.width = jpgImg.naturalWidth
    canvas.height = jpgImg.naturalHeight

    const ctx = canvas.getContext('2d')!
    ctx.drawImage(jpgImg, 0, 0)
    ctx.drawImage(svgImg, 0, 0, canvas.width, canvas.height)

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to composite image'))
        },
        'image/jpeg',
        quality
      )
    })
  } finally {
    URL.revokeObjectURL(jpgUrl)
    URL.revokeObjectURL(svgUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 3: Commit**

```bash
git add src/utils/imageCompositor.ts
git commit -m "feat: add canvas-based SVG+JPG image compositor"
```

---

### Task 8: Create Notion Export API Route

**Files:**
- Create: `src/app/api/notion/export/route.ts`

**Step 1: Create the export route**

This is the main server-side endpoint. It receives book data + optional images as multipart form data, creates a Notion page, and returns the page URL.

Create `src/app/api/notion/export/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { Client } from '@notionhq/client'
import { sessionOptions, NotionSessionData } from '@/lib/notion/session'
import { buildBookPageBlocks } from '@/utils/notionBlockBuilder'
import type { IBookChapter } from '@/types/kobo'

const BATCH_SIZE = 100

export async function POST(request: NextRequest) {
  const session = await getIronSession<NotionSessionData>(await cookies(), sessionOptions)

  if (!session.notionAccessToken) {
    return NextResponse.json(
      { error: 'Not connected to Notion' },
      { status: 401 }
    )
  }

  const notion = new Client({ auth: session.notionAccessToken })

  try {
    const formData = await request.formData()
    const bookDataRaw = formData.get('bookData') as string
    const { bookTitle, author, chapters, parentPageId } = JSON.parse(bookDataRaw) as {
      bookTitle: string
      author: string
      chapters: IBookChapter[]
      parentPageId: string
    }

    // Collect image files from form data (keyed by bookmarkId)
    const imageFiles = new Map<string, Blob>()
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image_') && value instanceof Blob) {
        const bookmarkId = key.replace('image_', '')
        imageFiles.set(bookmarkId, value)
      }
    }

    // Create Notion page with title
    const page = await notion.pages.create({
      parent: { page_id: parentPageId },
      properties: {
        title: {
          type: 'title',
          title: [{ type: 'text', text: { content: bookTitle } }],
        },
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: author || 'Unknown Author' },
                annotations: { italic: true, color: 'gray' },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'divider',
          divider: {},
        },
      ],
    })

    const pageId = page.id

    // Build all blocks from chapters
    let blocks = buildBookPageBlocks(chapters)

    // Upload images and replace markup placeholders with image blocks
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      if (block._meta?.isMarkup) {
        const imageBlob = imageFiles.get(block._meta.bookmarkId)
        if (imageBlob) {
          try {
            // Use Notion file upload API
            const uploadResponse = await notion.files.upload({
              file: imageBlob,
              filename: `markup-${block._meta.bookmarkId}.jpg`,
            })

            blocks[i] = {
              type: 'image',
              image: {
                type: 'file',
                file: { url: uploadResponse.url },
              },
            }
          } catch (uploadErr) {
            console.error('Image upload failed for', block._meta.bookmarkId, uploadErr)
            // Keep the text placeholder if upload fails
          }
        }
        // Remove _meta before sending to Notion
        delete blocks[i]._meta
      }
    }

    // Remove _meta from all blocks
    blocks = blocks.map(({ _meta, ...rest }) => rest)

    // Append blocks in batches of 100
    for (let i = 0; i < blocks.length; i += BATCH_SIZE) {
      const batch = blocks.slice(i, i + BATCH_SIZE)
      await notion.blocks.children.append({
        block_id: pageId,
        children: batch,
      })
    }

    // Construct the Notion page URL
    const pageUrl = `https://notion.so/${pageId.replace(/-/g, '')}`

    return NextResponse.json({
      success: true,
      pageUrl,
      pageId,
      blocksCreated: blocks.length,
    })
  } catch (err) {
    console.error('Notion export error:', err)
    const message = err instanceof Error ? err.message : 'Export failed'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No type errors (there may be Notion SDK type warnings for the file upload API — adjust if needed based on actual SDK types).

**Step 3: Commit**

```bash
git add src/app/api/notion/export/route.ts
git commit -m "feat: add Notion export API route with image upload and batching"
```

---

### Task 9: Create Notion Page Picker Route

**Files:**
- Create: `src/app/api/notion/pages/route.ts`

The user needs to pick which parent page to export into. After OAuth, we query Notion's search API to find pages the user shared with the integration.

**Step 1: Create the pages route**

Create `src/app/api/notion/pages/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { Client } from '@notionhq/client'
import { sessionOptions, NotionSessionData } from '@/lib/notion/session'

export async function GET() {
  const session = await getIronSession<NotionSessionData>(await cookies(), sessionOptions)

  if (!session.notionAccessToken) {
    return NextResponse.json(
      { error: 'Not connected to Notion' },
      { status: 401 }
    )
  }

  const notion = new Client({ auth: session.notionAccessToken })

  try {
    // Search for pages the user shared with the integration
    const response = await notion.search({
      filter: { property: 'object', value: 'page' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 20,
    })

    const pages = response.results
      .filter((r): r is Extract<typeof r, { object: 'page' }> => r.object === 'page')
      .map((page) => {
        // Extract title from page properties
        const titleProp = Object.values(page.properties).find(
          (p) => p.type === 'title'
        )
        const title =
          titleProp?.type === 'title' && titleProp.title.length > 0
            ? titleProp.title.map((t) => t.plain_text).join('')
            : 'Untitled'

        return {
          id: page.id,
          title,
          lastEdited: page.last_edited_time,
        }
      })

    return NextResponse.json({ pages })
  } catch (err) {
    console.error('Failed to fetch Notion pages:', err)
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    )
  }
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 3: Commit**

```bash
git add src/app/api/notion/pages/route.ts
git commit -m "feat: add Notion pages list route for parent page selection"
```

---

### Task 10: Create Client-Side Notion Export Service

**Files:**
- Create: `src/services/notionExportService.ts`

This service runs in the browser. It composites handwriting images, prepares form data, and calls the server-side export API.

**Step 1: Create the service**

Create `src/services/notionExportService.ts`:
```typescript
import type { IBook, IBookChapter } from '@/types/kobo'
import { getMarkupFilesByIds } from './markupService'
import { compositeMarkupImage } from '@/utils/imageCompositor'

export interface NotionConnectionStatus {
  connected: boolean
  workspaceId: string | null
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

export async function checkNotionConnection(): Promise<NotionConnectionStatus> {
  const res = await fetch('/api/notion/status')
  return res.json()
}

export async function disconnectNotion(): Promise<void> {
  await fetch('/api/notion/disconnect', { method: 'POST' })
}

export async function fetchNotionPages(): Promise<NotionPage[]> {
  const res = await fetch('/api/notion/pages')
  if (!res.ok) throw new Error('Failed to fetch Notion pages')
  const data = await res.json()
  return data.pages
}

export async function exportBookToNotion(
  book: IBook,
  chapters: IBookChapter[],
  parentPageId: string,
  onProgress?: (current: number, total: number) => void
): Promise<NotionExportResult> {
  // 1. Collect all markup bookmarkIds
  const markupIds: string[] = []
  for (const chapter of chapters) {
    for (const note of chapter.notes || []) {
      if (note.type === 'markup') {
        markupIds.push(note.bookmarkId)
      }
    }
  }

  // 2. Load and composite markup images
  const markupFiles = markupIds.length > 0
    ? await getMarkupFilesByIds(markupIds)
    : new Map()

  const formData = new FormData()
  let processedImages = 0
  const totalImages = markupFiles.size

  for (const [bookmarkId, file] of markupFiles) {
    try {
      const composited = await compositeMarkupImage(file.jpg, file.svg)
      formData.append(`image_${bookmarkId}`, composited, `markup-${bookmarkId}.jpg`)
      processedImages++
      onProgress?.(processedImages, totalImages)
    } catch (err) {
      console.warn(`Failed to composite image for ${bookmarkId}:`, err)
    }
  }

  // 3. Add book data as JSON
  formData.append('bookData', JSON.stringify({
    bookTitle: book.bookTitle || book.title || 'Untitled',
    author: book.author || 'Unknown Author',
    chapters,
    parentPageId,
  }))

  // 4. Send to server
  const res = await fetch('/api/notion/export', {
    method: 'POST',
    body: formData,
  })

  const data = await res.json()

  if (!res.ok) {
    return { success: false, error: data.error || 'Export failed' }
  }

  return { success: true, pageUrl: data.pageUrl }
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 3: Commit**

```bash
git add src/services/notionExportService.ts
git commit -m "feat: add client-side Notion export service with image compositing"
```

---

### Task 11: Remove TXT Export from Book Notes Page

**Files:**
- Modify: `src/app/book/[contentId]/notes/components/NotesExportDropdown.tsx`
- Modify: `src/app/book/[contentId]/notes/components/NotesSection.tsx`
- Modify: `src/app/book/[contentId]/notes/page.tsx`
- Modify: `src/utils/markdownGenerator.ts`

**Step 1: Remove TXT option from NotesExportDropdown**

In `src/app/book/[contentId]/notes/components/NotesExportDropdown.tsx`:
- Change the `onExport` type from `format: 'markdown' | 'txt'` to just `format: 'markdown'`
- Remove the TXT `DropdownItem`
- Update the markdown description text (remove "Perfect for importing into Notion" since we have native Notion export now)

Updated file:
```typescript
import React from 'react'
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu, DropdownDescription, DropdownLabel } from '@/components/dropdown'
import type { IBook, IBookChapter } from '@/types/kobo'

interface NotesExportDropdownProps {
  book: IBook | null
  bookChapters: IBookChapter[] | null
  onExport: (book: IBook, chapters: IBookChapter[], format: 'markdown') => void
}

export function NotesExportDropdown({ book, bookChapters, onExport }: NotesExportDropdownProps) {
  const handleExport = (format: 'markdown') => {
    if (!book || !bookChapters) {
      console.error('Book data is not available')
      return
    }
    onExport(book, bookChapters, format)
  }

  return (
    <div className="ml-auto">
      <Dropdown>
        <DropdownButton outline aria-label="More options">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </DropdownButton>
        <DropdownMenu anchor="bottom end">
          <DropdownItem onClick={() => handleExport('markdown')}>
            <DropdownLabel>Download as Markdown</DropdownLabel>
            <DropdownDescription>Export your highlights and notes.</DropdownDescription>
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}
```

**Step 2: Update NotesSection type**

In `src/app/book/[contentId]/notes/components/NotesSection.tsx` line 13, change:
```typescript
onExport: (book: IBook, chapters: IBookChapter[], format: 'markdown' | 'txt') => void
```
to:
```typescript
onExport: (book: IBook, chapters: IBookChapter[], format: 'markdown') => void
```

**Step 3: Update page.tsx**

In `src/app/book/[contentId]/notes/page.tsx`:
- Remove `downloadTxtFile` from import (line 15)
- Change `handleExport` to only handle markdown (lines 103-110):

```typescript
const handleExport = (book: IBook, chapters: IBookChapter[], format: 'markdown') => {
  const content = generateMarkdownContent(book, chapters);
  downloadMarkdownFile(`${book.bookTitle}.md`, content);
};
```

**Step 4: Remove downloadTxtFile from markdownGenerator.ts**

In `src/utils/markdownGenerator.ts`, delete lines 50-52:
```typescript
export const downloadTxtFile = (filename: string, content: string) => {
  downloadFile(filename, content, 'text/plain');
}
```

**Step 5: Verify everything compiles**

Run: `npx tsc --noEmit && npm run lint`
Expected: No errors.

**Step 6: Run tests**

Run: `npm test`
Expected: All existing tests pass.

**Step 7: Commit**

```bash
git add src/app/book/[contentId]/notes/components/NotesExportDropdown.tsx \
        src/app/book/[contentId]/notes/components/NotesSection.tsx \
        src/app/book/[contentId]/notes/page.tsx \
        src/utils/markdownGenerator.ts
git commit -m "refactor: remove TXT export from book notes page"
```

---

### Task 12: Add Notion Export to Dropdown UI

**Files:**
- Modify: `src/app/book/[contentId]/notes/components/NotesExportDropdown.tsx`
- Modify: `src/app/book/[contentId]/notes/components/NotesSection.tsx`
- Modify: `src/app/book/[contentId]/notes/page.tsx`

**Step 1: Update NotesExportDropdown with Notion option**

This is the main UI change. The dropdown now has:
1. Download as Markdown
2. Export to Notion (Experimental) — with connection state handling

Replace `src/app/book/[contentId]/notes/components/NotesExportDropdown.tsx` with:
```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu, DropdownDescription, DropdownLabel, DropdownDivider } from '@/components/dropdown'
import type { IBook, IBookChapter } from '@/types/kobo'
import { checkNotionConnection, disconnectNotion } from '@/services/notionExportService'

interface NotesExportDropdownProps {
  book: IBook | null
  bookChapters: IBookChapter[] | null
  onExportMarkdown: (book: IBook, chapters: IBookChapter[]) => void
  onExportNotion: (book: IBook, chapters: IBookChapter[]) => void
}

export function NotesExportDropdown({ book, bookChapters, onExportMarkdown, onExportNotion }: NotesExportDropdownProps) {
  const [notionConnected, setNotionConnected] = useState(false)

  useEffect(() => {
    checkNotionConnection()
      .then((status) => setNotionConnected(status.connected))
      .catch(() => setNotionConnected(false))
  }, [])

  const handleMarkdownExport = () => {
    if (!book || !bookChapters) return
    onExportMarkdown(book, bookChapters)
  }

  const handleNotionExport = () => {
    if (!book || !bookChapters) return
    if (!notionConnected) {
      // Redirect to OAuth — returnUrl brings user back to this page
      const returnUrl = window.location.pathname + window.location.search
      window.location.href = `/api/notion/auth?returnUrl=${encodeURIComponent(returnUrl)}`
      return
    }
    onExportNotion(book, bookChapters)
  }

  const handleDisconnect = async () => {
    await disconnectNotion()
    setNotionConnected(false)
  }

  return (
    <div className="ml-auto">
      <Dropdown>
        <DropdownButton outline aria-label="Export options">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </DropdownButton>
        <DropdownMenu anchor="bottom end">
          <DropdownItem onClick={handleMarkdownExport}>
            <DropdownLabel>Download as Markdown</DropdownLabel>
            <DropdownDescription>Export your highlights and notes.</DropdownDescription>
          </DropdownItem>
          <DropdownDivider />
          <DropdownItem onClick={handleNotionExport}>
            <DropdownLabel>
              {notionConnected ? 'Export to Notion' : 'Connect & Export to Notion'}
              <span className="ml-1.5 text-xs font-normal text-amber-600 dark:text-amber-400">Experimental</span>
            </DropdownLabel>
            <DropdownDescription>
              {notionConnected
                ? 'Send highlights with colors and handwriting to Notion.'
                : 'Connect your Notion account to export.'}
            </DropdownDescription>
          </DropdownItem>
          {notionConnected && (
            <>
              <DropdownDivider />
              <DropdownItem onClick={handleDisconnect}>
                <DropdownLabel className="text-zinc-400">Disconnect Notion</DropdownLabel>
              </DropdownItem>
            </>
          )}
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}
```

**Step 2: Update NotesSection props**

In `src/app/book/[contentId]/notes/components/NotesSection.tsx`, update the interface and component:

Change the `onExport` prop to two separate callbacks:
```typescript
interface NotesSectionProps {
  notes: IBookHighlightNAnnotation[] | null
  bookChapters: IBookChapter[] | null
  book: IBook | null
  sponsorShouldBeShownOnChapterIdx: number | null
  onExportMarkdown: (book: IBook, chapters: IBookChapter[]) => void
  onExportNotion: (book: IBook, chapters: IBookChapter[]) => void
}
```

Update the component to pass both callbacks:
```typescript
export function NotesSection({
  notes,
  bookChapters,
  book,
  sponsorShouldBeShownOnChapterIdx,
  onExportMarkdown,
  onExportNotion
}: NotesSectionProps) {
  // ... existing null check ...

  return (
    <>
      <div className="mt-6 flex items-center justify-between mb-2">
        <Text className='text-zinc-500 dark:text-zinc-400'>{notes.length} annotations</Text>
        <NotesExportDropdown
          book={book}
          bookChapters={bookChapters}
          onExportMarkdown={onExportMarkdown}
          onExportNotion={onExportNotion}
        />
      </div>
      {/* ... rest unchanged ... */}
    </>
  )
}
```

**Step 3: Update page.tsx**

In `src/app/book/[contentId]/notes/page.tsx`, add Notion export handling:

Add state and imports at the top:
```typescript
import { exportBookToNotion, fetchNotionPages } from '@/services/notionExportService'
```

Add Notion export state:
```typescript
const [isExportingNotion, setIsExportingNotion] = useState(false)
const [notionExportResult, setNotionExportResult] = useState<{ success: boolean; pageUrl?: string; error?: string } | null>(null)
```

Add Notion export handler:
```typescript
const handleExportMarkdown = (book: IBook, chapters: IBookChapter[]) => {
  const content = generateMarkdownContent(book, chapters);
  downloadMarkdownFile(`${book.bookTitle}.md`, content);
};

const handleExportNotion = async (book: IBook, chapters: IBookChapter[]) => {
  setIsExportingNotion(true)
  setNotionExportResult(null)

  try {
    // Fetch available pages and use the first one as parent
    const pages = await fetchNotionPages()
    if (pages.length === 0) {
      setNotionExportResult({ success: false, error: 'No Notion pages found. Please share at least one page with the integration.' })
      return
    }

    // Use first available page as parent (could add picker UI later)
    const parentPageId = pages[0].id
    const result = await exportBookToNotion(book, chapters, parentPageId)
    setNotionExportResult(result)
  } catch (err) {
    setNotionExportResult({ success: false, error: err instanceof Error ? err.message : 'Export failed' })
  } finally {
    setIsExportingNotion(false)
  }
};
```

Update the JSX to pass both handlers and show Notion export status:
```typescript
<NotesSection
  notes={notes}
  bookChapters={bookChapters}
  book={book}
  sponsorShouldBeShownOnChapterIdx={sponsorShouldBeShwonOnChapterIdx}
  onExportMarkdown={handleExportMarkdown}
  onExportNotion={handleExportNotion}
/>

{/* Notion export status */}
{isExportingNotion && (
  <div className="fixed bottom-4 right-4 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg p-4 z-50">
    <Text className="text-sm">Exporting to Notion...</Text>
  </div>
)}

{notionExportResult && (
  <div className={`fixed bottom-4 right-4 border rounded-lg shadow-lg p-4 z-50 ${
    notionExportResult.success
      ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
      : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
  }`}>
    {notionExportResult.success ? (
      <div>
        <Text className="text-sm font-medium text-green-800 dark:text-green-200">Exported to Notion!</Text>
        {notionExportResult.pageUrl && (
          <a href={notionExportResult.pageUrl} target="_blank" rel="noopener noreferrer"
             className="text-sm text-green-600 dark:text-green-400 underline">
            Open in Notion
          </a>
        )}
      </div>
    ) : (
      <Text className="text-sm text-red-800 dark:text-red-200">{notionExportResult.error}</Text>
    )}
    <button onClick={() => setNotionExportResult(null)}
            className="absolute top-1 right-2 text-gray-400 hover:text-gray-600 text-xs">
      ✕
    </button>
  </div>
)}
```

**Step 4: Verify types compile and lint passes**

Run: `npx tsc --noEmit && npm run lint`
Expected: No errors.

**Step 5: Run tests**

Run: `npm test`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/app/book/[contentId]/notes/components/NotesExportDropdown.tsx \
        src/app/book/[contentId]/notes/components/NotesSection.tsx \
        src/app/book/[contentId]/notes/page.tsx
git commit -m "feat: add Notion export option to book notes dropdown (experimental)"
```

---

### Task 13: Handle OAuth Redirect Return

**Files:**
- Modify: `src/app/book/[contentId]/notes/page.tsx`

After OAuth, the user is redirected back with `?notion=connected` or `?notion=error`. Handle this.

**Step 1: Add URL parameter detection**

In `page.tsx`, add to the component:
```typescript
import { useSearchParams } from 'next/navigation'

// Inside component:
const searchParams = useSearchParams()

useEffect(() => {
  const notionParam = searchParams.get('notion')
  if (notionParam === 'connected') {
    // Auto-trigger Notion export after successful OAuth
    if (book && bookChapters) {
      handleExportNotion(book, bookChapters)
    }
    // Clean up URL
    const url = new URL(window.location.href)
    url.searchParams.delete('notion')
    window.history.replaceState({}, '', url.toString())
  } else if (notionParam === 'error') {
    setNotionExportResult({ success: false, error: 'Failed to connect to Notion. Please try again.' })
    const url = new URL(window.location.href)
    url.searchParams.delete('notion')
    window.history.replaceState({}, '', url.toString())
  }
}, [searchParams, book, bookChapters])
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/app/book/[contentId]/notes/page.tsx
git commit -m "feat: handle Notion OAuth redirect and auto-trigger export"
```

---

### Task 14: Remove TXT Export from Books Listing Page

**Files:**
- Modify: `src/app/books/components/ExportControls.tsx`

**Step 1: Remove TXT export button from ExportControls**

In `src/app/books/components/ExportControls.tsx`, remove the "Export All (TXT)" button (lines 127-134):
```typescript
<Button
  color="zinc"
  onClick={() => handleExportAll('text')}
  className="mt-2 sm:mt-0 w-full sm:w-auto"
  disabled={totalCount === 0}
>
  Export All (TXT)
</Button>
```

Also remove `'text'` from the format type union if it's only used there, or remove the `case 'text':` branch from `handleExport`.

**Step 2: Clean up exportService.ts**

In `src/services/exportService.ts`, check if `generateText`, `exportBooksToText` are still used anywhere after removing TXT from both pages. If unused, remove them.

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit && npm run lint`
Expected: No errors.

**Step 4: Run tests**

Run: `npm test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/app/books/components/ExportControls.tsx src/services/exportService.ts
git commit -m "refactor: remove TXT export from books listing page"
```

---

### Task 15: Verify Dropdown Has DropdownDivider Export

**Files:**
- Check: `src/components/dropdown.tsx`

**Step 1: Verify DropdownDivider exists**

The updated dropdown uses `DropdownDivider`. Check that this component is exported from the dropdown component library.

Run: `grep 'DropdownDivider' src/components/dropdown.tsx`

If `DropdownDivider` is not exported, either:
- Add it to the exports, or
- Remove the divider from the dropdown and use a different visual separator

**Step 2: Commit if changes needed**

```bash
git add src/components/dropdown.tsx
git commit -m "fix: export DropdownDivider from dropdown component"
```

---

### Task 16: Full Integration Test

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass.

**Step 2: Run linter**

Run: `npm run lint`
Expected: No errors.

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Manual testing checklist**

With dev server running (`npm run dev`):

1. Navigate to a book notes page
2. Open export dropdown → verify:
   - "Download as Markdown" option exists
   - "Export to Notion (Experimental)" option exists
   - No "Download as TXT" option
3. Click "Download as Markdown" → file downloads correctly
4. Click "Export to Notion" without env vars set → should show appropriate error
5. Navigate to books listing → verify no TXT export button
6. Check dark mode rendering of dropdown

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration test fixes"
```

---

## File Summary

### New Files (6)
- `src/lib/notion/session.ts` — Session config and types
- `src/app/api/notion/auth/route.ts` — OAuth redirect
- `src/app/api/notion/callback/route.ts` — Token exchange
- `src/app/api/notion/status/route.ts` — Connection check
- `src/app/api/notion/disconnect/route.ts` — Clear session
- `src/app/api/notion/pages/route.ts` — List available pages
- `src/app/api/notion/export/route.ts` — Main export endpoint
- `src/services/notionExportService.ts` — Client-side export orchestration
- `src/utils/notionBlockBuilder.ts` — Notion block construction
- `src/utils/imageCompositor.ts` — SVG+JPG canvas compositing
- `src/utils/__tests__/notionBlockBuilder.test.ts` — Block builder tests
- `.env.example` — Environment variable template

### Modified Files (6)
- `package.json` — New dependencies
- `src/app/book/[contentId]/notes/page.tsx` — Notion export handler + OAuth redirect
- `src/app/book/[contentId]/notes/components/NotesExportDropdown.tsx` — New dropdown with Notion option
- `src/app/book/[contentId]/notes/components/NotesSection.tsx` — Updated props
- `src/utils/markdownGenerator.ts` — Remove downloadTxtFile
- `src/app/books/components/ExportControls.tsx` — Remove TXT button
- `src/services/exportService.ts` — Remove unused TXT methods

### Dependencies Added
- `@notionhq/client` — Official Notion SDK
- `iron-session` — Encrypted stateless sessions

### Environment Variables Required
- `NOTION_CLIENT_ID`
- `NOTION_CLIENT_SECRET`
- `NOTION_REDIRECT_URI`
- `IRON_SESSION_SECRET`
