import { NextResponse } from 'next/server'
import { getNotionSession } from '@/lib/notion/session'

export async function GET() {
  const session = await getNotionSession()

  return NextResponse.json({
    connected: session !== null,
  })
}
