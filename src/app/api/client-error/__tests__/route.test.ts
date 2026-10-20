import { NextRequest } from 'next/server'

const mockSendAlert = jest.fn()

jest.mock('@/lib/alert', () => ({
  sendAlert: (...args: unknown[]) => mockSendAlert(...args),
}))

function makeRequest(body: string) {
  return new NextRequest('http://localhost:3000/api/client-error', { method: 'POST', body })
}

function validBody(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    operation: 'book loading',
    message: 'no such column: Foo',
    browser: 'Chrome',
    ...overrides,
  })
}

async function loadPost() {
  jest.resetModules()
  const { POST } = await import('../route')
  return POST
}

describe('POST /api/client-error', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSendAlert.mockResolvedValue(undefined)
  })

  it('answers 204 and sends an alert for a valid body', async () => {
    const POST = await loadPost()
    const res = await POST(makeRequest(validBody()))

    expect(res.status).toBe(204)
    expect(mockSendAlert).toHaveBeenCalledTimes(1)
    const input = mockSendAlert.mock.calls[0][0]
    expect(input.key).toBe('client-layout:book loading')
    expect(input.title).toBe('Kobo 資料庫結構可能改了')
    expect(input.detail).toContain('book loading')
    expect(input.detail).toContain('no such column: Foo')
    expect(input.detail).toContain('Chrome')
    expect(input.detail).toBe('操作：book loading · 訊息：no such column: Foo · 瀏覽器：Chrome')
    expect(input.fix).toBe('用最新韌體的 KoboReader.sqlite 測試，更新 src/models/KoboDB.ts 的查詢')
  })

  it('answers 400 for an unknown operation', async () => {
    const POST = await loadPost()
    const res = await POST(makeRequest(validBody({ operation: 'rm -rf' })))

    expect(res.status).toBe(400)
    expect(mockSendAlert).not.toHaveBeenCalled()
  })

  it('answers 400 when message is not a string', async () => {
    const POST = await loadPost()
    const res = await POST(makeRequest(validBody({ message: 42 })))

    expect(res.status).toBe(400)
    expect(mockSendAlert).not.toHaveBeenCalled()
  })

  it('answers 400 when message is longer than 200 characters', async () => {
    const POST = await loadPost()
    const res = await POST(makeRequest(validBody({ message: 'a'.repeat(201) })))

    expect(res.status).toBe(400)
    expect(mockSendAlert).not.toHaveBeenCalled()
  })

  it('answers 400 when the raw body is over 1024 bytes', async () => {
    const POST = await loadPost()
    const res = await POST(makeRequest(validBody({ padding: 'x'.repeat(1100) })))

    expect(res.status).toBe(400)
    expect(mockSendAlert).not.toHaveBeenCalled()
  })

  it('answers 400 for a browser value that is not on the list', async () => {
    const POST = await loadPost()
    const res = await POST(makeRequest(validBody({ browser: 'Netscape' })))

    expect(res.status).toBe(400)
    expect(mockSendAlert).not.toHaveBeenCalled()
  })

  it('answers 400 for invalid JSON', async () => {
    const POST = await loadPost()
    const res = await POST(makeRequest('{not json'))

    expect(res.status).toBe(400)
    expect(mockSendAlert).not.toHaveBeenCalled()
  })
})
