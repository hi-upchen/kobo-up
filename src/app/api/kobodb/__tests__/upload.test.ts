const mockHandleUpload = jest.fn()
const mockSendAlert = jest.fn()

jest.mock('@vercel/blob/client', () => ({
  handleUpload: (...args: unknown[]) => mockHandleUpload(...args),
}))
jest.mock('@/lib/alert', () => ({
  ...jest.requireActual('@/lib/alert'),
  sendAlert: (...args: unknown[]) => mockSendAlert(...args),
}))

const BLOB_URL = 'https://blob.example.com/kobo.sqlite'

async function loadPost() {
  jest.resetModules()
  const { POST } = await import('../upload/route')
  return POST
}

function makeRequest() {
  return new Request('http://localhost/api/kobodb/upload', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

// Runs the route and returns the onUploadCompleted callback that handleUpload received.
async function captureUploadCompleted() {
  let completed: (arg: { blob: { url: string } }) => Promise<void> = async () => {}
  mockHandleUpload.mockImplementation(async (options: { onUploadCompleted: typeof completed }) => {
    completed = options.onUploadCompleted
    return { ok: true }
  })
  const POST = await loadPost()
  await POST(makeRequest())
  return completed
}

describe('POST /api/kobodb/upload', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    mockSendAlert.mockResolvedValue(undefined)
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('sends Mailgun and an unthrottled alert containing the blob URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
    const completed = await captureUploadCompleted()

    await completed({ blob: { url: BLOB_URL } })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(mockSendAlert).toHaveBeenCalledTimes(1)
    const input = mockSendAlert.mock.calls[0][0]
    expect(input.key).toBe('debug-upload')
    expect(input.throttleMs).toBe(0)
    expect(input.detail).toContain(BLOB_URL)
    expect(input.detail).not.toContain('\n')
  })

  it('still sends the alert when Mailgun throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch
    const completed = await captureUploadCompleted()

    await completed({ blob: { url: BLOB_URL } })

    const keys = mockSendAlert.mock.calls.map((call) => call[0].key)
    expect(keys).toContain('debug-upload')
  })

  it('sends a mailgun-failed alert when Mailgun replies with an error', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' }) as unknown as typeof fetch
    const completed = await captureUploadCompleted()

    await completed({ blob: { url: BLOB_URL } })

    const keys = mockSendAlert.mock.calls.map((call) => call[0].key)
    expect(keys).toEqual(expect.arrayContaining(['debug-upload', 'mailgun-failed']))
    const failed = mockSendAlert.mock.calls.find((call) => call[0].key === 'mailgun-failed')![0]
    expect(failed.detail).toContain('401')
  })

  it('returns 400 and sends an upload-failed alert when handleUpload throws', async () => {
    mockHandleUpload.mockRejectedValue(new Error('bad token'))
    const POST = await loadPost()

    const response = await POST(makeRequest())

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'bad token' })
    expect(mockSendAlert).toHaveBeenCalledTimes(1)
    const input = mockSendAlert.mock.calls[0][0]
    expect(input.key).toBe('upload-failed')
    expect(input.detail).toContain('bad token')
  })
})
