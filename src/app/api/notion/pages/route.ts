import { NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { getNotionSession } from '@/lib/notion/session'

interface NotionPage {
  id: string
  title: string
  lastEdited: string
}

export async function GET() {
  const session = await getNotionSession()
  if (!session) {
    return NextResponse.json(
      { error: 'Not connected to Notion' },
      { status: 401 }
    )
  }

  const notion = new Client({ auth: session.notionAccessToken })

  try {
    const response = await notion.search({
      filter: { property: 'object', value: 'page' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 20,
    })

    const pages: NotionPage[] = response.results.map((result) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page = result as any
      const titleProperty = page.properties?.title ?? page.properties?.Name
      const titleRichText = titleProperty?.title ?? []
      const title =
        titleRichText
          .map((t: { plain_text?: string }) => t.plain_text ?? '')
          .join('') || 'Untitled'

      return {
        id: page.id,
        title,
        lastEdited: page.last_edited_time ?? '',
      }
    })

    return NextResponse.json({ pages })
  } catch (err) {
    console.error('Notion pages search error:', err)
    return NextResponse.json(
      { error: `Failed to fetch pages: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
