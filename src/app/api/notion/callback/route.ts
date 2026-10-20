import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { setNotionSession } from '@/lib/notion/session'
import { errorMessage, sendAlert } from '@/lib/alert'

const NONCE_COOKIE = 'notion_oauth_nonce'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const error = request.nextUrl.searchParams.get('error')

  // Decode returnUrl and nonce from state, fall back to /books
  let returnUrl = '/books'
  let stateNonce: string | null = null
  if (state) {
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'))
      if (parsed.returnUrl) returnUrl = parsed.returnUrl
      if (parsed.nonce) stateNonce = parsed.nonce
    } catch {
      // Keep default returnUrl
    }
  }

  // Validate returnUrl is a safe relative path (prevent open redirect)
  try {
    const parsed = new URL(returnUrl, request.nextUrl.origin)
    if (parsed.origin !== request.nextUrl.origin) returnUrl = '/books'
  } catch {
    returnUrl = '/books'
  }

  // Validate CSRF nonce
  const cookieStore = await cookies()
  const nonceCookie = cookieStore.get(NONCE_COOKIE)
  cookieStore.delete(NONCE_COOKIE)

  if (!stateNonce || !nonceCookie?.value || stateNonce !== nonceCookie.value) {
    await sendAlert({
      key: 'notion-callback-state',
      title: 'Notion 連線失敗：狀態不符',
      detail: 'Notion 回傳的驗證碼與瀏覽器 cookie 不一致',
      fix: '通常是過期分頁，連續出現才需要查',
    })
    const redirectBase = new URL(returnUrl, request.nextUrl.origin)
    redirectBase.searchParams.set('notion', 'error')
    return NextResponse.redirect(redirectBase.toString())
  }

  const redirectBase = new URL(returnUrl, request.nextUrl.origin)

  if (error || !code) {
    redirectBase.searchParams.set('notion', 'error')
    return NextResponse.redirect(redirectBase.toString())
  }

  const clientId = process.env.NOTION_CLIENT_ID
  const clientSecret = process.env.NOTION_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    redirectBase.searchParams.set('notion', 'error')
    return NextResponse.redirect(redirectBase.toString())
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64'
    )

    const tokenResponse = await fetch(
      'https://api.notion.com/v1/oauth/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.NOTION_REDIRECT_URI
            ?? new URL('/api/notion/callback', request.nextUrl.origin).toString(),
        }),
      }
    )

    if (!tokenResponse.ok) {
      let notionError = ''
      try {
        notionError = (await tokenResponse.json()).error ?? ''
      } catch {
        // The body is not JSON. The status code is enough.
      }
      await sendAlert({
        key: 'notion-token-exchange',
        title: 'Notion 連線失敗：換取 token',
        detail: `HTTP ${tokenResponse.status} ${notionError}`.trim(),
        fix: '到 Notion integration 設定重發 secret，更新 Vercel 的 NOTION_CLIENT_SECRET',
      })
      redirectBase.searchParams.set('notion', 'error')
      return NextResponse.redirect(redirectBase.toString())
    }

    const tokenData = await tokenResponse.json()

    await setNotionSession({
      notionAccessToken: tokenData.access_token,
      notionWorkspaceId: tokenData.workspace_id,
    })

    redirectBase.searchParams.set('notion', 'connected')
    return NextResponse.redirect(redirectBase.toString())
  } catch (caught) {
    await sendAlert({
      key: 'notion-callback-crash',
      title: 'Notion 連線失敗：程式錯誤',
      detail: errorMessage(caught),
      fix: '查 Vercel 紀錄與 NOTION_ENCRYPTION_SECRET',
    })
    redirectBase.searchParams.set('notion', 'error')
    return NextResponse.redirect(redirectBase.toString())
  }
}
