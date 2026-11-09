/**
 * Browser-side Pro license state.
 *
 * The key and its activation ID live in localStorage.
 * The app asks the server route to activate the key once per browser.
 * On load it validates the key again and remembers when that last worked.
 * A key stays valid offline for 14 days after its last successful check.
 * Storage, network and clock are injectable for tests.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { pushToDataLayer } from '@/utils/gtm'

export const LICENSE_STORAGE_KEY = 'kobo_pro_license'
export const OFFLINE_GRACE_MS = 14 * 24 * 60 * 60 * 1000

export interface StoredLicense {
  key: string
  activationId: string
  validatedAt: number
}

export type LicenseFailure = 'malformed_key' | 'invalid' | 'limit_reached' | 'network'
export type ActivateOutcome = { ok: true } | { ok: false; code: LicenseFailure }

export interface LicenseDeps {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  fetchImpl: typeof fetch
  now: () => number
}

function browserDeps(): LicenseDeps {
  return { storage: window.localStorage, fetchImpl: (input, init) => fetch(input, init), now: Date.now }
}

export function readStoredLicense(storage: LicenseDeps['storage']): StoredLicense | null {
  try {
    const parsed = JSON.parse(storage.getItem(LICENSE_STORAGE_KEY) ?? 'null')
    if (parsed && typeof parsed.key === 'string' && typeof parsed.activationId === 'string' && typeof parsed.validatedAt === 'number') {
      return parsed
    }
  } catch {
    // Storage blocked or value corrupted: treat as no license.
  }
  return null
}

function writeStoredLicense(storage: LicenseDeps['storage'], license: StoredLicense | null) {
  try {
    if (license) storage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(license))
    else storage.removeItem(LICENSE_STORAGE_KEY)
  } catch {
    // Storage blocked: the license simply does not persist.
  }
}

/** True when a stored key was validated within the offline grace period. */
export function isLicenseFresh(license: StoredLicense | null, now: number): boolean {
  return !!license && now - license.validatedAt <= OFFLINE_GRACE_MS
}

async function callRoute(
  body: Record<string, string>,
  fetchImpl: typeof fetch
): Promise<{ ok: true; activationId?: string } | { ok: false; code: LicenseFailure }> {
  try {
    const res = await fetchImpl('/api/pro/license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => null)
    if (res.ok && json?.ok) return { ok: true, activationId: json.activationId }
    if (json?.code === 'malformed_key' || json?.code === 'invalid' || json?.code === 'limit_reached') {
      return { ok: false, code: json.code }
    }
    return { ok: false, code: 'network' }
  } catch {
    return { ok: false, code: 'network' }
  }
}

function browserLabel(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const name = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  return `${name} browser`
}

/** Activates a pasted key for this browser and stores it on success. */
export async function activateLicenseKey(
  rawKey: string,
  deps: LicenseDeps,
  label: string = browserLabel()
): Promise<ActivateOutcome> {
  const key = rawKey.trim()
  const result = await callRoute({ action: 'activate', key, label }, deps.fetchImpl)
  if (!result.ok) return result
  writeStoredLicense(deps.storage, { key, activationId: result.activationId ?? '', validatedAt: deps.now() })
  return { ok: true }
}

/**
 * Validates the stored key again. A definite "invalid" answer removes the key.
 * A network failure keeps it, so the key works offline within the grace period.
 */
export async function revalidateStoredLicense(deps: LicenseDeps): Promise<'none' | 'valid' | 'invalid' | 'network'> {
  const stored = readStoredLicense(deps.storage)
  if (!stored) return 'none'
  const result = await callRoute(
    { action: 'validate', key: stored.key, activationId: stored.activationId },
    deps.fetchImpl
  )
  if (result.ok) {
    writeStoredLicense(deps.storage, { ...stored, validatedAt: deps.now() })
    return 'valid'
  }
  if (result.code === 'network') return 'network'
  writeStoredLicense(deps.storage, null)
  return 'invalid'
}

export function removeStoredLicense(storage: LicenseDeps['storage']) {
  writeStoredLicense(storage, null)
}

// --- React binding -------------------------------------------------------

const listeners = new Set<() => void>()
let revalidateStarted = false

function notify() {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const deps = browserDeps()
    return isLicenseFresh(readStoredLicense(deps.storage), deps.now())
  } catch {
    return false // localStorage blocked
  }
}

/** True when this browser holds a recently validated Pro license. */
export function useHasProLicense(): boolean {
  const hasLicense = useSyncExternalStore(subscribe, getSnapshot, () => false)
  useEffect(() => {
    if (revalidateStarted) return
    revalidateStarted = true
    revalidateStoredLicense(browserDeps()).then(notify)
  }, [])
  return hasLicense
}

/** Activates in this browser, reports analytics and updates every consumer. */
export async function activateInBrowser(rawKey: string): Promise<ActivateOutcome> {
  const outcome = await activateLicenseKey(rawKey, browserDeps())
  if (outcome.ok) pushToDataLayer({ event: 'pro_license_activated' })
  else if (outcome.code === 'invalid' || outcome.code === 'malformed_key' || outcome.code === 'limit_reached') {
    pushToDataLayer({ event: 'pro_license_invalid', reason: outcome.code })
  }
  notify()
  return outcome
}

export function removeLicenseFromBrowser() {
  removeStoredLicense(browserDeps().storage)
  notify()
}
