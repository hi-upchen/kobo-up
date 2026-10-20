import { NextRequest, NextResponse } from 'next/server'
import { sendAlert } from '@/lib/alert'
import { BROWSERS, LAYOUT_OPERATIONS, MAX_MESSAGE_LENGTH } from '@/utils/reportLayoutError'

const MAX_BODY_BYTES = 1024

function badRequest() {
  return new NextResponse(null, { status: 400 })
}

// Receives a report from the browser that the Kobo database layout looks changed.
// It accepts only a short, fixed shape, and forwards it as a Telegram alert.
export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return badRequest()

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return badRequest()
  }
  if (typeof body !== 'object' || body === null) return badRequest()

  const { operation, message, browser } = body as Record<string, unknown>
  if (
    typeof operation !== 'string' ||
    !(LAYOUT_OPERATIONS as readonly string[]).includes(operation) ||
    typeof message !== 'string' ||
    message.length > MAX_MESSAGE_LENGTH ||
    typeof browser !== 'string' ||
    !(BROWSERS as readonly string[]).includes(browser)
  ) {
    return badRequest()
  }

  await sendAlert({
    key: `client-layout:${operation}`,
    title: 'Kobo 資料庫結構可能改了',
    detail: `操作：${operation} · 訊息：${message} · 瀏覽器：${browser}`,
    fix: '用最新韌體的 KoboReader.sqlite 測試，更新 src/models/KoboDB.ts 的查詢',
  })
  return new NextResponse(null, { status: 204 })
}
