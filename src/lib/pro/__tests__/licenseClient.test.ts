import {
  LICENSE_STORAGE_KEY,
  OFFLINE_GRACE_MS,
  activateLicenseKey,
  isLicenseFresh,
  readStoredLicense,
  removeStoredLicense,
  revalidateStoredLicense,
  type LicenseDeps,
} from '../licenseClient'

const KEY = 'KNUP-0A1B2C3D-1111-2222-3333-444455556666'
const AID = '38f74372-81bd-4f47-bdad-97dcee780ab4'

function makeDeps(now: number, route: jest.Mock): LicenseDeps & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    storage: {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    },
    fetchImpl: route as unknown as typeof fetch,
    now: () => now,
  }
}

const reply = (status: number, body: unknown) => jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body })

describe('activateLicenseKey', () => {
  it('stores the key and activation on success', async () => {
    const deps = makeDeps(1000, reply(200, { ok: true, activationId: AID }))
    expect(await activateLicenseKey(` ${KEY} `, deps, 'Chrome browser')).toEqual({ ok: true })
    expect(readStoredLicense(deps.storage)).toEqual({ key: KEY, activationId: AID, validatedAt: 1000 })
  })

  it.each([
    [404, { ok: false, code: 'invalid' }, 'invalid'],
    [403, { ok: false, code: 'limit_reached' }, 'limit_reached'],
    [400, { ok: false, code: 'malformed_key' }, 'malformed_key'],
    [502, { ok: false, code: 'network' }, 'network'],
  ])('maps status %s to %s and stores nothing', async (status, body, code) => {
    const deps = makeDeps(1000, reply(status, body))
    expect(await activateLicenseKey(KEY, deps)).toEqual({ ok: false, code })
    expect(deps.data.size).toBe(0)
  })

  it('reports a network error when fetch throws', async () => {
    const deps = makeDeps(1000, jest.fn().mockRejectedValue(new Error('offline')))
    expect(await activateLicenseKey(KEY, deps)).toEqual({ ok: false, code: 'network' })
  })
})

describe('revalidateStoredLicense', () => {
  const stored = JSON.stringify({ key: KEY, activationId: AID, validatedAt: 1 })

  it('does nothing without a stored key', async () => {
    const route = reply(200, { ok: true })
    expect(await revalidateStoredLicense(makeDeps(5, route))).toBe('none')
    expect(route).not.toHaveBeenCalled()
  })

  it('refreshes the validation time on success', async () => {
    const deps = makeDeps(5000, reply(200, { ok: true }))
    deps.data.set(LICENSE_STORAGE_KEY, stored)
    expect(await revalidateStoredLicense(deps)).toBe('valid')
    expect(readStoredLicense(deps.storage)?.validatedAt).toBe(5000)
  })

  it('keeps the key on a network failure', async () => {
    const deps = makeDeps(5000, reply(502, { ok: false, code: 'network' }))
    deps.data.set(LICENSE_STORAGE_KEY, stored)
    expect(await revalidateStoredLicense(deps)).toBe('network')
    expect(readStoredLicense(deps.storage)?.validatedAt).toBe(1)
  })

  it('removes the key when Polar says it is invalid', async () => {
    const deps = makeDeps(5000, reply(404, { ok: false, code: 'invalid' }))
    deps.data.set(LICENSE_STORAGE_KEY, stored)
    expect(await revalidateStoredLicense(deps)).toBe('invalid')
    expect(readStoredLicense(deps.storage)).toBeNull()
  })
})

describe('offline grace period', () => {
  const lic = { key: KEY, activationId: AID, validatedAt: 1000 }

  it('is fresh within 14 days and stale after', () => {
    expect(isLicenseFresh(lic, 1000 + OFFLINE_GRACE_MS)).toBe(true)
    expect(isLicenseFresh(lic, 1000 + OFFLINE_GRACE_MS + 1)).toBe(false)
    expect(OFFLINE_GRACE_MS).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000)
    expect(isLicenseFresh(null, 0)).toBe(false)
  })
})

describe('removeStoredLicense', () => {
  it('clears the key from this browser', () => {
    const deps = makeDeps(1, reply(200, {}))
    deps.data.set(LICENSE_STORAGE_KEY, JSON.stringify({ key: KEY, activationId: AID, validatedAt: 1 }))
    removeStoredLicense(deps.storage)
    expect(readStoredLicense(deps.storage)).toBeNull()
  })

  it('ignores corrupted storage', () => {
    const deps = makeDeps(1, reply(200, {}))
    deps.data.set(LICENSE_STORAGE_KEY, '{bad')
    expect(readStoredLicense(deps.storage)).toBeNull()
  })
})
