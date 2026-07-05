'use client'

import React, { useState, useEffect, Suspense } from 'react'
import type { IBook } from '@/types/kobo'
import { ExportOptionsModal, type ExportFormat, type ExportStructure } from './ExportOptionsModal'
import { ExportService } from '@/services/exportService'
import { pushToDataLayer } from '@/utils/gtm'
import { DonationCard } from '@/components/DonationCard'
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '@/components/dialog'
import { NotionBulkExportModal } from './NotionBulkExportModal'
import { NotionOAuthReturnHandler } from './NotionOAuthReturnHandler'
import type { BulkExportScope } from './notionBulkExportSelection'

interface ExportActionBarProps {
  books: IBook[]
  selectedBooks: Set<string>
  onSelectionChange: (selectedBooks: Set<string>) => void
}

/** An active (or resuming) bulk Notion export session; null when none is in progress. */
interface NotionModalState {
  books: IBook[]
  scope: BulkExportScope
  /** True when this session was opened by resuming right after a Notion OAuth redirect, rather than a fresh button click. */
  resumedAfterConnect: boolean
}

export function ExportActionBar({
  books,
  selectedBooks,
  onSelectionChange
}: ExportActionBarProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [exportMode, setExportMode] = useState<'all' | 'selected'>('all')
  const [notionModal, setNotionModal] = useState<NotionModalState | null>(null)
  const [oauthError, setOauthError] = useState(false)
  /** Number of books in the just-completed file export; non-null shows the success confirmation. */
  const [fileExportSuccessCount, setFileExportSuccessCount] = useState<number | null>(null)

  // Books with content (notes or highlights)
  const booksWithContent = books.filter(book =>
    ((book.totalNotes ?? 0) > 0) || ((book.totalHighlights ?? 0) > 0)
  )

  useEffect(() => {
    setIsSelectionMode(selectedBooks.size > 0)
  }, [selectedBooks.size])

  const handleExportAll = () => {
    setExportMode('all')
    setIsModalOpen(true)
  }

  const handleExportSelected = () => {
    setExportMode('selected')
    setIsModalOpen(true)
  }

  /**
   * Runs the confirmed multi-book export (all books or the current
   * selection) as either a ZIP of per-book files or one combined file, in
   * the chosen format (Markdown or plain text). On success, records an
   * `export_complete` funnel event with the resulting format, structure,
   * and scope so the export-to-donation conversion rate can be measured
   * downstream in GA4; failures (caught below) are not counted as
   * completions.
   *
   * On success, closes the options modal and opens a small success
   * confirmation (previously the flow closed silently, leaving no signal the
   * download had worked). That confirmation carries the delivered-value
   * donation ask, so the ask fires only after the file is actually in hand.
   *
   * @param format - Requested export format from the options modal (`'markdown'` or `'txt'`).
   * @param structure - Whether to export as a `'zip'` of separate files or a single `'combined'` file.
   */
  const handleExportConfirm = async (format: ExportFormat, structure: ExportStructure) => {
    const booksToExport = exportMode === 'all'
      ? booksWithContent
      : books.filter(book => selectedBooks.has(book.contentId))

    try {
      if (structure === 'zip') {
        // Export as ZIP archive with separate files
        await ExportService.exportBooksAsZip(booksToExport, format)
      } else {
        // Export as single combined file
        await ExportService.exportBooksAsCombinedFile(booksToExport, exportMode, format)
      }
      // Fire once the download has actually been generated, so failed
      // exports (caught below) are not counted as completions.
      pushToDataLayer({
        event: 'export_complete',
        format,
        structure,
        scope: exportMode === 'all' ? 'all_books' : 'selected_books',
      })
      setIsModalOpen(false)
      setFileExportSuccessCount(booksToExport.length)
    } catch (error) {
      console.error('Export failed:', error)
      // Leave the options modal open so the user can retry; no success
      // confirmation or completion event is emitted for a failed export.
    }
  }

  const handleClearSelection = () => {
    onSelectionChange(new Set())
  }

  /** Opens the bulk Notion export flow for every book with notes/highlights (the "export all" scope). */
  const handleExportNotionAll = () => {
    setOauthError(false)
    setNotionModal({ books: booksWithContent, scope: 'all_books', resumedAfterConnect: false })
  }

  /** Opens the bulk Notion export flow for the currently selected books. */
  const handleExportNotionSelected = () => {
    setOauthError(false)
    setNotionModal({
      books: books.filter(book => selectedBooks.has(book.contentId)),
      scope: 'selected_books',
      resumedAfterConnect: false,
    })
  }

  /**
   * Resumes a bulk Notion export session that was interrupted by the OAuth
   * connect round trip — reopens the modal directly (skipping the
   * connection check, since we just came back from a successful connect).
   */
  const handleResumeNotionExport = (resumedBooks: IBook[], resumedScope: BulkExportScope) => {
    setNotionModal({ books: resumedBooks, scope: resumedScope, resumedAfterConnect: true })
  }

  const selectedCount = selectedBooks.size

  return (
    <>
      {/* Detects the post-Notion-OAuth redirect back to this page and resumes
          any bulk export session that was in progress. Wrapped in its own
          Suspense boundary because `useSearchParams` requires one. */}
      <Suspense fallback={null}>
        <NotionOAuthReturnHandler
          books={books}
          onResume={handleResumeNotionExport}
          onError={() => setOauthError(true)}
        />
      </Suspense>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-t-lg overflow-hidden relative">
        {/* Default State */}
        <div
          className={`px-4 py-3 flex justify-between items-center transition-all duration-300 ${
            isSelectionMode ? 'transform -translate-y-full opacity-0' : 'transform translate-y-0 opacity-100'
          }`}
        >
          <div className="text-sm text-gray-600 dark:text-zinc-300">
            {books.length} books in your library, {booksWithContent.length} with notes
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportNotionAll}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-200 rounded hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors"
              disabled={booksWithContent.length === 0}
            >
              Export to Notion
            </button>
            <button
              onClick={handleExportAll}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-200 rounded hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors"
              disabled={booksWithContent.length === 0}
            >
              Export All
            </button>
          </div>
        </div>

        {/* Selection State */}
        <div
          className={`absolute inset-0 px-4 py-3 bg-blue-50 dark:bg-blue-950/50 flex justify-between items-center transition-all duration-300 ${
            isSelectionMode ? 'transform translate-y-0 opacity-100' : 'transform translate-y-full opacity-0'
          }`}
        >
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {selectedCount} book{selectedCount !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleClearSelection}
              className="text-xs text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-200"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportNotionSelected}
              className="px-3 py-1.5 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm rounded hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              disabled={selectedCount === 0}
            >
              Export to Notion
            </button>
            <button
              onClick={handleExportSelected}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
              disabled={selectedCount === 0}
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {oauthError && (
        <div className="mt-2 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300 flex justify-between items-center">
          Failed to connect to Notion. Please try again.
          <button onClick={() => setOauthError(false)} className="text-xs underline">Dismiss</button>
        </div>
      )}

      <ExportOptionsModal
        isOpen={isModalOpen}
        selectedCount={selectedBooks.size}
        totalBooks={booksWithContent.length}
        onConfirm={handleExportConfirm}
        onClose={() => setIsModalOpen(false)}
      />

      {notionModal && (
        <NotionBulkExportModal
          books={notionModal.books}
          scope={notionModal.scope}
          resumedAfterConnect={notionModal.resumedAfterConnect}
          onClose={() => setNotionModal(null)}
        />
      )}

      {fileExportSuccessCount !== null && (
        <Dialog size="sm" open onClose={() => setFileExportSuccessCount(null)}>
          <DialogTitle>Export complete</DialogTitle>
          <DialogDescription>
            Your export of {fileExportSuccessCount} book{fileExportSuccessCount !== 1 ? 's' : ''} has downloaded.
          </DialogDescription>
          <DialogBody>
            <DonationCard variant="compact" placement="donation_card_bulk_file_success" />
          </DialogBody>
          <DialogActions>
            <button
              type="button"
              onClick={() => setFileExportSuccessCount(null)}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
            >
              Close
            </button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}