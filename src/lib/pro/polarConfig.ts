/**
 * Polar settings for the license check.
 *
 * These IDs are public identifiers, not secrets. Polar's license-key
 * activate and validate endpoints need no access token.
 * Production Polar is used only when VERCEL_ENV is "production".
 * Preview deployments and local runs use the Polar sandbox.
 */

export interface PolarConfig {
  apiBase: string
  organizationId: string
  benefitId: string
}

const PRODUCTION: PolarConfig = {
  apiBase: 'https://api.polar.sh',
  organizationId: '3db6c33f-25bf-40e7-8187-55cb5f79ef76',
  benefitId: '53946f81-1c1d-4848-a4c1-339ffb6bd4e5',
}

const SANDBOX: PolarConfig = {
  apiBase: 'https://sandbox-api.polar.sh',
  organizationId: 'e3c5eca4-40ac-41b3-b443-7dda2479b12e',
  benefitId: 'c5fc0022-cf79-4d77-8d48-e9411bb1ea98',
}

export function getPolarConfig(vercelEnv: string | undefined = process.env.VERCEL_ENV): PolarConfig {
  return vercelEnv === 'production' ? PRODUCTION : SANDBOX
}

/** Customer portal where buyers free a device. */
export const POLAR_CUSTOMER_PORTAL_URL = 'https://polar.sh/kobo-note-up/portal'

/** A Polar license key: the KNUP prefix, then a UUID. */
const LICENSE_KEY_PATTERN =
  /^KNUP-[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i

export function looksLikeLicenseKey(key: unknown): key is string {
  return typeof key === 'string' && LICENSE_KEY_PATTERN.test(key.trim())
}
