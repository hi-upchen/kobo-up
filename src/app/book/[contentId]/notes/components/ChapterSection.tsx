'use client'

import React, { useState, useEffect } from 'react'
import clsx from 'clsx'
import { Text } from '@/components/text'
import { DonationCard } from '@/components/DonationCard'
import { MarkupViewer } from '@/components/MarkupViewer'
import { getHighlightColorClasses } from '@/utils/koboColors'
import { getMarkupFilesByIds } from '@/services/markupService'
import type { MarkupFile } from '@/services/markupService'
import type { IBookChapter } from '@/types/kobo'

interface ChapterSectionProps {
  chapter: IBookChapter
  chapterIdx: number
  sponsorShouldBeShownOnChapterIdx: number | null
}

export function ChapterSection({ chapter, chapterIdx, sponsorShouldBeShownOnChapterIdx }: ChapterSectionProps) {
  const HeadingTag = `h${chapter.depth + 1}` as keyof JSX.IntrinsicElements

  // Check first note for color support (all notes have same schema)
  const hasColorSupport = chapter.notes?.[0]?.color !== undefined;

  const [markupData, setMarkupData] = useState<Map<string, MarkupFile>>(new Map())

  useEffect(() => {
    const markupIds = chapter.notes
      ?.filter(n => n.type === 'markup')
      .map(n => n.bookmarkId) ?? []

    if (markupIds.length === 0) return

    getMarkupFilesByIds(markupIds)
      .then(setMarkupData)
      .catch(err => console.warn('Failed to load markup files:', err))
  }, [chapter.notes])

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
          {chapter.notes.map((chapterNote, chapterNoteIdx) => {
            const hasColor = chapterNote.color !== undefined && chapterNote.color !== null;
            const colorClasses = hasColorSupport && hasColor ? getHighlightColorClasses(chapterNote.color) : null;
            const isMarkup = chapterNote.type === 'markup';
            const markup = isMarkup ? markupData.get(chapterNote.bookmarkId) : undefined;

            return (
              <li key={chapterNote.bookmarkId} className="relative flex gap-x-1">
                <div
                  className={clsx(
                    chapterNoteIdx === chapter.notes.length - 1 ? 'h-8' : '-bottom-8',
                    'absolute left-0 top-0 flex w-8 justify-center',
                  )}
                >
                  <div className={clsx(
                    'w-px',
                    hasColorSupport ? 'bg-gray-300 dark:bg-gray-600' : 'bg-lime-300 dark:bg-lime-600'
                  )} />
                </div>

                {isMarkup ? (
                  <>
                    <div className="relative flex h-8 w-8 flex-none items-center justify-center">
                      <div className="size-1.5 rounded-full ring-1 bg-indigo-400 dark:bg-indigo-600 ring-indigo-600 dark:ring-indigo-300" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Text className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                        </svg>
                        Handwriting
                      </Text>
                      {markup ? (
                        <MarkupViewer svgData={markup.svg} jpgData={markup.jpg} />
                      ) : (
                        <Text className="text-sm text-zinc-400 italic">Handwriting data not available</Text>
                      )}
                    </div>
                  </>
                ) : chapterNote.text ? (
                  <>
                    <div className="relative flex h-8 w-8 flex-none items-center justify-center">
                      <div className={clsx(
                        'size-1.5 rounded-full ring-1',
                        colorClasses
                          ? clsx(colorClasses.dotFill, colorClasses.ring)
                          : 'bg-lime-200 dark:bg-zinc-700 ring-lime-600 dark:ring-lime-300'
                      )} />
                    </div>

                    <div className='flex flex-col'>
                      <div className={clsx(
                        colorClasses
                          ? clsx('py-0.5 px-2 rounded', colorClasses.light, colorClasses.dark)
                          : 'py-0.5'
                      )}>
                        <Text>{chapterNote.text.trim()}</Text>
                      </div>

                      {chapterNote.annotation && (
                        <div className={clsx(
                          'rounded-md p-3 ring-1 ring-inset mt-2 rounded-tl-none',
                          colorClasses
                            ? colorClasses.ring
                            : 'ring-lime-600 dark:ring-lime-600 bg-lime-50 dark:bg-lime-950'
                        )}>
                          <Text>{chapterNote.annotation.trim()}</Text>
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {sponsorShouldBeShownOnChapterIdx === chapterIdx && (
        <DonationCard />
      )}
    </div>
  )
}
