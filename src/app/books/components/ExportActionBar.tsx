'use client'

import React, { useState, useEffect } from 'react'
import type { IBook } from '@/types/kobo'
import { ExportOptionsModal, type ExportFormat, type ExportStructure } from './ExportOptionsModal'
import { ExportService } from '@/services/exportService'

interface ExportActionBarProps {
  books: IBook[]
  selectedBooks: Set<string>
  onSelectionChange: (selectedBooks: Set<string>) => void
}

export function ExportActionBar({ 
  books, 
  selectedBooks, 
  onSelectionChange
}: ExportActionBarProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [exportMode, setExportMode] = useState<'all' | 'selected'>('all')

  // Books with content (notes or highlights)
  const booksWithContent = books.filter(book => 
    (book.totalNotes > 0) || (book.totalHighlights > 0)
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
        await ExportService.exportBooksAsCombinedFile(booksToExport, format, exportMode)
      }
    } catch (error) {
      console.error('Export failed:', error)
      // You could add error handling UI here if needed
    }

    setIsModalOpen(false)
  }

  const handleClearSelection = () => {
    onSelectionChange(new Set())
  }

  const selectedCount = selectedBooks.size

  return (
    <>
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
          <button 
            onClick={handleExportAll}
            className="px-3 py-1.5 text-xs border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-200 rounded hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors"
            disabled={booksWithContent.length === 0}
          >
            Export All
          </button>
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
          <button 
            onClick={handleExportSelected}
            className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
            disabled={selectedCount === 0}
          >
            Export
          </button>
        </div>
      </div>

      <ExportOptionsModal
        isOpen={isModalOpen}
        selectedCount={selectedBooks.size}
        totalBooks={booksWithContent.length}
        onConfirm={handleExportConfirm}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}