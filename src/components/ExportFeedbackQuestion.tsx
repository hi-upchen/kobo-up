'use client'

import { useEffect, useState } from 'react'
import { pushToDataLayer } from '@/utils/gtm'

export const EXPORT_FEEDBACK_STORAGE_KEY = 'kobo_export_feedback_shown'

export const EXPORT_FEEDBACK_ANSWERS = [
  { id: 'study_review', label: 'Study or review' },
  { id: 'write_blog', label: 'Write or blog' },
  { id: 'notes_app', label: 'Import to a notes app' },
  { id: 'backup', label: 'Back up' },
  { id: 'other', label: 'Other' },
] as const

/** Returns true when this browser has not seen the question. Storage errors count as seen. */
function neverShown(): boolean {
  try {
    return !window.localStorage.getItem(EXPORT_FEEDBACK_STORAGE_KEY)
  } catch {
    return false
  }
}

function markShown() {
  try {
    window.localStorage.setItem(EXPORT_FEEDBACK_STORAGE_KEY, '1')
  } catch {
    // Storage is blocked or full. The question stays hidden on the next visit only if storage works.
  }
}

/**
 * Asks one optional multiple-choice question after a finished export.
 * Picking an answer pushes one `export_feedback` event with a fixed answer id.
 * Dismissing pushes nothing. The question shows once per browser.
 * It has no free text and makes no network call of its own.
 */
export function ExportFeedbackQuestion() {
  const [visible, setVisible] = useState(neverShown)

  useEffect(() => {
    if (visible) markShown()
    // Record the first showing once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!visible) return null

  return (
    <div className="mt-3 rounded-lg border border-gray-200 dark:border-zinc-700 p-3 text-sm" role="group" aria-label="Quick question">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-zinc-800 dark:text-zinc-100">What will you do with these notes?</p>
        <button
          type="button"
          aria-label="Dismiss question"
          onClick={() => setVisible(false)}
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          ×
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {EXPORT_FEEDBACK_ANSWERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              pushToDataLayer({ event: 'export_feedback', answer: id })
              setVisible(false)
            }}
            className="rounded-full border border-gray-300 dark:border-zinc-600 px-3 py-1 text-zinc-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
