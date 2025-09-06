import React from 'react'
import clsx from 'clsx'
import { Text } from '@/components/text'
import { DonationCard } from '@/components/DonationCard'
import type { IBookChapter } from '@/types/kobo'

interface ChapterSectionProps {
  chapter: IBookChapter
  chapterIdx: number
  sponsorShouldBeShownOnChapterIdx: number | null
}

export function ChapterSection({ chapter, chapterIdx, sponsorShouldBeShownOnChapterIdx }: ChapterSectionProps) {
  const HeadingTag = `h${chapter.depth + 1}` as keyof JSX.IntrinsicElements

  return (
    <div key={chapter.contentId} className='mb-6'>
      <HeadingTag
        className={clsx(
          chapter.depth === 1 ? 'text-xl mt-12' : '',
          chapter.depth === 2 ? 'text-lg' : '',
          chapter.depth === 3 ? 'text-base' : '',
          chapter.depth > 4 ? 'text-base' : '',
          'text-zinc-500 dark:text-zinc-400'
        )}
        key={chapter.contentId}
      >
        {chapter.title}
      </HeadingTag>

      {chapter.contentId === 'unmatched' && (
        <Text className="italic text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          (Notes that could not be matched to specific chapters)
        </Text>
      )}

      {chapter.notes && chapter.notes.length > 0 && (
        <ul role="list" className="space-y-3 mt-6">
          {chapter.notes.map((chapterNote, chapterNoteIdx) => (
            <li key={chapterNote.bookmarkId} className="relative flex gap-x-1">
              <div
                className={clsx(
                  chapterNoteIdx === chapter.notes.length - 1 ? 'h-8' : '-bottom-8',
                  'absolute left-0 top-0 flex w-8 justify-center',
                )}
              >
                <div className="w-px bg-lime-300 dark:bg-lime-600" />
              </div>

              {chapterNote.text && (
                <>
                  <div className="relative flex h-8 w-8 flex-none items-center justify-center">
                    <div className="size-1.5 rounded-full bg-lime-200 dark:bg-zinc-700 ring-1 ring-lime-600 dark:ring-lime-300" />
                  </div>

                  <div className='flex flex-col'>
                    <Text className="py-0.5">{chapterNote.text.trim()}</Text>

                    {chapterNote.annotation && (
                      <div className="rounded-md p-3 ring-1 ring-inset ring-lime-600 dark:ring-lime-600 bg-lime-50 dark:bg-lime-950 mt-2 rounded-tl-none">
                        <Text>{chapterNote.annotation.trim()}</Text>
                      </div>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {sponsorShouldBeShownOnChapterIdx === chapterIdx && (
        <DonationCard />
      )}
    </div>
  )
}