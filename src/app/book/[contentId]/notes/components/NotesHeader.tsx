import React from 'react'
import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import type { IBook } from '@/types/kobo'

interface NotesHeaderProps {
  book: IBook | null
  onBack: () => void
}

export function NotesHeader({ book, onBack }: NotesHeaderProps) {
  return (
    <div>
      <Text onClick={onBack} className="mb-4 flex items-center cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="size-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Library
      </Text>

      <Heading className='text-center'>{book?.bookTitle}</Heading>
      <Subheading className='text-center mt-3 mb-12 text-zinc-500 dark:text-zinc-300'>{book?.author}</Subheading>
    </div>
  )
}