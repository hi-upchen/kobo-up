/**
 * Tests for the deep health check endpoint that UptimeRobot polls.
 * Every check is mocked. Each test loads a fresh route module so the
 * 60 second result cache starts empty.
 */
import { NextRequest } from 'next/server'

// The mock functions live outside the factory so they survive the module
// reset that loadRoute performs.
const mockChecks = {
  checkEnvSet: jest.fn(),
  checkNotionSecret: jest.fn(),
  checkBlob: jest.fn(),
  checkAlertChannel: jest.fn(),
}
jest.mock('@/lib/health/checks', () => mockChecks)

const KEY = 'test-health-key'
const pass = { status: 'pass' }

function req(key?: string): NextRequest {
  const url = key === undefined ? 'http://localhost/api/health' : `http://localhost/api/health?key=${key}`
  return new NextRequest(url)
}

async function loadRoute() {
  jest.resetModules()
  return import('../route')
}

describe('GET /api/health', () => {
  const ORIGINAL_KEY = process.env.HEALTH_CHECK_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    process.env.HEALTH_CHECK_KEY = KEY
    mockChecks.checkEnvSet.mockReturnValue(pass)
    mockChecks.checkNotionSecret.mockResolvedValue(pass)
    mockChecks.checkBlob.mockResolvedValue(pass)
    mockChecks.checkAlertChannel.mockResolvedValue(pass)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    if (ORIGINAL_KEY === undefined) delete process.env.HEALTH_CHECK_KEY
    else process.env.HEALTH_CHECK_KEY = ORIGINAL_KEY
  })

  it('returns 401 without the key, with a wrong key, and when HEALTH_CHECK_KEY is unset', async () => {
    const { GET } = await loadRoute()
    for (const r of [req(), req('wrong-key-value')]) {
      const res = await GET(r)
      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ status: 'fail' })
    }
    delete process.env.HEALTH_CHECK_KEY
    const res = await GET(req(''))
    expect(res.status).toBe(401)
    expect(mockChecks.checkNotionSecret).not.toHaveBeenCalled()
  })

  it('returns 200 and status pass when every check passes', async () => {
    const { GET } = await loadRoute()
    const res = await GET(req(KEY))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/health+json')
    const body = await res.json()
    expect(body.status).toBe('pass')
    expect(Object.keys(body.checks).sort()).toEqual(
      ['alertChannel', 'blob', 'mailgunSettings', 'notionSecret', 'notionSettings'].sort(),
    )
    expect(typeof body.time).toBe('string')
    expect(JSON.stringify(body)).not.toContain(KEY)
  })

  it('checks the right variables for the Notion and Mailgun settings', async () => {
    const { GET } = await loadRoute()
    await GET(req(KEY))
    expect(mockChecks.checkEnvSet).toHaveBeenCalledWith([
      'NOTION_CLIENT_ID',
      'NOTION_CLIENT_SECRET',
      'NOTION_ENCRYPTION_SECRET',
    ])
    expect(mockChecks.checkEnvSet).toHaveBeenCalledWith([
      'MAILGUN_SENDING_API_KEY',
      'MAILGUN_SENDING_DOMAIN',
      'INTERNAL_NOTIFICATION_EMAIL',
    ])
  })

  it('returns 200 and status warn when one check warns and none fail', async () => {
    mockChecks.checkNotionSecret.mockResolvedValue({ status: 'warn', output: 'Notion 異常' })
    const { GET } = await loadRoute()
    const res = await GET(req(KEY))
    expect(res.status).toBe(200)
    expect((await res.json()).status).toBe('warn')
  })

  it("returns 503 when any check fails, and lists that check's output and fix", async () => {
    mockChecks.checkBlob.mockResolvedValue({ status: 'fail', output: '停用', fix: '處理' })
    const { GET } = await loadRoute()
    const res = await GET(req(KEY))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.status).toBe('fail')
    expect(body.checks.blob).toEqual({ status: 'fail', output: '停用', fix: '處理' })
  })

  it('reports a check that rejects as fail, logs it, and keeps the response text', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockChecks.checkNotionSecret.mockRejectedValue(new Error('boom'))
    const { GET } = await loadRoute()
    const res = await GET(req(KEY))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.checks.notionSecret).toMatchObject({ status: 'fail', output: '檢查執行失敗' })
    expect(spy).toHaveBeenCalledWith('health check failed:', 'notionSecret', expect.stringContaining('boom'))
  })

  it('serves the cached result for 60 seconds', async () => {
    let now = 1_000_000
    jest.spyOn(Date, 'now').mockImplementation(() => now)
    const { GET } = await loadRoute()
    await GET(req(KEY))
    now += 59_000
    await GET(req(KEY))
    expect(mockChecks.checkBlob).toHaveBeenCalledTimes(1)
    now += 2_000
    await GET(req(KEY))
    expect(mockChecks.checkBlob).toHaveBeenCalledTimes(2)
  })

  it('shares one computation between concurrent requests', async () => {
    let release: (value: unknown) => void = () => {}
    mockChecks.checkBlob.mockReturnValue(new Promise((resolve) => (release = resolve)))
    const { GET } = await loadRoute()
    const first = GET(req(KEY))
    const second = GET(req(KEY))
    await new Promise((r) => setImmediate(r))
    release(pass)
    await Promise.all([first, second])
    expect(mockChecks.checkBlob).toHaveBeenCalledTimes(1)
  })
})
