/**
 * Tests for the Notion retry/error-classification helpers. These back the
 * "recoverable error states" fixes in the Notion export flow: retrying
 * transient 429s server-side, and detecting expired/revoked tokens so the
 * caller can clear the session and prompt reconnect instead of a dead end.
 */
import { APIResponseError, APIErrorCode } from '@notionhq/client'
import { withNotionRateLimitRetry, isNotionAuthError } from '../retry'

/**
 * Builds a real `APIResponseError` instance (not a plain object) because
 * `APIResponseError.isAPIResponseError()` checks `instanceof`, matching how
 * the actual `@notionhq/client` SDK throws errors.
 */
function makeApiError(code: APIErrorCode, headers: Record<string, string> = {}) {
  return new APIResponseError({
    code,
    status: code === APIErrorCode.Unauthorized ? 401 : 429,
    message: `Notion API error: ${code}`,
    headers,
    rawBodyText: '',
    additional_data: undefined,
    request_id: undefined,
  })
}

describe('isNotionAuthError', () => {
  it('returns true for a Notion "unauthorized" API error', () => {
    expect(isNotionAuthError(makeApiError(APIErrorCode.Unauthorized))).toBe(true)
  })

  it('returns false for a Notion "rate_limited" API error', () => {
    expect(isNotionAuthError(makeApiError(APIErrorCode.RateLimited))).toBe(false)
  })

  it('returns false for a plain Error and for non-error values', () => {
    expect(isNotionAuthError(new Error('boom'))).toBe(false)
    expect(isNotionAuthError(null)).toBe(false)
    expect(isNotionAuthError(undefined)).toBe(false)
  })
})

describe('withNotionRateLimitRetry', () => {
  it('retries on 429 and returns the result once the call succeeds', async () => {
    let attempts = 0
    const fn = jest.fn(async () => {
      attempts++
      if (attempts < 3) {
        // Short retry-after so the test does not wait on real backoff timing.
        throw makeApiError(APIErrorCode.RateLimited, { 'retry-after': '0.01' })
      }
      return 'ok'
    })

    const result = await withNotionRateLimitRetry(fn)

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('gives up and throws the rate-limit error after exhausting retries', async () => {
    const fn = jest.fn(async () => {
      throw makeApiError(APIErrorCode.RateLimited, { 'retry-after': '0.01' })
    })

    await expect(withNotionRateLimitRetry(fn)).rejects.toThrow(/rate_limited/)
    // 1 initial attempt + 3 retries = 4 calls total.
    expect(fn).toHaveBeenCalledTimes(4)
  })

  it('does not retry non-rate-limit errors (e.g. expired token)', async () => {
    const fn = jest.fn(async () => {
      throw makeApiError(APIErrorCode.Unauthorized)
    })

    await expect(withNotionRateLimitRetry(fn)).rejects.toThrow(/unauthorized/)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
