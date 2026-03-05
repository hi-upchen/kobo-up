import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { cookies } from 'next/headers'

const NONCE_COOKIE = 'notion_oauth_nonce'

export async function GET(request: NextRequest) {
  const clientId = process.env.NOTION_CLIENT_ID
  const redirectUri = process.env.NOTION_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Notion OAuth is not configured' },
      { status: 500 }
    )
  }

  let returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/books'

  // Validate returnUrl is a safe relative path (prevent open redirect)
  try {
    const parsed = new URL(returnUrl, request.nextUrl.origin)
    if (parsed.origin !== request.nextUrl.origin) returnUrl = '/books'
  } catch {
    returnUrl = '/books'
  }

  // Generate CSRF nonce and store in httpOnly cookie
  const nonce = crypto.randomBytes(16).toString('hex')
  const state = Buffer.from(JSON.stringify({ returnUrl, nonce })).toString('base64url')

  const cookieStore = await cookies()
  cookieStore.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  const authUrl = new URL('https://api.notion.com/v1/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('owner', 'user')
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
