import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  checkAlertChannel,
  checkBlob,
  checkEnvSet,
  checkNotionSecret,
  type CheckResult,
  type CheckStatus,
} from '@/lib/health/checks'
import { errorMessage, redactSecrets } from '@/lib/alert'

// Every request runs live checks, so this route must never be cached by Next.js.
export const dynamic = 'force-dynamic'

const CACHE_TTL_MS = 60_000
const CONTENT_TYPE = 'application/health+json'

interface HealthBody {
  status: CheckStatus
  checks: Record<string, CheckResult>
  time: string
}

const CHECKS: Record<string, () => CheckResult | Promise<CheckResult>> = {
  notionSettings: () =>
    checkEnvSet(['NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET', 'NOTION_ENCRYPTION_SECRET']),
  notionSecret: checkNotionSecret,
  blob: checkBlob,
  mailgunSettings: () =>
    checkEnvSet(['MAILGUN_SENDING_API_KEY', 'MAILGUN_SENDING_DOMAIN', 'INTERNAL_NOTIFICATION_EMAIL']),
  alertChannel: checkAlertChannel,
}

// The last computed answer, kept as a promise. An uptime poller and a human
// refreshing the page share it, so Notion and Telegram are not called on every hit.
// Requests that arrive during a run share that run.
let cached: { expiresAt: number; promise: Promise<HealthBody> } | null = null

// Runs one check and turns a throw or a rejection into a fail result.
// The page then always answers, whatever a dependency does.
// An unexpected error is logged with secrets removed, so its cause is not lost.
async function runCheck(
  name: string,
  check: () => CheckResult | Promise<CheckResult>,
): Promise<CheckResult> {
  try {
    return await check()
  } catch (err) {
    console.error('health check failed:', name, redactSecrets(errorMessage(err)))
    return { status: 'fail', output: '檢查執行失敗' }
  }
}

// Compares the request key with the configured key in constant time.
// A missing configured key denies every request.
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.HEALTH_CHECK_KEY
  if (!expected) return false
  const given = Buffer.from(request.nextUrl.searchParams.get('key') ?? '')
  const wanted = Buffer.from(expected)
  return given.length === wanted.length && timingSafeEqual(given, wanted)
}

// The worst status wins: any fail gives fail, else any warn gives warn.
function overallStatus(results: CheckResult[]): CheckStatus {
  if (results.some((r) => r.status === 'fail')) return 'fail'
  if (results.some((r) => r.status === 'warn')) return 'warn'
  return 'pass'
}

// Runs every check in parallel and builds the response body.
async function computeHealth(): Promise<HealthBody> {
  const entries = await Promise.all(
    Object.entries(CHECKS).map(async ([name, check]) => [name, await runCheck(name, check)] as const),
  )
  const checks: Record<string, CheckResult> = Object.fromEntries(entries)
  return {
    status: overallStatus(Object.values(checks)),
    checks,
    time: new Date().toISOString(),
  }
}

/**
 * Returns the deep health report that UptimeRobot polls.
 * It answers 503 when any check fails, so the monitor alerts on any non-2xx.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ status: 'fail' }, { status: 401 })
  }

  if (!cached || cached.expiresAt <= Date.now()) {
    cached = { expiresAt: Date.now() + CACHE_TTL_MS, promise: computeHealth() }
  }
  const body = await cached.promise

  return new NextResponse(JSON.stringify(body), {
    status: body.status === 'fail' ? 503 : 200,
    headers: { 'Content-Type': CONTENT_TYPE },
  })
}
