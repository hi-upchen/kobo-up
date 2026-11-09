/**
 * Free and Pro limits for Kobo Note Up, and the date they start.
 *
 * The limits are pure functions of the license state and the current time.
 * Tests inject the time, so no test needs to fake the clock.
 */

/** Pro limits start at this moment: 2026-11-19 00:00 in Asia/Taipei. */
export const PRO_LIMITS_START = new Date('2026-11-19T00:00:00+08:00')

/** Free users export up to this many books in one bulk export. */
export const FREE_BULK_EXPORT_LIMIT = 10

export type ProLimit = 'bulk' | 'handwriting'

/** True once the Pro limits are in force. */
export function proLimitsActive(now: number | Date = Date.now()): boolean {
  return new Date(now).getTime() >= PRO_LIMITS_START.getTime()
}

/** True when a bulk export of this many books may run. */
export function canBulkExport(
  bookCount: number,
  hasProLicense: boolean,
  now: number | Date = Date.now()
): boolean {
  if (hasProLicense || !proLimitsActive(now)) return true
  return bookCount <= FREE_BULK_EXPORT_LIMIT
}

/** True when handwritten annotations may be exported. */
export function canExportHandwriting(
  hasProLicense: boolean,
  now: number | Date = Date.now()
): boolean {
  return hasProLicense || !proLimitsActive(now)
}
