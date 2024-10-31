'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter} from 'next/router';
import { findKoboDB, connKoboDB, getBookList, getHighlightNAnnotationList, checkIsKoboDB, saveKoboDbToLocal, getKoboDbFromLocal, IBook, resetKoboDbFromLocal } from "@/models/KoboDB";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'

import { SqlJsStatic } from 'sql.js';
import { HeroHeading, Heading, Subheading } from '@/components/heading'
import { Strong, Text } from '@/components/text'
import { Badge } from '@/components/badge'

import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid'

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
  const processBookList = async (db: SqlJsStatic.Database) => {
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
        const start = performance.now();
        const dbFileHandle = await getKoboDbFromLocal();
        const end = performance.now();
        // console.log(`Function getKoboDbFromLocal execution time: ${(end - start) / 1000} seconds`);
        
        if (dbFileHandle) {
          let start = performance.now();
          const db = await connKoboDB(dbFileHandle);
          let end = performance.now();
          // console.log(`Function connKoboDB execution time: ${(end - start) / 1000} seconds`);
          
          start = performance.now();
          const booksWithNotes = await processBookList(db);
          end = performance.now();
          // console.log(`Function booksWithNotes execution time: ${(end - start) / 1000} seconds`);

          setBookList(booksWithNotes);
        } else {
          setBookList(null); // no kobo database is found
        }
      } catch (error) {
        console.error('Error loading existing database:', error);
      }
    };

    const start = performance.now();
    loadExistingDb();
    const end = performance.now();
    console.log(`Function loadExistingDb execution time: ${(end - start) / 1000} seconds`);
  }, []);

  const handleClickChooseDir = async () => {
    try {
      const directoryHandle = await window.showDirectoryPicker();
      const dbFileHandle: FileSystemFileHandle | null = await findKoboDB(directoryHandle);

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
      console.log('booksWithNotes', booksWithNotes);
      setBookList(booksWithNotes);
    } catch (error) {
      console.error('Error accessing directory:', error);
    }
  };

  if (!isDirectoryPickerSupported) {
    return (
      <div>
        <HeroHeading className='text-center'>KoboUp Library</HeroHeading>
        <Text className="mt-6">
          <ExclamationTriangleIcon className="h-12 w-12 mx-auto" />
        </Text>
        <Text className='mt-4'>
          Please use <Strong>Chrome</Strong> or <Strong>Edge</Strong> browser as this page uses the File System Access API which is not supported in your current browser.
        </Text>
      </div>
    );
  }

  return (
    <div>
      {(bookList===null) && (
        <div>
          <HeroHeading className=''>Library</HeroHeading>

          <button
            type="button"
            className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={handleClickChooseDir}
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 48 48"
              aria-hidden="true"
              className="mx-auto h-12 w-12 text-gray-400"
            >
              <path
                d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8S8 28.418 8 24m32 10v6m0 0v6m0-6h6m-6 0h-6"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="mt-2 block text-sm font-semibold text-gray-900">Choose your kobo <span className='font-bold'>external disk</span> to get started</span>
          </button>
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

          {bookList && bookList.length > 0 &&
            <Table striped className="">
              <TableHead className='sticky top-0'>
                <TableRow>
                  <TableHeader>Book Title</TableHeader>
                  <TableHeader className='hidden lg:table-cell'>Author</TableHeader>
                  <TableHeader className='hidden sm:table-cell'>Last Read</TableHeader>
                  <TableHeader>Highlights</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookList.map((theBook) => (
                  <TableRow key={theBook.contentId}  href={`/book/${theBook.contentId}/notes`} className='hover:bg-zinc-950/5 dark:hover:bg-white/5'>
                    <TableCell className="font-medium text-wrap">
                      <Heading level={2} className='text-lg font-bold'>{theBook.bookTitle}</Heading>
                      {theBook.subtitle && <Text className='text-sm'>{theBook.subtitle}</Text>}

                      <Text className='lg:hidden'>{theBook.author}</Text>
                      <Text className='sm:hidden mt-2'>{theBook.lastRead && formatDate(theBook.lastRead)}</Text>
                    </TableCell>
                    <TableCell className='max-w-64 text-wrap hidden lg:table-cell'>
                        <Text>{theBook.author}</Text>
                    </TableCell>
                    <TableCell className='hidden sm:table-cell'>
                      <Text>{theBook.lastRead && formatDate(theBook.lastRead)}</Text>
                    </TableCell>
                    <TableCell className='text-center'>
                      {!theBook.notes.length && '0'}
                      {!!theBook.notes.length && <Badge color="lime">{theBook.notes.length}</Badge> }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>}
        </div>
      )}

      <Text>
        <button
          type="button"
          className=""
          onClick={() => {
            resetKoboDbFromLocal();
            setBookList(null);
          }}
        >
          <TrashIcon className="mr-2 h-6 w-6" aria-hidden="true" />
        </button>
      </Text>
    </div>
  );
};

export default ChooseKoboSqlitePage;