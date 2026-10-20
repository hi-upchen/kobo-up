export interface AlertInput {
  key: string
  title: string
  detail: string
  fix: string
  throttleMs?: number
}

const DEFAULT_THROTTLE_MS = 3_600_000
const SEND_TIMEOUT_MS = 3_000
const SECRET_ENV_NAMES = [
  'ALERT_TELEGRAM_BOT_TOKEN',
  'HEALTH_CHECK_KEY',
  'NOTION_CLIENT_SECRET',
  'NOTION_ENCRYPTION_SECRET',
  'MAILGUN_SENDING_API_KEY',
  'BLOB_READ_WRITE_TOKEN',
]

// Last send time per alert key. It lives in memory, so each server instance throttles on its own.
const lastSentAt = new Map<string, number>()

// Replaces the value of every configured secret with ***.
// Empty or unset values are skipped. Call it on any text that may reach a log or a response.
export function redactSecrets(text: string): string {
  let result = text
  for (const name of SECRET_ENV_NAMES) {
    const value = process.env[name]
    if (value) result = result.split(value).join('***')
  }
  return result
}

// Returns the message of an Error, or the string form of any other thrown value.
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

// Turns every run of whitespace into one space, so a value stays on one line.
function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

// Clears the throttle map so tests start clean.
export function resetAlertStateForTests(): void {
  lastSentAt.clear()
}

// Logs a failed send and frees the throttle slot for this key.
// The next call for the key can then try again at once.
function sendFailed(key: string, error: string): void {
  lastSentAt.delete(key)
  console.error(`[alert] send failed: ${redactSecrets(error)}`)
}

// Sends a plain-text Telegram message to the owner. It never throws.
// A broken alert path must not break the request that called it.
// The send gives up after 3 seconds, so a slow Telegram cannot hold a user up.
export async function sendAlert(input: AlertInput): Promise<void> {
  const throttleMs = input.throttleMs ?? DEFAULT_THROTTLE_MS
  const now = Date.now()
  const previous = lastSentAt.get(input.key)
  if (previous !== undefined && now - previous < throttleMs) return
  lastSentAt.set(input.key, now)

  const token = process.env.ALERT_TELEGRAM_BOT_TOKEN
  const chatId = process.env.ALERT_TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    sendFailed(input.key, 'ALERT_TELEGRAM_BOT_TOKEN or ALERT_TELEGRAM_CHAT_ID is not set')
    return
  }

  // The title and detail stay on one line each, so no caller can add extra lines.
  // The whole text is redacted, because callers may pass raw error messages.
  const text = redactSecrets(
    `【KoboUp】${oneLine(input.title)}\n${oneLine(input.detail)}\n修理：${input.fix}`
  )
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    })
    if (!response.ok) sendFailed(input.key, `Telegram answered HTTP ${response.status}`)
  } catch (error) {
    sendFailed(input.key, errorMessage(error))
  }
}
