import { NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { getNotionSession, clearNotionSession } from '@/lib/notion/session'

export async function GET() {
  const session = await getNotionSession()
  if (!session) {
    return NextResponse.json({ connected: false })
  }

  // Verify the token is still valid with a lightweight API call
  try {
    const notion = new Client({ auth: session.notionAccessToken })
    await notion.users.me({})
    return NextResponse.json({ connected: true })
  } catch {
    // Token revoked or invalid — clear stale session
    await clearNotionSession()
    return NextResponse.json({ connected: false })
  }
}
