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
  getChaptersWithNotes,
  IBookChapter
} from "@/models/KoboDB";

import { Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import { Divider } from '@/components/divider'
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu, DropdownDescription, DropdownLabel } from '@/components/dropdown'
import { DonationCard } from '@/app/components/DonationCard'
import { generateMarkdownContent, downloadFile, downloadMarkdownFile, downloadTxtFile } from '@/utils/markdownGenerator'



const NotesPage = () => {
  const params = useParams();
  let { contentId } = params as { contentId: string };

  if (contentId) {
    contentId = decodeURIComponent(contentId);
  }

  const [book, setBook] = useState<IBook | null>(null);
  const [notes, setNotes] = useState<IBookHighlightNAnnotation[] | null>(null);
  const [bookChapters, setBookChapters] = useState<IBookChapter[] | null>(null);

  const [sponsorShouldBeShwonOnChapterIdx, setSponsorShouldBeShwonOnChapterIdx] = useState<number|null>(null);

  useEffect(() => {
    const loadExistingDb = async () => {
      try {
        const dbFileHandle = await getKoboDbFromLocal();

        if (dbFileHandle) {
          const db = await connKoboDB(dbFileHandle);
          const theBook = await getBook(db, contentId);

          if (!theBook) {
            console.error('book not found');
            alert('Book not found. Redirecting back to home page in 3 seconds...');
            setTimeout(() => {
              window.location.href = '/';
            }, 3000);
            return;
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

  // calculate the chapter index where the sponsor should be shown, shown after X notes
  useEffect(() => {
    let noteDisplayedCount = 0;
    let chapterIdx = 0;
    for (chapterIdx = 0; chapterIdx < (bookChapters?.length || 0); chapterIdx++) {
      const chapter = bookChapters![chapterIdx];
      noteDisplayedCount += chapter.notes?.length || 0;
      if (noteDisplayedCount >= 10) {
        setSponsorShouldBeShwonOnChapterIdx(chapterIdx);
        break;
      }
    }

    // If no chapter met the threshold, use the last chapter index
    if (chapterIdx === bookChapters?.length) {
      setSponsorShouldBeShwonOnChapterIdx(bookChapters.length - 1);
    }
  }, [bookChapters]);

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

      {notes && bookChapters && notes.length > 0 && <>
        <div className="mt-6 flex items-center mb-2">
          <Text className='text-zinc-500 dark:text-zinc-400'>{notes.length} highlghts</Text>
          <div className="ml-auto">
            <Dropdown >
              <DropdownButton outline aria-label="More options">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </DropdownButton>
              <DropdownMenu anchor="bottom end">
                <DropdownItem onClick={() => {
                  if (!book) {
                    console.error('Book data is not available');
                    return;
                  };
                  const content = generateMarkdownContent(book, bookChapters);
                  downloadMarkdownFile(`${book?.bookTitle}.md`, content);
                }}>
                  <DropdownLabel>Download as Markdown Format</DropdownLabel>
                  <DropdownDescription>Perfect for importing into Notion.</DropdownDescription>
                </DropdownItem>
                <DropdownItem onClick={() => {
                  if (!book) {
                    console.error('Book data is not available');
                    return;
                  };
                  const content = generateMarkdownContent(book, bookChapters);
                  downloadTxtFile(`${book?.bookTitle}.txt`, content);
                }}>
                  <DropdownLabel>Download as TXT Format</DropdownLabel>
                  <DropdownDescription>Plain text for quick review and sharing.</DropdownDescription>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
        <Divider />
        <div className="">
          {bookChapters.map((chapter, chapterIdx) => {
            const HeadingTag = `h${chapter.depth + 1}` as keyof JSX.IntrinsicElements;

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

                {sponsorShouldBeShwonOnChapterIdx===chapterIdx && (
                  <DonationCard />
                )}
              </div>
            );
          })}
        </div>
      </>}

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