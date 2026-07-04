'use client'

/**
 * Renders per-book progress during a bulk Notion export run: an overall
 * "book N of M" line and a scrollable list showing each book's current
 * state (pending / exporting / success / failed / skipped). Purely
 * presentational — the bulk export modal owns all state transitions and
 * simply re-renders this list as `runBulkNotionExport`'s hooks fire.
 */
import React from 'react'

/** One row's worth of bulk-export UI state for a single book. */
export interface BulkExportBookStatus {
  contentId: string
  bookTitle: string
  state: 'pending' | 'exporting' | 'success' | 'failed' | 'skipped'
  /** Current export stage text (e.g. "Uploading images"), shown only while `state === 'exporting'`. */
  stage?: string
  /** Item index within the current stage (e.g. the 5th of 20 images), 1-based. Paired with `stageTotal` to render a "5/20" counter next to the stage text. */
  stageCurrent?: number
  /** Total item count for the current stage. Stages with a single logical step (e.g. "Sending to Notion...") report 1 here, which suppresses the counter since it would just say "0/1" or "1/1" for something that isn't really a countable list. */
  stageTotal?: number
  /** Failure reason, shown only when `state === 'failed'`. */
  error?: string
}

interface BulkExportProgressListProps {
  books: BulkExportBookStatus[]
  /** Count of books that have already settled (succeeded or failed), for the overall "N of M" line. */
  settledCount: number
  total: number
}

const STATE_ICON: Record<BulkExportBookStatus['state'], string> = {
  pending: '○', // ○
  exporting: '●', // ● (styled as a spinner via animate-pulse)
  success: '✓', // ✓
  failed: '✕', // ✕
  skipped: '–', // –
}

const STATE_COLOR: Record<BulkExportBookStatus['state'], string> = {
  pending: 'text-gray-300 dark:text-zinc-600',
  exporting: 'text-indigo-500 dark:text-indigo-400 animate-pulse',
  success: 'text-green-600 dark:text-green-400',
  failed: 'text-red-600 dark:text-red-400',
  skipped: 'text-gray-400 dark:text-zinc-500',
}

/**
 * Displays overall progress plus a per-book status list for an in-progress
 * or completed bulk Notion export.
 */
export function BulkExportProgressList({ books, settledCount, total }: BulkExportProgressListProps) {
  return (
    <div data-testid="bulk-export-progress-list">
      <div className="mb-3 text-sm text-gray-600 dark:text-zinc-300">
        Exporting book {Math.min(settledCount + 1, total)} of {total}
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-zinc-700 mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${total > 0 ? (settledCount / total) * 100 : 0}%` }}
          role="progressbar"
          aria-valuenow={settledCount}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
      <ul className="max-h-72 overflow-y-auto space-y-1">
        {books.map((book) => (
          <li key={book.contentId} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm">
            <span className={`w-4 shrink-0 text-center font-medium ${STATE_COLOR[book.state]}`} aria-hidden="true">
              {STATE_ICON[book.state]}
            </span>
            <span className="flex-1 truncate text-gray-900 dark:text-zinc-100">{book.bookTitle}</span>
            {book.state === 'exporting' && book.stage && (
              <span className="text-xs text-gray-400 dark:text-zinc-500 shrink-0">
                {book.stage}
                {book.stageTotal !== undefined && book.stageTotal > 1 && ` ${book.stageCurrent ?? 0}/${book.stageTotal}`}
              </span>
            )}
            {book.state === 'failed' && book.error && (
              <span className="text-xs text-red-500 dark:text-red-400 truncate max-w-[40%]" title={book.error}>
                {book.error}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
