'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { KoboService } from '@/services/koboService'
import { NavigationService } from '@/services/navigationService'
import { ErrorService } from '@/services/errorService'
import type { IBook } from '@/types/kobo'
import { BooksHeader } from './components/BooksHeader'
import { BooksList } from './components/BooksList'
import { ExportActionBar } from './components/ExportActionBar'
import { BookRowSkeleton } from './components/BookRowSkeleton'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { DonationCard } from '@/components/DonationCard'

export default function BooksPage() {
  const router = useRouter()
  const [books, setBooks] = useState<IBook[]>([])
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [donationShouldBeShownAfterBookIndex, setDonationShouldBeShownAfterBookIndex] = useState<number | null>(null)

  useEffect(() => {
    const initializePage = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check if database exists in IndexedDB
        const hasStoredData = await KoboService.hasStoredData()
        
        if (!hasStoredData) {
          // No database found, redirect to landing page
          NavigationService.navigateToLanding(router)
          return
        }

        // Initialize database from stored IndexedDB data
        await KoboService.initializeFromStoredData()
        
        // Load books
        const loadedBooks = await KoboService.loadBooksWithNotes()
        
        setBooks(loadedBooks)

      } catch (error) {
        const errorMessage = ErrorService.getErrorMessage(error as Error)
        setError(errorMessage)
        ErrorService.logError(error as Error)

      } finally {
        setIsLoading(false)
      }
    }

    initializePage()
  }, [router])

  // Calculate where donation should be shown: after 7th book with notes, or after last book with notes
  useEffect(() => {
    if (books.length === 0) {
      setDonationShouldBeShownAfterBookIndex(null)
      return
    }

    let booksWithNotesCount = 0
    let lastBookWithNotesIndex = -1
    
    for (let i = 0; i < books.length; i++) {
      const book = books[i]
      const hasNotes = (book.totalNotes + book.totalHighlights) > 0
      
      if (hasNotes) {
        booksWithNotesCount++
        lastBookWithNotesIndex = i
        
        // Show donation after 7th book with notes
        if (booksWithNotesCount === 7) {
          setDonationShouldBeShownAfterBookIndex(i)
          return
        }
      }
    }

    // If we have books with notes but fewer than 7, show after the last book with notes
    if (lastBookWithNotesIndex >= 0) {
      setDonationShouldBeShownAfterBookIndex(lastBookWithNotesIndex)
    } else {
      // No books with notes, don't show donation
      setDonationShouldBeShownAfterBookIndex(null)
    }
  }, [books])

  const handleBookSelection = (contentId: string, checked: boolean) => {
    setSelectedBooks(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(contentId)
      } else {
        next.delete(contentId)
      }
      return next
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select books with content (notes >= 1 or highlights >= 1)
      const booksWithContent = books.filter(book => 
        (book.totalNotes > 0) || (book.totalHighlights > 0)
      )
      setSelectedBooks(new Set(booksWithContent.map(book => book.contentId)))
    } else {
      setSelectedBooks(new Set())
    }
  }


  const handleReUpload = () => {
    // Navigate to landing page with reupload flag (don't clear data yet)
    NavigationService.navigateToLanding(router, { reupload: true })
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-8 w-48 bg-gray-200 dark:bg-zinc-600 rounded animate-pulse mb-4"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-zinc-600 rounded animate-pulse"></div>
          </div>
          
          {/* Books List Skeleton */}
          <BookRowSkeleton count={15} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md">
          <ErrorMessage 
            title="Failed to Load Books"
            message={error} 
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    )
  }

  if (books.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-7xl px-2 md:px-6 lg:px-8 py-12">
          <BooksHeader
            totalBooks={0}
            onReUpload={handleReUpload}
          />
          
          <div className="text-center py-24">
            <svg 
              className="mx-auto h-24 w-24 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1} 
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No books found</h3>
            <p className="mt-2 text-gray-500">
              Your Kobo database doesn&apos;t contain any books, or they couldn&apos;t be loaded.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isAllSelected = books.length > 0 && selectedBooks.size === books.length
  const isPartiallySelected = selectedBooks.size > 0 && !isAllSelected

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-2 md:px-6 lg:px-8 py-12">
        <BooksHeader
          totalBooks={books.length}
          onReUpload={handleReUpload}
        />

        <div className="mt-8">
          <ExportActionBar
            books={books}
            selectedBooks={selectedBooks}
            onSelectionChange={setSelectedBooks}
          />
        </div>

        <div className="mt-0">
          <BooksList
            books={books}
            selectedBooks={selectedBooks}
            isAllSelected={isAllSelected}
            isPartiallySelected={isPartiallySelected}
            onBookSelection={handleBookSelection}
            onSelectAll={handleSelectAll}
            donationShouldBeShownAfterBookIndex={donationShouldBeShownAfterBookIndex}
          />
        </div>
      </div>
    </div>
  )
}