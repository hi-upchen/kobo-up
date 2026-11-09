import {
  PRO_LIMITS_START,
  FREE_BULK_EXPORT_LIMIT,
  proLimitsActive,
  canBulkExport,
  canExportHandwriting,
} from '../limits'

const START = new Date('2026-11-19T00:00:00+08:00').getTime()
const BEFORE = START - 1
const AFTER = START

describe('Pro limits start date', () => {
  it('starts at midnight on 2026-11-19 in Asia/Taipei', () => {
    expect(PRO_LIMITS_START.toISOString()).toBe('2026-11-18T16:00:00.000Z')
  })

  it('is off one millisecond before the start and on at the start', () => {
    expect(proLimitsActive(BEFORE)).toBe(false)
    expect(proLimitsActive(AFTER)).toBe(true)
  })

  it('accepts a Date', () => {
    expect(proLimitsActive(new Date(AFTER))).toBe(true)
  })
})

describe('bulk export limit', () => {
  it('allows any size before the start', () => {
    expect(canBulkExport(500, false, BEFORE)).toBe(true)
  })

  it('allows 10 books without a key after the start', () => {
    expect(FREE_BULK_EXPORT_LIMIT).toBe(10)
    expect(canBulkExport(10, false, AFTER)).toBe(true)
  })

  it('blocks 11 books without a key after the start', () => {
    expect(canBulkExport(11, false, AFTER)).toBe(false)
  })

  it('allows 11 books with a key after the start', () => {
    expect(canBulkExport(11, true, AFTER)).toBe(true)
    expect(canBulkExport(2000, true, AFTER)).toBe(true)
  })
})

describe('handwriting export', () => {
  it('is open before the start', () => {
    expect(canExportHandwriting(false, BEFORE)).toBe(true)
  })

  it('is blocked without a key after the start', () => {
    expect(canExportHandwriting(false, AFTER)).toBe(false)
  })

  it('is open with a key after the start', () => {
    expect(canExportHandwriting(true, AFTER)).toBe(true)
  })
})
