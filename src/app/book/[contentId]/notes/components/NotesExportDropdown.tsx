import React from 'react'
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu, DropdownDescription, DropdownLabel } from '@/components/dropdown'
import type { IBook, IBookChapter } from '@/types/kobo'

interface NotesExportDropdownProps {
  book: IBook | null
  bookChapters: IBookChapter[] | null
  onExport: (book: IBook, chapters: IBookChapter[], format: 'markdown' | 'txt') => void
}

export function NotesExportDropdown({ book, bookChapters, onExport }: NotesExportDropdownProps) {
  const handleExport = (format: 'markdown' | 'txt') => {
    if (!book || !bookChapters) {
      console.error('Book data is not available')
      return
    }
    onExport(book, bookChapters, format)
  }

  return (
    <div className="ml-auto">
      <Dropdown>
        <DropdownButton outline aria-label="More options">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </DropdownButton>
        <DropdownMenu anchor="bottom end">
          <DropdownItem onClick={() => handleExport('markdown')}>
            <DropdownLabel>Download as Markdown Format</DropdownLabel>
            <DropdownDescription>Perfect for importing into Notion.</DropdownDescription>
          </DropdownItem>
          <DropdownItem onClick={() => handleExport('txt')}>
            <DropdownLabel>Download as TXT Format</DropdownLabel>
            <DropdownDescription>Plain text for quick review and sharing.</DropdownDescription>
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}