'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { findKoboDB, connKoboDB, getBookList, getHighlightNAnnotationList, checkIsKoboDB, saveKoboDbToLocal, getKoboDbFromLocal, getUserDetails, IBook } from "@/models/KoboDB";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'

import { Database } from 'sql.js';
import { HeroHeading, Heading, Subheading } from '@/components/heading'
import { Strong, Text } from '@/components/text'
import { Badge } from '@/components/badge'

import FAQ from '@/app/components/FAQ';
import Steps from '@/app/components/Steps';
import { pushToDataLayer } from '@/utils/gtm';
import { DonationCard } from '@/app/components/DonationCard'


const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const ChooseKoboSqlitePage = () => {
  const [bookList, setBookList] = useState<Array<IBook> | null>([]);
  const [isDirectoryPickerSupported, setIsDirectoryPickerSupported] = useState(true);

  useEffect(() => {
    setIsDirectoryPickerSupported('showDirectoryPicker' in window);
  }, []);

  // process book list
  const processBookList = async (db: Database) => {
    const bookList = await getBookList(db);

    const booksWithNotes = await Promise.all(bookList.map(async (book) => {
      const notes = await getHighlightNAnnotationList(db, book.contentId);
      return { ...book, notes };
    }));

    // Sort books by last read date in descending order
    booksWithNotes.sort((a, b) => {
      const dateA = a.lastRead ? new Date(a.lastRead) : new Date(0);
      const dateB = b.lastRead ? new Date(b.lastRead) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    return booksWithNotes;
  };

  useEffect(() => {
    const loadExistingDb = async () => {
      try {
        const dbFileHandle = await getKoboDbFromLocal();

        if (dbFileHandle) {
          const db = await connKoboDB(dbFileHandle);
          const booksWithNotes = await processBookList(db);

          setBookList(booksWithNotes);

          pushToDataLayer({
            event: 'load_existing_kobodb'
          });

          const koboUser = await getUserDetails(db);
          if (koboUser) {
            pushToDataLayer({
              event: 'identify_user',
              kobo_user_id: koboUser.userId,
            });
          }
        } else {
          setBookList(null); // no kobo database is found
        }
      } catch (error) {
        console.error('Error loading existing database:', error);
      }
    };

    loadExistingDb(); // for testing
    // setBookList(null); // no kobo database is found
  }, []);

  const handleClickChooseDir = async () => {
    try {
      const directoryHandle = await window.showDirectoryPicker();
      const dbFileHandle: FileSystemFileHandle | null = await findKoboDB(directoryHandle);
      const isNewDB = bookList === null

      pushToDataLayer({
        event: 'upload_kobodb'
      });

      if (!dbFileHandle) {
        throw new Error("Kobo database not found");
      }

      const db = await connKoboDB(dbFileHandle);
      const isKoboDB = await checkIsKoboDB(db);

      if (!isKoboDB) {
        throw new Error("Not a Kobo database");
      }

      await saveKoboDbToLocal(dbFileHandle);
      const booksWithNotes = await processBookList(db);

      setBookList(booksWithNotes);

      const koboUser = await getUserDetails(db);
      if (koboUser) {
        if (isNewDB) {
          pushToDataLayer({
            event: 'set_user_alias',
            kobo_user_id: koboUser.userId,
          });
        }

        pushToDataLayer({
          event: 'identify_user',
          kobo_user_id: koboUser.userId,
        });
      }
    } catch (error) {
      console.error('Error accessing directory:', error);
    }
  };

  return (

    <div>
      {(bookList === null) && (
        <div>
          <div className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <Subheading className="font-semibold tracking-tight text-gray-900  text-center">
                <span className='text-indigo-600'>KoboNoteUp</span>
              </Subheading>
              <HeroHeading className="text-4xl/tight sm:text-6xl/none mt-6 text-pretty  font-medium text-center ">
                Access Your Kobo Notes, Effortlessly
              </HeroHeading>
              <Text className="mt-6 text-pretty text-lg font-medium sm:text-xl/8  text-center">
                No coding. No hidden files. <br />Just select your Kobo disk to view your notes.
              </Text>
            </div>
          </div>

          <Steps />

          {isDirectoryPickerSupported && (
            <button
              type="button"
              className="relative block w-full rounded-lg border-2 border-dashed border-indigo-700 p-12 text-center hover:border-indigo-600 transition"
              onClick={handleClickChooseDir}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto h-12 w-12 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
              </svg>
              <Text className="mt-6 block text-sm font-semibold animate-bounce">Click here and Select your <Strong>Kobo Root folder</Strong></Text>
            </button>
          )}

          <FAQ />
        </div>
      )}

      {(bookList && bookList.length > 0) && (
        <div>
          <div className="flex items-center mb-8">
            <HeroHeading className='flex-1 text-6xl/tight mr-4'>Library</HeroHeading>

            <button
              type="button"
              className="relative block rounded-lg border-4 border-dashed border-gray-300 p-6 sm:p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={handleClickChooseDir}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto h-12 w-12 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
              </svg>

              <Text className="mt-2 hidden sm:block">Choose your kobo <span className='font-bold'>external disk</span> again to update</Text>
            </button>
          </div>

          {bookList && bookList.length > 0 && <>
            <Table striped className="">
              <TableHead className='sticky top-0'>
                <TableRow>
                  <TableHeader className=''>Book Title</TableHeader>
                  <TableHeader className='hidden lg:table-cell'>Author</TableHeader>
                  <TableHeader className='hidden sm:table-cell'>Last Read</TableHeader>
                  <TableHeader>Highlights</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>


                {/* Book List Rows */}
                {bookList.map((theBook, idx) => (
                  <React.Fragment key={theBook.contentId}>
                    <TableRow href={`/book/${encodeURIComponent(theBook.contentId)}/notes`} className='hover:bg-zinc-950/5 dark:hover:bg-white/5'>
                      <TableCell className="font-medium text-wrap ">
                        <Heading level={2} className='text-lg font-bold '>{theBook.bookTitle}</Heading>
                        {theBook.subtitle && <Text className='text-sm'>{theBook.subtitle}</Text>}
                        <Text className='lg:hidden text-sm'>{theBook.author}</Text>
                        <Text className='sm:hidden mt-2 text-sm'>{theBook.lastRead && formatDate(theBook.lastRead)}</Text>
                      </TableCell>
                      <TableCell className='max-w-64 text-wrap hidden lg:table-cell'>
                        <Text>{theBook.author}</Text>
                      </TableCell>
                      <TableCell className='hidden sm:table-cell'>
                        <Text>{theBook.lastRead && formatDate(theBook.lastRead)}</Text>
                      </TableCell>
                      <TableCell className='text-center'>
                        {!theBook.notes.length && '0'}
                        {!!theBook.notes.length && <Badge color="lime">{theBook.notes.length}</Badge>}
                      </TableCell>
                    </TableRow>
                    {idx === 5 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <DonationCard />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>

          </>}
        </div>
      )}
    </div>

  );
};

export default ChooseKoboSqlitePage;