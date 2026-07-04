'use client'

/**
 * Drives a bulk "export the whole library (or a selection) to Notion" run
 * from the `/books` page. A fresh instance of this component is mounted by
 * `ExportActionBar` each time the user starts a bulk export, so there is no
 * `isOpen` prop to toggle — being mounted at all means the flow is active,
 * and unmounting (via `onClose`) discards all of its state.
 *
 * State machine: `checking_connection` -> `connect_prompt` (if not
 * connected) -> `loading_pages` -> `picking_page` -> `exporting` ->
 * `summary`, with an `error` state for anything that goes wrong before
 * export starts (e.g. no Notion pages exist yet).
 *
 * The actual per-book export loop lives in `runBulkNotionExport`
 * (`src/services/notionBulkExportService.ts`) — this component only wires
 * that loop's hooks to visible UI state and fires the funnel event.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { IBook } from '@/types/kobo'
import { KoboService } from '@/services/koboService'
import {
  checkNotionConnection,
  fetchNotionPages,
  NotionReauthRequiredError,
  type NotionPage,
} from '@/services/notionExportService'
import { runBulkNotionExport, type BulkExportSummary } from '@/services/notionBulkExportService'
import { pushToDataLayer } from '@/utils/gtm'
import { NotionPagePicker } from '@/components/NotionPagePicker'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '@/components/dialog'
import { BulkExportProgressList, type BulkExportBookStatus } from './BulkExportProgressList'
import { type BulkExportScope, persistPendingBulkSelection, redirectToNotionAuth } from './notionBulkExportSelection'

type Step =
  | { name: 'checking_connection' }
  | { name: 'connect_prompt' }
  | { name: 'loading_pages' }
  | { name: 'picking_page'; pages: NotionPage[] }
  | { name: 'exporting' }
  | { name: 'summary'; summary: BulkExportSummary }
  | { name: 'error'; message: string; canReconnect?: boolean }

export interface NotionBulkExportModalProps {
  /** Books to export, already filtered to the "all" or "selected" scope by the caller. */
  books: IBook[]
  /** Which selection mode launched this run — also the scope recorded on the `notion_export_complete` events it fires. */
  scope: BulkExportScope
  /** True when this instance was (re)mounted immediately after a successful Notion OAuth round trip — skips straight to loading pages instead of re-checking the connection. */
  resumedAfterConnect?: boolean
  /** Called when the user dismisses the modal (Cancel/Close, or after the summary is shown). */
  onClose: () => void
}

/** Small inline spinner reused across the modal's loading steps. */
function LoadingSpinner() {
  return (
    <svg className="h-6 w-6 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export function NotionBulkExportModal({ books, scope, resumedAfterConnect = false, onClose }: NotionBulkExportModalProps) {
  const [step, setStep] = useState<Step>({ name: 'checking_connection' })
  const [bookStatuses, setBookStatuses] = useState<BulkExportBookStatus[]>([])
  const [settledCount, setSettledCount] = useState(0)
  const [cancelRequested, setCancelRequested] = useState(false)
  const cancelRequestedRef = useRef(false)

  /**
   * Fetches the user's Notion pages and either shows the picker or an error
   * (no pages / expired connection). Shared by the normal connect-then-pick
   * path and the resumed-after-OAuth path.
   */
  const beginPagePicking = useCallback(async () => {
    setStep({ name: 'loading_pages' })
    try {
      const pages = await fetchNotionPages()
      if (pages.length === 0) {
        setStep({ name: 'error', message: 'No Notion pages found. Please create a page in Notion first.' })
        return
      }
      setStep({ name: 'picking_page', pages })
    } catch (error) {
      if (error instanceof NotionReauthRequiredError) {
        setStep({ name: 'error', message: 'Your Notion connection has expired.', canReconnect: true })
        return
      }
      setStep({ name: 'error', message: 'Failed to load Notion pages.' })
    }
  }, [])

  // Kicks off the flow once, when this instance is mounted.
  useEffect(() => {
    let ignore = false

    const start = async () => {
      if (resumedAfterConnect) {
        await beginPagePicking()
        return
      }
      try {
        const status = await checkNotionConnection()
        if (ignore) return
        if (status.connected) {
          await beginPagePicking()
        } else {
          setStep({ name: 'connect_prompt' })
        }
      } catch {
        if (!ignore) setStep({ name: 'connect_prompt' })
      }
    }

    start()
    return () => {
      ignore = true
    }
    // Intentionally runs once per mount: this component is remounted fresh
    // by ExportActionBar every time a bulk export session starts, so there
    // is no reactive prop here that should re-trigger the flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Persists the current selection and sends the browser through the Notion OAuth connect flow. */
  const handleConnect = () => {
    persistPendingBulkSelection(books.map((b) => b.contentId), scope)
    redirectToNotionAuth('/books')
  }

  /** Same as {@link handleConnect}, but only for the books that never got exported this run — used from the summary step's reconnect action. */
  const handleReconnectAndRetryRemaining = (summary: BulkExportSummary) => {
    const reauthOutcome = summary.outcomes.find((o) => o.errorCode === 'reauth_required')
    const retryContentIds = [...(reauthOutcome ? [reauthOutcome.contentId] : []), ...summary.skipped]
    persistPendingBulkSelection(retryContentIds, scope)
    redirectToNotionAuth('/books')
  }

  /**
   * Runs the bulk export against the chosen parent page, updating the
   * per-book status list as `runBulkNotionExport`'s hooks fire, and records
   * a `notion_export_complete` event for each book that succeeds — the same
   * event name/shape the single-book export flow already fires, just called
   * once per book here instead of once per manual export.
   *
   * @param parentPageId - Notion page ID every book will be created under.
   */
  const handleStartExport = useCallback(
    async (parentPageId: string) => {
      cancelRequestedRef.current = false
      setCancelRequested(false)
      setSettledCount(0)
      setBookStatuses(
        books.map((book) => ({
          contentId: book.contentId,
          bookTitle: book.bookTitle ?? book.title ?? 'Untitled',
          state: 'pending',
        }))
      )
      setStep({ name: 'exporting' })

      const summary = await runBulkNotionExport(books, parentPageId, () => cancelRequestedRef.current, {
        loadChapters: (contentId) => KoboService.loadBookChaptersWithNotes(contentId),
        onBookStart: (book) => {
          setBookStatuses((prev) =>
            prev.map((s) => (s.contentId === book.contentId ? { ...s, state: 'exporting' } : s))
          )
        },
        onBookProgress: (book, stage) => {
          setBookStatuses((prev) => (prev.map((s) => (s.contentId === book.contentId ? { ...s, stage } : s))))
        },
        onBookSettled: (outcome) => {
          setSettledCount((c) => c + 1)
          setBookStatuses((prev) =>
            prev.map((s) => (s.contentId === outcome.contentId ? { ...s, state: outcome.status, error: outcome.error } : s))
          )
          if (outcome.status === 'success') {
            pushToDataLayer({ event: 'notion_export_complete', format: 'notion', scope })
          }
        },
      })

      if (summary.skipped.length > 0) {
        setBookStatuses((prev) =>
          prev.map((s) => (summary.skipped.includes(s.contentId) ? { ...s, state: 'skipped' } : s))
        )
      }

      setStep({ name: 'summary', summary })
    },
    [books, scope]
  )

  const handleCancel = () => {
    cancelRequestedRef.current = true
    setCancelRequested(true)
  }

  /** Backdrop/Escape close is disabled mid-export — the user must use the explicit Cancel button so a half-finished run isn't silently abandoned. */
  const handleDialogClose = () => {
    if (step.name === 'exporting') return
    onClose()
  }

  if (step.name === 'picking_page') {
    return (
      <NotionPagePicker
        isOpen
        pages={step.pages}
        description={`${books.length} book${books.length !== 1 ? 's' : ''} will be exported as sub-pages under the page you choose.`}
        onSelect={handleStartExport}
        onCancel={onClose}
      />
    )
  }

  return (
    <Dialog size="sm" open onClose={handleDialogClose}>
      <DialogTitle>Export to Notion</DialogTitle>

      {step.name === 'checking_connection' && (
        <>
          <DialogDescription>Checking your Notion connection...</DialogDescription>
          <DialogBody className="flex justify-center py-4">
            <LoadingSpinner />
          </DialogBody>
        </>
      )}

      {step.name === 'connect_prompt' && (
        <>
          <DialogDescription>
            Connect your Notion workspace to export {books.length} book{books.length !== 1 ? 's' : ''}.
          </DialogDescription>
          <DialogActions>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-200 rounded hover:border-gray-400 dark:hover:border-zinc-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConnect}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
            >
              Connect to Notion
            </button>
          </DialogActions>
        </>
      )}

      {step.name === 'loading_pages' && (
        <>
          <DialogDescription>Loading your Notion pages...</DialogDescription>
          <DialogBody className="flex justify-center py-4">
            <LoadingSpinner />
          </DialogBody>
        </>
      )}

      {step.name === 'exporting' && (
        <>
          <DialogDescription>Please keep this tab open until the export finishes.</DialogDescription>
          <DialogBody>
            <BulkExportProgressList books={bookStatuses} settledCount={settledCount} total={books.length} />
          </DialogBody>
          <DialogActions>
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelRequested}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-200 rounded hover:border-gray-400 dark:hover:border-zinc-500 transition-colors disabled:opacity-50"
            >
              {cancelRequested ? 'Cancelling after current book...' : 'Cancel'}
            </button>
          </DialogActions>
        </>
      )}

      {step.name === 'summary' && (() => {
        const { summary } = step
        const successCount = summary.outcomes.filter((o) => o.status === 'success').length
        const failedOutcomes = summary.outcomes.filter((o) => o.status === 'failed')
        const skippedCount = summary.skipped.length

        return (
          <>
            <DialogDescription>
              {successCount} of {books.length} book{books.length !== 1 ? 's' : ''} exported successfully.
              {failedOutcomes.length > 0 && ` ${failedOutcomes.length} failed.`}
              {skippedCount > 0 && ` ${skippedCount} not attempted.`}
            </DialogDescription>
            <DialogBody>
              {summary.stopReason === 'reauth_required' && (
                <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
                  Your Notion connection expired partway through, so the remaining books were not attempted.
                  <button
                    type="button"
                    onClick={() => handleReconnectAndRetryRemaining(summary)}
                    className="mt-2 block font-medium underline hover:no-underline"
                  >
                    Reconnect to Notion and retry the rest
                  </button>
                </div>
              )}
              {failedOutcomes.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {failedOutcomes.map((outcome) => (
                    <li key={outcome.contentId} className="text-sm text-red-600 dark:text-red-400">
                      <span className="font-medium text-gray-900 dark:text-zinc-100">{outcome.bookTitle}</span>
                      {outcome.error ? `: ${outcome.error}` : ': Export failed.'}
                    </li>
                  ))}
                </ul>
              )}
            </DialogBody>
            <DialogActions>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </DialogActions>
          </>
        )
      })()}

      {step.name === 'error' && (
        <>
          <DialogDescription>{step.message}</DialogDescription>
          <DialogActions>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-200 rounded hover:border-gray-400 dark:hover:border-zinc-500 transition-colors"
            >
              Close
            </button>
            {step.canReconnect && (
              <button
                type="button"
                onClick={handleConnect}
                className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
              >
                Reconnect to Notion
              </button>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
