// The operations that can fail because the Kobo database layout changed.
// The server route accepts only these values.
export const LAYOUT_OPERATIONS = [
  'initialization',
  'loading',
  'book loading',
  'note loading',
  'highlight loading',
] as const

export type LayoutOperation = (typeof LAYOUT_OPERATIONS)[number]

// The browser families that getBrowser can return.
// The server route accepts only these values.
export const BROWSERS = ['Edge', 'Firefox', 'Chrome', 'Safari', 'other'] as const

// The longest error message the browser sends. The server route rejects longer ones.
export const MAX_MESSAGE_LENGTH = 200

// The operations already reported in this page load. A layout change breaks
// every query, so one report per operation is enough.
const reported = new Set<LayoutOperation>()

function getBrowser(userAgent: string): (typeof BROWSERS)[number] {
  if (/Edg\//.test(userAgent)) return 'Edge'
  if (/Firefox\//.test(userAgent)) return 'Firefox'
  if (/Chrome\//.test(userAgent)) return 'Chrome'
  if (/Safari\//.test(userAgent)) return 'Safari'
  return 'other'
}

// Tells the developer that reading the Kobo database failed on a missing table or column.
// It sends only the operation, a short error message and the browser family.
// It never sends file names or database content. It never throws.
// It sends each operation at most once per page load.
export function reportLayoutError(operation: LayoutOperation, message: string): void {
  try {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return
    if (reported.has(operation)) return
    reported.add(operation)
    const body = JSON.stringify({
      operation,
      message: message.slice(0, MAX_MESSAGE_LENGTH),
      browser: getBrowser(navigator.userAgent),
    })
    navigator.sendBeacon('/api/client-error', new Blob([body], { type: 'text/plain' }))
  } catch {
    // A failed report must never break the page.
  }
}
