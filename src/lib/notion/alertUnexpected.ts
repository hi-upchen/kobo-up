import { APIResponseError } from '@notionhq/client'
import { errorMessage, sendAlert } from '@/lib/alert'
import { isUserCausedNotionError } from '@/lib/notion/retry'

/**
 * Alerts the owner about a Notion failure, unless the user caused it.
 * The detail is the error message plus the Notion error code, when there is one.
 */
export async function alertUnexpectedNotionError(
  err: unknown,
  alert: { key: string; title: string; fix: string }
): Promise<void> {
  if (isUserCausedNotionError(err)) return
  const notionCode = APIResponseError.isAPIResponseError(err) ? ` (${err.code})` : ''
  await sendAlert({ ...alert, detail: `${errorMessage(err)}${notionCode}` })
}
