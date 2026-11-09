/**
 * @jest-environment jsdom
 */
/**
 * Checks the analytics events that activateInBrowser sends to the dataLayer.
 * The license route is mocked, so no real key or purchase is involved.
 */
import { activateInBrowser } from '../licenseClient'

const KEY = 'KNUP-0A1B2C3D-1111-2222-3333-444455556666'

function mockRoute(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }) as unknown as typeof fetch
}

describe('activateInBrowser analytics', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.dataLayer = []
  })

  it('pushes exactly one pro_license_activated event when the key is accepted', async () => {
    mockRoute(200, { ok: true, activationId: 'act-1' })
    await activateInBrowser(KEY)
    expect(window.dataLayer).toEqual([{ event: 'pro_license_activated' }])
  })

  it.each(['invalid', 'limit_reached', 'malformed_key'])(
    'pushes exactly one pro_license_failed event with reason %s',
    async (code) => {
      mockRoute(code === 'limit_reached' ? 403 : 404, { ok: false, code })
      await activateInBrowser(KEY)
      expect(window.dataLayer).toEqual([{ event: 'pro_license_failed', reason: code }])
    }
  )

  it('never puts the key in an event', async () => {
    mockRoute(200, { ok: true, activationId: 'act-1' })
    await activateInBrowser(KEY)
    mockRoute(404, { ok: false, code: 'invalid' })
    await activateInBrowser(KEY)
    expect(window.dataLayer).toHaveLength(2)
    expect(JSON.stringify(window.dataLayer)).not.toContain('KNUP')
  })

  it('pushes nothing on a network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch
    await activateInBrowser(KEY)
    expect(window.dataLayer).toEqual([])
  })
})
