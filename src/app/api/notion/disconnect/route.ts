import { NextResponse } from 'next/server'
import { clearNotionSession } from '@/lib/notion/session'

export async function POST() {
  await clearNotionSession()

  return NextResponse.json({ disconnected: true })
}
