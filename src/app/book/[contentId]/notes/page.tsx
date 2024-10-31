'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { findKoboDB, connKoboDB, getBookList, getHighlightNAnnotationList, checkIsKoboDB, getBook, getKoboDbFromLocal, IBook, IBookHighlightNAnnotation } from "@/models/KoboDB";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { Heading, Subheading } from '@/components/heading'
import { Strong, Text } from '@/components/text'

import { ExclamationTriangleIcon } from '@heroicons/react/20/solid'
import { div } from 'framer-motion/client';

const NotesPage = () => {
  const params = useParams();
  const { contentId } = params;
  const [notes, setNotes] = useState<IBookHighlightNAnnotation[] | null>(null);
  const [book, setBook] = useState<IBook | null>(null);

  useEffect(() => {
    const loadExistingDb = async () => {
      try {
        const dbFileHandle = await getKoboDbFromLocal();
        if (dbFileHandle) {
          const db = await connKoboDB(dbFileHandle);

          // check if the contentId is valid
          const theBook = await getBook(db, contentId);
          if (!theBook) {
            console.error('book not found');
            // TODO: redirect to home page
          }
          setBook(theBook);

          // fetch notes
          const start = performance.now();
          const fetchedNotes = await getHighlightNAnnotationList(db, contentId);
          const end = performance.now();
          console.log(`Function fetchedNotes execution time: ${(end - start) / 1000} seconds`);


          // sort by chapterProgress asc
          fetchedNotes.sort((a, b) => a.chapterProgress - b.chapterProgress);
          console.log('fetchedNotes', fetchedNotes);
          setNotes(fetchedNotes);
        } else {
          console.error('existing dbFileHandle not found');
          // TODO: redirect to home page
        }
      } catch (error) {
        console.error('Error loading existing database:', error);
      }
    };

    console.log('loadExistingDb, contentId:', contentId)
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
      {/* <Subheading className='text-center dark:text-gray-400 mt-1'>{book?.subtitle}</Subheading> */}
      <Subheading className='text-center mt-3  text-zinc-500 dark:text-zinc-300'>{book?.author}</Subheading>

      {notes &&
        <Table striped className="mt-6">
          {/* <TableHead className='sticky top-0'>
            <TableRow>
              <TableHeader>Annotation</TableHeader>
            </TableRow>
          </TableHead> */}
          <TableBody>
            {notes.map((aNote) => (
              <TableRow key={aNote.bookmarkId}>
                <TableCell className='text-wrap'>
                  <Text className='text-lg'>{aNote.text}</Text>
                  <Text className='text-sm'>{aNote.annotation}</Text>
                  <Text className='font-serif'><span className=' text-zinc-400'>(Location {(aNote.chapterProgress * 100).toFixed(1)}%)</span></Text>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }

      {notes && notes.length === 0 &&
        <Text className='font-serif italic text-zinc-500 dark:text-zinc-300 text-center text-lg'>
          No notes yet! Dive deeper into the book to capture your thoughts.
        </Text>
      }
    </div>
  );
};

export default NotesPage;