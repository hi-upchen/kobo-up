'use client'

import React, { useState } from 'react'

interface DemoBannerProps {
  /** Navigates back to the landing page's upload flow, same handler the header's "Re-upload Database" button uses. */
  onReUpload: () => void
}

/**
 * Dismissible banner shown at the top of `/books` when the currently loaded
 * database is the sanitized sample library (see `KoboService.isDemoData`),
 * not a real uploaded Kobo database — so visitors who clicked "Try with a
 * sample library" on the landing page understand what they're looking at
 * and have an obvious path back to their own data.
 *
 * Dismissal is session-local (component state only); it reappears on the
 * next full page load for as long as the demo database stays loaded.
 */
export function DemoBanner({ onReUpload }: DemoBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  return (
    <div className="mb-6 flex items-start justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40">
      <p className="text-sm text-amber-800 dark:text-amber-200">
        You&apos;re browsing the sample library.{' '}
        <button
          type="button"
          onClick={onReUpload}
          className="font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
        >
          Connect your Kobo
        </button>{' '}
        to see your own books.
      </p>
      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300"
      >
        &#x2715;
      </button>
    </div>
  )
}
