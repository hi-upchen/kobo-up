/**
 * Server-side calls to Polar's license-key endpoints.
 *
 * The browser never calls Polar. The route handler calls these functions,
 * so Polar sees one stable caller. A key counts as valid only when it is
 * granted and belongs to the Kobo Note Up benefit. A key for another Polar
 * product must not unlock Pro.
 */
import type { PolarConfig } from './polarConfig'

export type LicenseResult =
  | { ok: true; activationId?: string }
  | { ok: false; code: 'invalid' | 'limit_reached' | 'network' }

interface PolarResponse extends PolarLicenseKey {
  id?: string
  license_key?: PolarLicenseKey
}

interface PolarLicenseKey {
  benefit_id?: string
  status?: string
}

function isOurGrantedKey(key: PolarLicenseKey | null | undefined, config: PolarConfig): boolean {
  return key?.benefit_id === config.benefitId && key?.status === 'granted'
}

async function postToPolar(
  config: PolarConfig,
  action: 'activate' | 'validate',
  body: Record<string, string>,
  fetchImpl: typeof fetch
): Promise<{ status: number; json: PolarResponse | null } | null> {
  try {
    const res = await fetchImpl(`${config.apiBase}/v1/customer-portal/license-keys/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, organization_id: config.organizationId }),
      signal: AbortSignal.timeout(10_000),
    })
    const json = await res.json().catch(() => null)
    return { status: res.status, json }
  } catch {
    return null
  }
}

/** Activates the key for one browser. Polar allows 3 activations per key. */
export async function activateLicense(
  key: string,
  label: string,
  config: PolarConfig,
  fetchImpl: typeof fetch = fetch
): Promise<LicenseResult> {
  const res = await postToPolar(config, 'activate', { key, label }, fetchImpl)
  if (!res || res.status >= 500 || res.status === 429) return { ok: false, code: 'network' }
  if (res.status === 403) return { ok: false, code: 'limit_reached' }
  if (res.status !== 200) return { ok: false, code: 'invalid' }
  if (!isOurGrantedKey(res.json?.license_key, config) || typeof res.json?.id !== 'string') {
    return { ok: false, code: 'invalid' }
  }
  return { ok: true, activationId: res.json.id }
}

/** Checks that the key and its activation are still valid. */
export async function validateLicense(
  key: string,
  activationId: string,
  config: PolarConfig,
  fetchImpl: typeof fetch = fetch
): Promise<LicenseResult> {
  const res = await postToPolar(
    config,
    'validate',
    { key, activation_id: activationId },
    fetchImpl
  )
  if (!res || res.status >= 500 || res.status === 429) return { ok: false, code: 'network' }
  if (res.status !== 200 || !isOurGrantedKey(res.json, config)) return { ok: false, code: 'invalid' }
  return { ok: true }
}
