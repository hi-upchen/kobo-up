import {
  BlobAccessError,
  BlobRequestAbortedError,
  BlobServiceNotAvailable,
  BlobStoreSuspendedError,
  list,
} from '@vercel/blob'
import { errorMessage, redactSecrets } from '@/lib/alert'

export type CheckStatus = 'pass' | 'warn' | 'fail'

export interface CheckResult {
  status: CheckStatus
  output?: string
  fix?: string
}

const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token'
const DEFAULT_NOTION_REDIRECT_URI = 'https://kobo-up.runawayup.com/api/notion/callback'
// Every network check gives up after this long. A hang then warns or fails
// instead of holding the health report up.
const CHECK_TIMEOUT_MS = 6_000
// Notion rejects a code that is not shaped like a UUID before it checks the secret.
// A UUID-shaped fake code makes Notion check the secret, then reject the code.
const FAKE_AUTH_CODE = '00000000-0000-4000-8000-000000000000'

function errorText(err: unknown): string {
  return redactSecrets(errorMessage(err))
}

// Checks that every named environment variable is set.
// The output names the missing variables and never shows a value.
export function checkEnvSet(names: string[]): CheckResult {
  const missing = names.filter((name) => !process.env[name])
  if (missing.length === 0) return { status: 'pass' }
  return {
    status: 'fail',
    output: `${missing.join('、')} 未設定`,
    fix: '到 Vercel 專案的環境變數補上缺少的設定，然後重新部署',
  }
}

// Checks that the Notion client secret is still accepted.
// It sends a fake authorization code to the token endpoint with the real credentials.
// A rejected client means the secret is bad. Any other 4xx means only the fake code was refused.
// A 5xx or a network error is a Notion outage, so it only warns.
export async function checkNotionSecret(): Promise<CheckResult> {
  const settings = checkEnvSet(['NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET'])
  if (settings.status === 'fail') return settings
  const clientId = process.env.NOTION_CLIENT_ID
  const clientSecret = process.env.NOTION_CLIENT_SECRET

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const response = await fetch(NOTION_TOKEN_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: FAKE_AUTH_CODE,
        redirect_uri: process.env.NOTION_REDIRECT_URI ?? DEFAULT_NOTION_REDIRECT_URI,
      }),
    })
    if (response.status >= 500) {
      return {
        status: 'warn',
        output: `Notion 回應 HTTP ${response.status}`,
        fix: 'Notion 服務異常，稍後再試；持續失敗請查 Notion 狀態頁',
      }
    }
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    if (response.status === 401 || body.error === 'invalid_client') {
      return {
        status: 'fail',
        output: 'Notion 不接受目前的 client secret',
        fix: '到 Notion 的 integration 設定重發 client secret，並更新 Vercel 的 NOTION_CLIENT_SECRET',
      }
    }
    return { status: 'pass' }
  } catch (err) {
    return { status: 'warn', output: errorText(err), fix: '無法連到 Notion，稍後再試' }
  }
}

// Checks that the Vercel Blob token works, with a read-only list call.
// A suspended store or a rejected token fails. A Blob outage only warns.
// The Blob client retries outages up to 10 times, so a timer aborts the call.
// It must be a plain AbortController. The client stops retrying only on an AbortError.
export async function checkBlob(): Promise<CheckResult> {
  const settings = checkEnvSet(['BLOB_READ_WRITE_TOKEN'])
  if (settings.status === 'fail') return settings
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)
  try {
    await list({ limit: 1, abortSignal: controller.signal })
    return { status: 'pass' }
  } catch (err) {
    const output = errorText(err)
    if (err instanceof BlobServiceNotAvailable || err instanceof BlobRequestAbortedError) {
      return { status: 'warn', output, fix: 'Vercel Blob 服務異常，稍後再試' }
    }
    if (err instanceof BlobStoreSuspendedError) {
      return { status: 'fail', output, fix: '到 Vercel 的 Storage 頁面查看 Blob 為何被停用' }
    }
    if (err instanceof BlobAccessError) {
      return { status: 'fail', output, fix: '到 Vercel 的 Storage 頁面重發 Blob 讀寫 token，並更新環境變數' }
    }
    // Any other error is not a Blob error, so it is a network problem.
    return { status: 'warn', output, fix: '無法連到 Vercel Blob，稍後再試' }
  } finally {
    clearTimeout(timer)
  }
}

// Checks that the Telegram alert bot can reach its chat. It never sends a message.
// getChat needs a valid token and an existing chat, so one call covers both.
export async function checkAlertChannel(): Promise<CheckResult> {
  const settings = checkEnvSet(['ALERT_TELEGRAM_BOT_TOKEN', 'ALERT_TELEGRAM_CHAT_ID'])
  if (settings.status === 'fail') return settings
  const token = process.env.ALERT_TELEGRAM_BOT_TOKEN
  const chatId = process.env.ALERT_TELEGRAM_CHAT_ID ?? ''

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId)}`,
      { signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) },
    )
    const body = (await response.json()) as { ok?: boolean; description?: string }
    if (response.ok && body.ok) return { status: 'pass' }
    return {
      status: 'fail',
      output: redactSecrets(`getChat 失敗：${body.description ?? `HTTP ${response.status}`}`),
      fix: '檢查警報 bot token 與 chat id',
    }
  } catch (err) {
    return { status: 'fail', output: errorText(err) }
  }
}
