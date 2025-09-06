import React, { useState } from 'react'
import { Button } from '@/components/button'
import { ExportService } from '@/services/exportService'
import { ErrorService } from '@/services/errorService'
import type { IBook } from '@/types/kobo'
import { Text } from '@/components/text'
import { LoadingSpinner } from '@/components/LoadingSpinner'

interface ExportControlsProps {
  selectedCount: number
  totalCount: number
  selectedBooks: IBook[]
  allBooks: IBook[]
}

export function ExportControls({
  selectedCount,
  totalCount,
  selectedBooks,
  allBooks
}: ExportControlsProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExport = async (books: IBook[], format: 'markdown' | 'json' | 'text') => {
    if (books.length === 0) return

    setIsExporting(true)
    setExportError(null)

    try {
      switch (format) {
        case 'markdown':
          ExportService.exportBooksToMarkdown(books)
          break
        case 'json':
          ExportService.exportBooksToJson(books)
          break
        case 'text':
          ExportService.exportBooksToText(books)
          break
      }
    } catch (error) {
      const errorMessage = ErrorService.getErrorMessage(error as Error)
      setExportError(errorMessage)
      ErrorService.logError(error as Error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSelected = (format: 'markdown' | 'json' | 'text') => {
    handleExport(selectedBooks, format)
  }

  const handleExportAll = (format: 'markdown' | 'json' | 'text') => {
    handleExport(allBooks, format)
  }

  if (isExporting) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center">
          <LoadingSpinner message="Preparing export..." />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {exportError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <Text className="text-sm text-red-700">{exportError}</Text>
        </div>
      )}

      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <Text className="text-sm font-medium text-gray-900">
            Export Options
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            {selectedCount > 0 
              ? `${selectedCount} book${selectedCount === 1 ? '' : 's'} selected`
              : `${totalCount} book${totalCount === 1 ? '' : 's'} total`
            }
          </Text>
        </div>

        <div className="mt-4 sm:ml-4 sm:mt-0 sm:flex sm:space-x-3">
          {selectedCount > 0 ? (
            <>
              <Button
                color="indigo"
                onClick={() => handleExportSelected('markdown')}
                className="w-full sm:w-auto"
              >
                Export Selected (MD)
              </Button>
              <Button
                color="gray"
                onClick={() => handleExportSelected('json')}
                className="mt-2 sm:mt-0 w-full sm:w-auto"
              >
                Export Selected (JSON)
              </Button>
            </>
          ) : (
            <>
              <Button
                color="indigo"
                onClick={() => handleExportAll('markdown')}
                className="w-full sm:w-auto"
                disabled={totalCount === 0}
              >
                Export All (MD)
              </Button>
              <Button
                color="gray"
                onClick={() => handleExportAll('json')}
                className="mt-2 sm:mt-0 w-full sm:w-auto"
                disabled={totalCount === 0}
              >
                Export All (JSON)
              </Button>
              <Button
                color="gray"
                onClick={() => handleExportAll('text')}
                className="mt-2 sm:mt-0 w-full sm:w-auto"
                disabled={totalCount === 0}
              >
                Export All (TXT)
              </Button>
            </>
          )}
        </div>
      </div>

      {totalCount === 0 && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <Text className="text-sm text-gray-600 text-center">
            No books available to export
          </Text>
        </div>
      )}
    </div>
  )
}