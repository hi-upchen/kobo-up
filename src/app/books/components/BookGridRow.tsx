import React from 'react'
import Link from 'next/link'
import { Checkbox } from '@/components/checkbox'
import { Badge } from '@/components/badge'
import { Text, Strong } from '@/components/text'
import type { IBook } from '@/types/kobo'

interface BookGridRowProps {
  book: IBook
  isSelected: boolean
  onSelection: (checked: boolean) => void
  href: string
  formatDate: (date?: string) => string
}

export function BookGridRow({ 
  book, 
  isSelected, 
  onSelection, 
  href, 
  formatDate 
}: BookGridRowProps) {
  const handleCheckboxClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const handleCheckboxChange = (checked: boolean) => {
    onSelection(checked)
  }


  const hasContent = book.totalNotes > 0 || book.totalHighlights > 0
  const totalCount = book.totalNotes + book.totalHighlights
  
  const rowClassName = `
    grid 
    grid-cols-[auto_1fr_80px] 
    md:grid-cols-[auto_1fr_120px_80px] 
    lg:grid-cols-[auto_1fr_120px_120px_80px] 
    gap-4 
    items-center 
    p-2 
    md:p-4 
    border-b 
    border-gray-200 
    hover:bg-gray-50 
    cursor-pointer 
    transition-colors
    ${!hasContent ? "opacity-60" : ""}
  `.trim()

  return (
    <Link href={href} className={rowClassName}>
      {/* Checkbox */}
      <div className="flex items-center justify-center" onClick={handleCheckboxClick}>
        <Checkbox
          checked={isSelected}
          onChange={handleCheckboxChange}
          className="h-4 w-4"
        />
      </div>
      
      {/* Book Info - responsive stacking */}
      <div className="flex flex-col space-y-1 min-w-0">
        <Strong className={`text leading-tight ${hasContent ? 'text-gray-900' : 'text-gray-500'}`}>
          {book.title || 'Untitled'}
        </Strong>
        {book.subtitle && (
          <Text className="text-sm text-gray-500 leading-tight">
            {book.subtitle}
          </Text>
        )}
        {book.author && (
          <Text className="text-xs text-gray-600 lg:hidden line-clamp-2">
            {book.author}
          </Text>
        )}
      </div>
      
      {/* Author - hidden on medium and below */}
      <div className="hidden lg:block min-w-0">
        {book.author && (
          <Text className="text-sm text-gray-600 line-clamp-2">
            {book.author}
          </Text>
        )}
      </div>
      
      {/* Last Read - hidden on small */}
      <div className="hidden md:block">
        <Text className="text-sm text-gray-500 text-center">
          {book.lastRead ? formatDate(book.lastRead) : 'Never'}
        </Text>
      </div>
      
      {/* Highlights + Notes Count - always visible */}
      <div className="flex justify-center">
        {totalCount > 0 ? (
          <Badge color="blue" className="inline-flex items-center min-w-[40px] justify-center">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {totalCount}
          </Badge>
        ) : (
          <Text className="text-sm text-gray-400 text-center min-w-[40px]">0</Text>
        )}
      </div>
    </Link>
  )
}