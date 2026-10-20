import { list } from '@vercel/blob'
import {
  checkAlertChannel,
  checkBlob,
  checkEnvSet,
  checkNotionSecret,
} from '../checks'

jest.mock('@vercel/blob', () => {
  class BlobStoreSuspendedError extends Error {}
  class BlobAccessError extends Error {}
  class BlobServiceNotAvailable extends Error {}
  class BlobRequestAbortedError extends Error {}
  return {
    list: jest.fn(),
    BlobStoreSuspendedError,
    BlobAccessError,
    BlobServiceNotAvailable,
    BlobRequestAbortedError,
  }
})

const blob = jest.requireMock('@vercel/blob')

const json = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response

function mockFetchByUrl(routes: Record<string, Response | Error>) {
  return jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    const key = Object.keys(routes).find((k) => url.includes(k))
    if (!key) throw new Error(`unexpected url ${url}`)
    const r = routes[key]
    if (r instanceof Error) throw r
    return r
  })
}

const savedEnv = { ...process.env }
beforeEach(() => {
  jest.clearAllMocks()
  process.env.NOTION_CLIENT_ID = 'notion-id'
  process.env.NOTION_CLIENT_SECRET = 'notion-secret'
  process.env.BLOB_READ_WRITE_TOKEN = 'blob-secret'
  process.env.ALERT_TELEGRAM_BOT_TOKEN = 'tg-secret'
  process.env.ALERT_TELEGRAM_CHAT_ID = '123'
  delete process.env.NOTION_REDIRECT_URI
})
afterEach(() => {
  jest.restoreAllMocks()
  process.env = { ...savedEnv }
})

describe('checkEnvSet', () => {
  it('fails and names the missing variable, never a value', () => {
    process.env.CHECK_A = 'value-a'
    delete process.env.CHECK_B
    const r = checkEnvSet(['CHECK_A', 'CHECK_B'])
    expect(r.status).toBe('fail')
    expect(r.output).toContain('CHECK_B')
    expect(r.output).not.toContain('CHECK_A')
    expect(r.output).not.toContain('value-a')
  })

  it('passes when every variable is set', () => {
    process.env.CHECK_A = 'a'
    process.env.CHECK_B = 'b'
    expect(checkEnvSet(['CHECK_A', 'CHECK_B']).status).toBe('pass')
  })
})

describe('checkNotionSecret', () => {
  it('fails on 401 invalid_client with a hint about the integration settings', async () => {
    mockFetchByUrl({ '/oauth/token': json({ error: 'invalid_client' }, 401) })
    const r = await checkNotionSecret()
    expect(r.status).toBe('fail')
    expect(r.fix).toContain('Notion')
    expect(r.fix).toContain('Vercel')
  })

  it('fails on invalid_client even when the status is not 401', async () => {
    mockFetchByUrl({ '/oauth/token': json({ error: 'invalid_client' }, 400) })
    expect((await checkNotionSecret()).status).toBe('fail')
  })

  it('passes on 403 test_env_error', async () => {
    mockFetchByUrl({ '/oauth/token': json({ error: 'test_env_error' }, 403) })
    expect((await checkNotionSecret()).status).toBe('pass')
  })

  it('passes on 400 invalid_request', async () => {
    mockFetchByUrl({ '/oauth/token': json({ error: 'invalid_request' }, 400) })
    expect((await checkNotionSecret()).status).toBe('pass')
  })

  it('warns on 503', async () => {
    mockFetchByUrl({ '/oauth/token': json({}, 503) })
    expect((await checkNotionSecret()).status).toBe('warn')
  })

  it('sends the UUID-shaped fake code with basic auth and the default redirect', async () => {
    const spy = mockFetchByUrl({ '/oauth/token': json({ error: 'test_env_error' }, 403) })
    await checkNotionSecret()
    const [, init] = spy.mock.calls[0]
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      grant_type: 'authorization_code',
      code: '00000000-0000-4000-8000-000000000000',
      redirect_uri: 'https://kobo-up.runawayup.com/api/notion/callback',
    })
    const expected = Buffer.from('notion-id:notion-secret').toString('base64')
    expect(init?.headers).toMatchObject({ Authorization: `Basic ${expected}` })
  })

  it('fails without fetching when the client ID is missing', async () => {
    delete process.env.NOTION_CLIENT_ID
    const spy = jest.spyOn(global, 'fetch')
    const r = await checkNotionSecret()
    expect(r.status).toBe('fail')
    expect(r.output).toContain('NOTION_CLIENT_ID')
    expect(spy).not.toHaveBeenCalled()
  })

  it('fails without fetching when the client secret is missing', async () => {
    delete process.env.NOTION_CLIENT_SECRET
    const spy = jest.spyOn(global, 'fetch')
    const r = await checkNotionSecret()
    expect(r.status).toBe('fail')
    expect(spy).not.toHaveBeenCalled()
  })

  it('warns when the request times out', async () => {
    mockFetchByUrl({
      '/oauth/token': new DOMException('The operation timed out', 'TimeoutError') as unknown as Error,
    })
    expect((await checkNotionSecret()).status).toBe('warn')
  })

  it('warns on a thrown error and hides the secret in its output', async () => {
    mockFetchByUrl({ '/oauth/token': new Error('failed with notion-secret inside') })
    const r = await checkNotionSecret()
    expect(r.status).toBe('warn')
    expect(r.output).toContain('***')
    expect(r.output).not.toContain('notion-secret')
  })
})

describe('checkBlob', () => {
  it('passes when list resolves, called with limit 1', async () => {
    ;(list as jest.Mock).mockResolvedValue({ blobs: [] })
    expect((await checkBlob()).status).toBe('pass')
    expect(list).toHaveBeenCalledWith({ limit: 1, abortSignal: expect.any(AbortSignal) })
  })

  it('fails when the store is suspended', async () => {
    ;(list as jest.Mock).mockRejectedValue(new blob.BlobStoreSuspendedError('x'))
    expect((await checkBlob()).status).toBe('fail')
  })

  it('fails when access is denied', async () => {
    ;(list as jest.Mock).mockRejectedValue(new blob.BlobAccessError('x'))
    expect((await checkBlob()).status).toBe('fail')
  })

  it('warns when the service is not available', async () => {
    ;(list as jest.Mock).mockRejectedValue(new blob.BlobServiceNotAvailable('x'))
    expect((await checkBlob()).status).toBe('warn')
  })

  it('warns when the request is aborted by the timeout', async () => {
    ;(list as jest.Mock).mockRejectedValue(new blob.BlobRequestAbortedError('x'))
    expect((await checkBlob()).status).toBe('warn')
  })

  it('warns on a network error', async () => {
    ;(list as jest.Mock).mockRejectedValue(new TypeError('fetch failed'))
    expect((await checkBlob()).status).toBe('warn')
  })

  it('hides the token in the output of an unknown error', async () => {
    ;(list as jest.Mock).mockRejectedValue(new Error('oops blob-secret'))
    const r = await checkBlob()
    expect(r.output).not.toContain('blob-secret')
  })

  it('fails without calling list when the token is missing', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN
    const r = await checkBlob()
    expect(r.status).toBe('fail')
    expect(r.output).toContain('BLOB_READ_WRITE_TOKEN')
    expect(list).not.toHaveBeenCalled()
  })
})

describe('checkAlertChannel', () => {
  it('passes when getChat succeeds, with one call only', async () => {
    const spy = mockFetchByUrl({ '/getChat': json({ ok: true }) })
    expect((await checkAlertChannel()).status).toBe('pass')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('fails when the chat is not found', async () => {
    mockFetchByUrl({ '/getChat': json({ ok: false, description: 'Bad Request: chat not found' }) })
    const r = await checkAlertChannel()
    expect(r.status).toBe('fail')
    expect(r.output).toContain('chat not found')
  })

  it('never leaks the token from a fetch error', async () => {
    mockFetchByUrl({
      '/getChat': new Error('fetch failed https://api.telegram.org/bottg-secret/getChat'),
    })
    const r = await checkAlertChannel()
    expect(r.status).toBe('fail')
    expect(r.output).not.toContain('tg-secret')
  })

  it('fails naming the variable when the token is unset', async () => {
    delete process.env.ALERT_TELEGRAM_BOT_TOKEN
    const r = await checkAlertChannel()
    expect(r).toMatchObject({ status: 'fail', output: 'ALERT_TELEGRAM_BOT_TOKEN 未設定' })
  })

  it('fails naming the variable when the chat ID is unset', async () => {
    delete process.env.ALERT_TELEGRAM_CHAT_ID
    const r = await checkAlertChannel()
    expect(r).toMatchObject({ status: 'fail', output: 'ALERT_TELEGRAM_CHAT_ID 未設定' })
  })
})
