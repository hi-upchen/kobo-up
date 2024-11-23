'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx'
import {
  connKoboDB,
  getHighlightNAnnotationList,
  getBook,
  getKoboDbFromLocal,
  IBook,
  IBookHighlightNAnnotation,
  getBookChapters,
  getChaptersWithNotes,
  IBookChapter
} from "@/models/KoboDB";

import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'

const NotesPage = () => {
  const params = useParams();
  let { contentId } = params as { contentId: string };

  if (contentId) {
    contentId = decodeURIComponent(contentId);
  }

  const [book, setBook] = useState<IBook | null>(null);
  const [notes, setNotes] = useState<IBookHighlightNAnnotation[] | null>(null);
  const [bookChapters, setBookChapters] = useState<IBookChapter[] | null>(null);

  useEffect(() => {
    const loadExistingDb = async () => {
      try {
        const dbFileHandle = await getKoboDbFromLocal();

        if (dbFileHandle) {
          const db = await connKoboDB(dbFileHandle);
          const theBook = await getBook(db, contentId);

          if (!theBook) {
            console.error('book not found');
            // TODO: redirect to home page
          } else {
            // console.log('book found', theBook);
          }
          setBook(theBook);

          // fetch notes
          const fetchedNotes = await getHighlightNAnnotationList(db, contentId);
          setNotes(fetchedNotes);

          // parse book chapters
          const bookChapterAndNotes = await getChaptersWithNotes(db, contentId);
          setBookChapters(bookChapterAndNotes);
        } else {
          console.error('existing dbFileHandle not found');
          // TODO: redirect to home page
        }
      } catch (error) {
        console.error('Error loading existing database:', error);
      }
    };

    loadExistingDb();
  }, [contentId]);

  return (
    <div>
      <Text onClick={() => window.history.back()} className="mb-4 flex items-center cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="size-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>

        Library
      </Text>

      <Heading className='text-center'>{book?.bookTitle}</Heading>
      <Subheading className='text-center mt-3 mb-12 text-zinc-500 dark:text-zinc-300'>{book?.author}</Subheading>

      {notes && bookChapters && notes.length > 0 &&
        <div className="mt-6">
          {bookChapters.map((chapter) => {
            const HeadingTag = `h${chapter.depth + 1}` as keyof JSX.IntrinsicElements;
            
            return (
              <div key={chapter.contentId} className='mb-6'>
                <HeadingTag
                  className={clsx(
                    chapter.depth === 1 ? 'text-xl mt-12' : '',
                    chapter.depth === 2 ? 'text-lg' : '',
                    chapter.depth === 3 ? 'text-base' : '',
                    chapter.depth >4 ? 'text-base' : '',
                    'text-zinc-500 dark:text-zinc-400'
                  )}
                  key={chapter.contentId}
                >
                    {chapter.title}
                </HeadingTag>

                {chapter.notes && chapter.notes.length > 0 && (
                  <ul role="list" className="space-y-7 mt-6">
                    {chapter.notes.map((chapterNote, chapterNoteIdx) => (
                      <li key={chapterNote.bookmarkId} className="relative flex gap-x-1">
                        <div
                          className={clsx(
                            chapterNoteIdx === chapter.notes.length - 1 ? 'h-7' : '-bottom-7',
                            'absolute left-0 top-0 flex w-7 justify-center',
                          )}
                        >
                          <div className="w-px bg-lime-300 dark:bg-lime-600" />
                        </div>

                        {chapterNote.text && (
                          <>
                            <div className="relative flex size-7 flex-none items-center justify-center bg-white dark:bg-zinc-900">
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
              </div>
            );
          })}
        </div>
      }

      {
        notes && notes.length === 0 &&
        <Text className='font-serif italic text-zinc-500 dark:text-zinc-300 text-center text-lg'>
          No notes yet! Dive deeper into the book to capture your thoughts.
        </Text>
      }
    </div >
  );
};

export default NotesPage;