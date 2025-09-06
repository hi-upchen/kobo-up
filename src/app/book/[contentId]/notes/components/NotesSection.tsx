import React from 'react'
import { Text } from '@/components/text'
import { Divider } from '@/components/divider'
import { ChapterSection } from './ChapterSection'
import { NotesExportDropdown } from './NotesExportDropdown'
import type { IBook, IBookChapter, IBookHighlightNAnnotation } from '@/types/kobo'

interface NotesSectionProps {
  notes: IBookHighlightNAnnotation[] | null
  bookChapters: IBookChapter[] | null
  book: IBook | null
  sponsorShouldBeShownOnChapterIdx: number | null
  onExport: (book: IBook, chapters: IBookChapter[], format: 'markdown' | 'txt') => void
}

export function NotesSection({ 
  notes, 
  bookChapters, 
  book, 
  sponsorShouldBeShownOnChapterIdx, 
  onExport 
}: NotesSectionProps) {
  if (!notes || !bookChapters || notes.length === 0) {
    return (
      <Text className='font-serif italic text-zinc-500 dark:text-zinc-300 text-center text-lg'>
        No notes yet! Dive deeper into the book to capture your thoughts.
      </Text>
    )
  }

  return (
    <>
      <div className="mt-6 flex items-center mb-2">
        <NotesExportDropdown 
          book={book} 
          bookChapters={bookChapters} 
          onExport={onExport} 
        />
      </div>
      <Divider />
      <div className="">
        {bookChapters.map((chapter, chapterIdx) => (
          <ChapterSection
            key={chapter.contentId}
            chapter={chapter}
            chapterIdx={chapterIdx}
            sponsorShouldBeShownOnChapterIdx={sponsorShouldBeShownOnChapterIdx}
          />
        ))}
      </div>
    </>
  )
}