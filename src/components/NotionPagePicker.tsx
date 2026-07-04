'use client'

/**
 * Reusable dialog for picking a single Notion page to act as the export
 * destination. Presentational only — the caller supplies the already-fetched
 * page list (via `fetchNotionPages()`) and handles what happens once a page
 * is chosen, so this same component can back both a single-book export flow
 * and a bulk/library-wide export flow.
 */
import React, { useState } from 'react'
import { Dialog, DialogTitle, DialogDescription, DialogBody } from '@/components/dialog'
import type { NotionPage } from '@/services/notionExportService'

interface NotionPagePickerProps {
  isOpen: boolean
  pages: NotionPage[]
  /** Shown under the title, e.g. "12 books will be exported as sub-pages under the page you choose." */
  description: string
  onSelect: (pageId: string) => void
  onCancel: () => void
}

/**
 * Renders a searchable list of the user's Notion pages and reports the
 * chosen page's ID via `onSelect`.
 */
export function NotionPagePicker({ isOpen, pages, description, onSelect, onCancel }: NotionPagePickerProps) {
  const [search, setSearch] = useState('')

  const filtered = search ? pages.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())) : pages

  const handleClose = () => {
    setSearch('')
    onCancel()
  }

  const handleSelect = (pageId: string) => {
    setSearch('')
    onSelect(pageId)
  }

  return (
    <Dialog size="sm" open={isOpen} onClose={handleClose}>
      <DialogTitle>Choose a Notion page</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
      <DialogBody>
        <input
          type="text"
          placeholder="Search pages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg bg-gray-100 dark:bg-zinc-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-zinc-500 mb-3"
          autoFocus
        />
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filtered.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => handleSelect(page.id)}
              className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-zinc-700 transition flex items-center gap-2"
            >
              <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span className="text-sm truncate text-gray-900 dark:text-white">{page.title}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-sm text-gray-500 dark:text-zinc-400 text-center py-4">No pages found</p>}
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="mt-4 w-full text-sm text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
        >
          Cancel
        </button>
      </DialogBody>
    </Dialog>
  )
}
