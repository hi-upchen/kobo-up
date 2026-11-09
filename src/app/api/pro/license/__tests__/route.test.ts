/**
 * Tests for the Pro license route. Polar is mocked with a fake fetch,
 * so no test calls the network.
 */
import { POST } from '../route'
import { getPolarConfig } from '@/lib/pro/polarConfig'

const KEY = 'KNUP-0A1B2C3D-1111-2222-3333-444455556666'
const ACTIVATION_ID = '38f74372-81bd-4f47-bdad-97dcee780ab4'
const SANDBOX = getPolarConfig('preview')
const PRODUCTION = getPolarConfig('production')

const realFetch = global.fetch
let fetchMock: jest.Mock

function polarReply(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({ status, json: async () => body })
}

function call(body: unknown, raw?: string) {
  return POST(
    new Request('http://localhost/api/pro/license', {
      method: 'POST',
      body: raw ?? JSON.stringify(body),
    })
  )
}

beforeEach(() => {
  fetchMock = jest.fn()
  global.fetch = fetchMock as unknown as typeof fetch
})
afterAll(() => {
  global.fetch = realFetch
})

describe('environment choice', () => {
  it('uses the sandbox outside production and production only on Vercel production', () => {
    expect(getPolarConfig(undefined).apiBase).toBe('https://sandbox-api.polar.sh')
    expect(getPolarConfig('preview').apiBase).toBe('https://sandbox-api.polar.sh')
    expect(getPolarConfig('production').apiBase).toBe('https://api.polar.sh')
  })
})

describe('input checks', () => {
  it('rejects a malformed key without calling Polar', async () => {
    const res = await call({ action: 'activate', key: 'not-a-key' })
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('malformed_key')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON and oversized bodies', async () => {
    expect((await call(null, '{oops')).status).toBe(400)
    expect((await call(null, 'x'.repeat(5000))).status).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an unknown action and a validate call without an activation ID', async () => {
    expect((await call({ action: 'delete', key: KEY })).status).toBe(400)
    expect((await call({ action: 'validate', key: KEY })).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('activate', () => {
  it('returns the activation ID for a granted key of this product, with no Authorization header', async () => {
    polarReply(200, { id: ACTIVATION_ID, license_key: { benefit_id: SANDBOX.benefitId, status: 'granted', customer: { email: 'a@b.c' } } })
    const res = await call({ action: 'activate', key: KEY, label: 'Chrome browser' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, activationId: ACTIVATION_ID })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${SANDBOX.apiBase}/v1/customer-portal/license-keys/activate`)
    expect(init.headers.Authorization).toBeUndefined()
    expect(JSON.parse(init.body)).toEqual({ key: KEY, label: 'Chrome browser', organization_id: SANDBOX.organizationId })
  })

  it('treats a key of another Polar product as invalid', async () => {
    polarReply(200, { id: ACTIVATION_ID, license_key: { benefit_id: PRODUCTION.benefitId, status: 'granted' } })
    const res = await call({ action: 'activate', key: KEY })
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('invalid')
  })

  it('treats a revoked key as invalid', async () => {
    polarReply(200, { id: ACTIVATION_ID, license_key: { benefit_id: SANDBOX.benefitId, status: 'revoked' } })
    expect((await call({ action: 'activate', key: KEY })).status).toBe(404)
  })

  it('reports an unknown key as invalid', async () => {
    polarReply(404, { error: 'ResourceNotFound' })
    const res = await call({ action: 'activate', key: KEY })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ ok: false, code: 'invalid' })
  })

  it('reports the activation limit', async () => {
    polarReply(403, { error: 'NotPermitted', detail: 'License key activation limit already reached' })
    const res = await call({ action: 'activate', key: KEY })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ ok: false, code: 'limit_reached' })
  })

  it('reports a network failure and a Polar outage', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    const a = await call({ action: 'activate', key: KEY })
    expect(a.status).toBe(502)
    expect((await a.json()).code).toBe('network')
    polarReply(503, null)
    expect((await call({ action: 'activate', key: KEY })).status).toBe(502)
  })
})

describe('validate', () => {
  it('sends the activation ID and accepts a granted key of this product', async () => {
    polarReply(200, { benefit_id: SANDBOX.benefitId, status: 'granted' })
    const res = await call({ action: 'validate', key: KEY, activationId: ACTIVATION_ID })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      key: KEY,
      activation_id: ACTIVATION_ID,
      organization_id: SANDBOX.organizationId,
    })
  })

  it('rejects a revoked key, a foreign product and an unknown activation', async () => {
    polarReply(200, { benefit_id: SANDBOX.benefitId, status: 'revoked' })
    expect((await call({ action: 'validate', key: KEY, activationId: ACTIVATION_ID })).status).toBe(404)
    polarReply(200, { benefit_id: 'other', status: 'granted' })
    expect((await call({ action: 'validate', key: KEY, activationId: ACTIVATION_ID })).status).toBe(404)
    polarReply(404, { error: 'ResourceNotFound' })
    expect((await call({ action: 'validate', key: KEY, activationId: ACTIVATION_ID })).status).toBe(404)
  })

  it('reports a network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    const res = await call({ action: 'validate', key: KEY, activationId: ACTIVATION_ID })
    expect(res.status).toBe(502)
    expect((await res.json()).code).toBe('network')
  })
})
