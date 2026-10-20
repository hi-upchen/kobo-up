import { NextRequest } from 'next/server'

const mockSendAlert = jest.fn()
const mockSetNotionSession = jest.fn()
const mockCookieGet = jest.fn()
const mockCookieDelete = jest.fn()

jest.mock('@/lib/alert', () => ({
  ...jest.requireActual('@/lib/alert'),
  sendAlert: (...args: unknown[]) => mockSendAlert(...args),
}))
jest.mock('@/lib/notion/session', () => ({
  setNotionSession: (...args: unknown[]) => mockSetNotionSession(...args),
}))
jest.mock('next/headers', () => ({
  cookies: async () => ({ get: mockCookieGet, delete: mockCookieDelete }),
}))

const NONCE = 'nonce-123'

function makeRequest(params: Record<string, string>, nonce: string = NONCE) {
  const state = Buffer.from(JSON.stringify({ returnUrl: '/books', nonce })).toString('base64url')
  const url = new URL('http://localhost:3000/api/notion/callback')
  url.searchParams.set('state', state)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return new NextRequest(url)
}

async function loadGet() {
  jest.resetModules()
  const { GET } = await import('../callback/route')
  return GET
}

describe('GET /api/notion/callback', () => {
  const originalFetch = global.fetch
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.clearAllMocks()
    mockSendAlert.mockResolvedValue(undefined)
    mockCookieGet.mockReturnValue({ value: NONCE })
    process.env.NOTION_CLIENT_ID = 'client-id'
    process.env.NOTION_CLIENT_SECRET = 'client-secret'
  })

  afterEach(() => {
    global.fetch = originalFetch
    process.env = { ...originalEnv }
  })

  it('redirects without an alert when the user cancels', async () => {
    const GET = await loadGet()
    const response = await GET(makeRequest({ error: 'access_denied' }))

    expect(response.headers.get('location')).toContain('notion=error')
    expect(mockSendAlert).not.toHaveBeenCalled()
  })

  it('sends a state alert when the nonce does not match', async () => {
    const GET = await loadGet()
    const response = await GET(makeRequest({ code: 'abc' }, 'other-nonce'))

    expect(response.headers.get('location')).toContain('notion=error')
    expect(mockSendAlert).toHaveBeenCalledTimes(1)
    expect(mockSendAlert.mock.calls[0][0].key).toBe('notion-callback-state')
  })

  it('sends a token alert with the Notion error when the exchange fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'invalid_client' }),
    }) as unknown as typeof fetch
    const GET = await loadGet()

    const response = await GET(makeRequest({ code: 'abc' }))

    expect(response.headers.get('location')).toContain('notion=error')
    expect(mockSendAlert).toHaveBeenCalledTimes(1)
    const input = mockSendAlert.mock.calls[0][0]
    expect(input.key).toBe('notion-token-exchange')
    expect(input.detail).toContain('invalid_client')
  })

  it('still alerts when the failed token reply is not JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('not json')
      },
    }) as unknown as typeof fetch
    const GET = await loadGet()

    await GET(makeRequest({ code: 'abc' }))

    expect(mockSendAlert.mock.calls[0][0].key).toBe('notion-token-exchange')
    expect(mockSendAlert.mock.calls[0][0].detail).toContain('502')
  })

  it('sends a crash alert without the token when saving the session throws', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'secret_access_token', workspace_id: 'ws' }),
    }) as unknown as typeof fetch
    mockSetNotionSession.mockRejectedValue(new Error('NOTION_ENCRYPTION_SECRET is not set'))
    const GET = await loadGet()

    const response = await GET(makeRequest({ code: 'abc' }))

    expect(response.headers.get('location')).toContain('notion=error')
    expect(mockSendAlert).toHaveBeenCalledTimes(1)
    const input = mockSendAlert.mock.calls[0][0]
    expect(input.key).toBe('notion-callback-crash')
    expect(JSON.stringify(input)).not.toContain('secret_access_token')
  })

  it('redirects with connected and no alert on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 't', workspace_id: 'ws' }),
    }) as unknown as typeof fetch
    mockSetNotionSession.mockResolvedValue(undefined)
    const GET = await loadGet()

    const response = await GET(makeRequest({ code: 'abc' }))

    expect(response.headers.get('location')).toContain('notion=connected')
    expect(mockSendAlert).not.toHaveBeenCalled()
  })

  it('still redirects when Telegram never answers', async () => {
    // Uses the real sendAlert. Its 3 second send timeout must free the callback.
    mockSendAlert.mockImplementation((...args: unknown[]) =>
      jest.requireActual('@/lib/alert').sendAlert(...args)
    )
    process.env.ALERT_TELEGRAM_BOT_TOKEN = 'bot-token'
    process.env.ALERT_TELEGRAM_CHAT_ID = '123'
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(AbortSignal, 'timeout').mockReturnValue(AbortSignal.abort())
    const telegramFetch = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init.signal!
          if (signal.aborted) reject(signal.reason)
          signal.addEventListener('abort', () => reject(signal.reason))
        })
    )
    global.fetch = telegramFetch as unknown as typeof fetch
    const GET = await loadGet()

    const response = await GET(makeRequest({ code: 'abc' }, 'other-nonce'))

    expect(telegramFetch).toHaveBeenCalledTimes(1)
    expect(response.headers.get('location')).toContain('notion=error')
  })
})
