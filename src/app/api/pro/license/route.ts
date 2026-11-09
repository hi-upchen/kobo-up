/**
 * POST /api/pro/license
 *
 * Activates or validates a Kobo Note Up Pro license key with Polar.
 * The body is { action: 'activate', key, label } or
 * { action: 'validate', key, activationId }.
 * Malformed input is rejected before Polar is called.
 * The response carries only the outcome, never Polar's customer data.
 */
import { NextResponse } from 'next/server'
import { getPolarConfig, looksLikeLicenseKey } from '@/lib/pro/polarConfig'
import { activateLicense, validateLicense, type LicenseResult } from '@/lib/pro/polarLicense'

const MAX_BODY_CHARS = 2048
const ACTIVATION_ID_PATTERN = /^[0-9a-f-]{36}$/i

const STATUS_BY_CODE = { invalid: 404, limit_reached: 403, network: 502 } as const

function respond(result: LicenseResult) {
  if (result.ok) return NextResponse.json(result)
  return NextResponse.json(result, { status: STATUS_BY_CODE[result.code] })
}

export async function POST(request: Request) {
  const text = await request.text().catch(() => '')
  if (text.length > MAX_BODY_CHARS) {
    return NextResponse.json({ ok: false, code: 'bad_request' }, { status: 413 })
  }
  let body: { action?: string; key?: unknown; label?: unknown; activationId?: unknown } | null
  try {
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({ ok: false, code: 'bad_request' }, { status: 400 })
  }
  if (!looksLikeLicenseKey(body?.key)) {
    return NextResponse.json({ ok: false, code: 'malformed_key' }, { status: 400 })
  }
  const key = body.key.trim()
  const config = getPolarConfig()

  if (body.action === 'activate') {
    const label = typeof body.label === 'string' ? body.label.slice(0, 80) : 'Browser'
    return respond(await activateLicense(key, label, config))
  }
  const activationId = String(body.activationId)
  if (body.action === 'validate' && ACTIVATION_ID_PATTERN.test(activationId)) {
    return respond(await validateLicense(key, activationId, config))
  }
  return NextResponse.json({ ok: false, code: 'bad_request' }, { status: 400 })
}
