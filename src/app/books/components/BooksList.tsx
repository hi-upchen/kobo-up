import React from 'react'
import { Checkbox } from '@/components/checkbox'
import { Text } from '@/components/text'
import type { IBook } from '@/types/kobo'
import { BookGridRow } from './BookGridRow'
import { DonationCard } from '@/components/DonationCard'

interface BooksListProps {
  books: IBook[]
  selectedBooks: Set<string>
  isAllSelected: boolean
  isPartiallySelected: boolean
  onBookSelection: (contentId: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  donationShouldBeShownAfterBookIndex?: number | null
}

export function BooksList({
  books,
  selectedBooks,
  isAllSelected,
  isPartiallySelected,
  onBookSelection,
  onSelectAll,
  donationShouldBeShownAfterBookIndex
}: BooksListProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return 'Never'
    }
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-b-lg bg-white dark:bg-zinc-900">
      {/* Header - Desktop */}
      <div className="hidden lg:grid lg:grid-cols-[auto_1fr_120px_120px_80px] gap-4 items-center p-2 md:p-4 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isAllSelected}
            indeterminate={isPartiallySelected}
            onChange={(checked) => onSelectAll(checked)}
            className="h-4 w-4"
          />
        </div>
        <div>
          <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Book
          </Text>
        </div>
        <div>
          <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Author
          </Text>
        </div>
        <div className="text-center">
          <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Last Read
          </Text>
        </div>
        <div className="text-center">
          <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Notes
          </Text>
        </div>
      </div>

      {/* Header - Medium */}
      <div className="hidden md:grid md:grid-cols-[auto_1fr_120px_80px] lg:hidden gap-4 items-center p-2 md:p-4 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isAllSelected}
            indeterminate={isPartiallySelected}
            onChange={(checked) => onSelectAll(checked)}
            className="h-4 w-4"
          />
        </div>
        <div>
          <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Book & Author
          </Text>
        </div>
        <div className="text-center">
          <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Last Read
          </Text>
        </div>
        <div className="text-center">
          <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Notes
          </Text>
        </div>
      </div>

      {/* Header - Small */}
      <div className="md:hidden grid grid-cols-[auto_1fr_80px] gap-4 items-center p-2 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isAllSelected}
            indeterminate={isPartiallySelected}
            onChange={(checked) => onSelectAll(checked)}
            className="h-4 w-4"
          />
        </div>
        <div>
          <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Book & Author
          </Text>
        </div>
        <div className="text-center">
          <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Notes
          </Text>
        </div>
      </div>
      
      {/* Book Rows */}
      <div>
        {books.map((book, index) => (
          <React.Fragment key={book.contentId}>
            <BookGridRow
              book={book}
              isSelected={selectedBooks.has(book.contentId)}
              onSelection={(checked) => onBookSelection(book.contentId, checked)}
              href={`/book/${encodeURIComponent(book.contentId)}/notes`}
              formatDate={formatDate}
            />
            {donationShouldBeShownAfterBookIndex === index && (
              <div className="px-2 md:px-4">
                <DonationCard />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {books.length === 0 && (
        <div className="text-center py-12">
          <Text className="text-gray-500">No books found in your library.</Text>
        </div>
      )}
    </div>
  )
}