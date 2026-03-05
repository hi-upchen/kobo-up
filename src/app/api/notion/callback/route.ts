import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { setNotionSession } from '@/lib/notion/session'

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
  const redirectUri = process.env.NOTION_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
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
          redirect_uri: redirectUri,
        }),
      }
    )

    if (!tokenResponse.ok) {
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
  } catch {
    redirectBase.searchParams.set('notion', 'error')
    return NextResponse.redirect(redirectBase.toString())
  }
}
