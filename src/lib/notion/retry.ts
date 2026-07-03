/**
 * Shared retry helper for Notion API calls made from server routes. Large
 * book exports issue many sequential requests (page create + N block-append
 * batches), so a single transient 429 partway through used to fail the whole
 * export outright. This wraps an individual Notion SDK call and retries it
 * with backoff when — and only when — Notion responds with a rate-limit
 * error, honoring the `Retry-After` header it sends.
 */
import { APIResponseError, APIErrorCode } from '@notionhq/client'

const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 10_000

/**
 * Runs `fn`, retrying up to 3 times with exponential backoff if the call
 * fails with a Notion 429 (rate limited) response. Any other error is
 * re-thrown immediately without retrying.
 *
 * @param fn - Notion SDK call to run, e.g. `() => notion.pages.create(...)`.
 * @returns The resolved value of `fn` once it succeeds.
 * @throws The last error seen, if `fn` still fails after all retries or
 *   fails with a non-rate-limit error.
 */
export async function withNotionRateLimitRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const isRateLimited =
        APIResponseError.isAPIResponseError(err) && err.code === APIErrorCode.RateLimited
      if (!isRateLimited || attempt === MAX_RETRIES) throw err

      const retryAfterHeader =
        err.headers && typeof err.headers === 'object'
          ? (err.headers as Record<string, string>)['retry-after']
          : null
      const parsedRetryAfter = retryAfterHeader ? parseFloat(retryAfterHeader) : NaN
      const delayMs = Number.isFinite(parsedRetryAfter)
        ? Math.min(parsedRetryAfter * 1000, MAX_DELAY_MS)
        : Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS)

      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  // Unreachable: the loop always returns or throws, but TypeScript needs an
  // explicit exit path.
  throw new Error('withNotionRateLimitRetry: exhausted retries without resolving')
}

/**
 * Checks whether an error thrown by the Notion SDK indicates the stored
 * access token is invalid or has been revoked (Notion's `unauthorized`
 * error code). Used to distinguish "reconnect required" from any other
 * failure so routes can clear the stale session and the client can offer a
 * reconnect action instead of a dead-end error message.
 *
 * @param err - Value caught from a Notion SDK call.
 * @returns `true` if the error is a Notion 401 unauthorized response.
 */
export function isNotionAuthError(err: unknown): boolean {
  return APIResponseError.isAPIResponseError(err) && err.code === APIErrorCode.Unauthorized
}
