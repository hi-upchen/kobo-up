import React from 'react'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Button } from '@/components/button'

interface BooksHeaderProps {
  totalBooks: number
  onReUpload: () => void
}

export function BooksHeader({ totalBooks, onReUpload }: BooksHeaderProps) {
  return (
    <div className="sm:flex sm:items-center sm:justify-between">
      <div>
        <Heading level={1}>Your Kobo Library</Heading>
        <Text className="mt-2 text-gray-600">
          {totalBooks === 0 
            ? 'No books found' 
            : `${totalBooks} book${totalBooks === 1 ? '' : 's'} with notes and highlights`
          }
        </Text>
      </div>
      
      <div className="mt-4 sm:ml-4 sm:mt-0 sm:flex-none">
        <Button 
          color="indigo" 
          onClick={onReUpload}
          className="flex items-center space-x-2"
        >
          <svg 
            className="h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" 
            />
          </svg>
          <span>Re-upload Database</span>
        </Button>
      </div>
    </div>
  )
}