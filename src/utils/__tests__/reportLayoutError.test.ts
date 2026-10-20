type ReportLayoutError = typeof import('../reportLayoutError').reportLayoutError

// Each test loads a fresh module, so the once-per-operation memory starts empty.
let reportLayoutError: ReportLayoutError

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

function setNavigator(value: unknown) {
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true })
}

async function bodyOf(blob: Blob): Promise<Record<string, unknown>> {
  return JSON.parse(await blob.text())
}

describe('reportLayoutError', () => {
  beforeEach(async () => {
    jest.resetModules()
    reportLayoutError = (await import('../reportLayoutError')).reportLayoutError
  })

  afterEach(() => {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator)
    else delete (globalThis as { navigator?: unknown }).navigator
  })

  it('sends operation, message and browser with sendBeacon', async () => {
    const sendBeacon = jest.fn().mockReturnValue(true)
    setNavigator({ sendBeacon, userAgent: 'Mozilla/5.0 Chrome/120 Safari/537.36' })

    reportLayoutError('book loading', 'no such column: Foo')

    expect(sendBeacon).toHaveBeenCalledTimes(1)
    const [url, blob] = sendBeacon.mock.calls[0]
    expect(url).toBe('/api/client-error')
    expect(blob.type).toBe('text/plain')
    expect(await bodyOf(blob)).toEqual({
      operation: 'book loading',
      message: 'no such column: Foo',
      browser: 'Chrome',
    })
  })

  it('sends each operation at most once per page load', () => {
    const sendBeacon = jest.fn()
    setNavigator({ sendBeacon, userAgent: 'x' })

    reportLayoutError('loading', 'first')
    reportLayoutError('loading', 'second')
    reportLayoutError('book loading', 'third')

    expect(sendBeacon).toHaveBeenCalledTimes(2)
  })

  it('cuts a 300-character message to 200', async () => {
    const sendBeacon = jest.fn()
    setNavigator({ sendBeacon, userAgent: 'x' })

    reportLayoutError('loading', 'a'.repeat(300))

    const body = await bodyOf(sendBeacon.mock.calls[0][1])
    expect((body.message as string).length).toBe(200)
  })

  it.each([
    ['Mozilla/5.0 Chrome/120 Safari/537 Edg/120', 'Edge'],
    ['Mozilla/5.0 Gecko/20100101 Firefox/120', 'Firefox'],
    ['Mozilla/5.0 Chrome/120 Safari/537', 'Chrome'],
    ['Mozilla/5.0 Version/17 Safari/605', 'Safari'],
    ['curl/8', 'other'],
  ])('detects %s as %s', async (userAgent, browser) => {
    const sendBeacon = jest.fn()
    setNavigator({ sendBeacon, userAgent })

    reportLayoutError('loading', 'm')

    expect((await bodyOf(sendBeacon.mock.calls[0][1])).browser).toBe(browser)
  })

  it('does not throw without navigator', () => {
    delete (globalThis as { navigator?: unknown }).navigator
    expect(() => reportLayoutError('loading', 'm')).not.toThrow()
  })

  it('does nothing without sendBeacon', () => {
    setNavigator({ userAgent: 'x' })
    expect(() => reportLayoutError('loading', 'm')).not.toThrow()
  })

  it('does not throw when sendBeacon throws', () => {
    setNavigator({ sendBeacon: () => { throw new Error('boom') }, userAgent: 'x' })
    expect(() => reportLayoutError('loading', 'm')).not.toThrow()
  })
})
