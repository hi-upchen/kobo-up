'use client';

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { findKoboDB, connKoboDB, getBookList, getHighlightNAnnotationList, checkIsKoboDB, saveKoboDbToLocal, getKoboDbFromLocal, getUserDetails, IBook } from "@/models/KoboDB";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { Checkbox } from '@/components/checkbox'

import { Database } from 'sql.js';
import { HeroHeading, Heading, Subheading } from '@/components/heading'
import { Strong, Text } from '@/components/text'
import { Badge } from '@/components/badge'

import FAQ from '@/app/components/FAQ';
import Steps from '@/app/components/Steps';
import { pushToDataLayer } from '@/utils/gtm';
import { DonationCard } from '@/app/components/DonationCard'
import { ActionBar, ExportModal, ExportFormat, ExportStructure } from '@/app/components/ExportFeature'
import { exportBooks } from '@/utils/exportUtils'


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
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'all' | 'selected'>('all');
  const [db, setDb] = useState<Database | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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
          const database = await connKoboDB(dbFileHandle);
          const booksWithNotes = await processBookList(database);

          setBookList(booksWithNotes);
          setDb(database);

          pushToDataLayer({
            event: 'load_existing_kobodb'
          });

          const koboUser = await getUserDetails(database);
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

      const database = await connKoboDB(dbFileHandle);
      const isKoboDB = await checkIsKoboDB(database);

      if (!isKoboDB) {
        throw new Error("Not a Kobo database");
      }

      await saveKoboDbToLocal(dbFileHandle);
      const booksWithNotes = await processBookList(database);

      setBookList(booksWithNotes);
      setDb(database);

      const koboUser = await getUserDetails(database);
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

  const handleToggleSelect = useCallback((contentId: string) => {
    setSelectedBooks(prev => {
      const next = new Set(prev);
      if (next.has(contentId)) {
        next.delete(contentId);
      } else {
        next.add(contentId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!bookList) return;
    
    if (selectedBooks.size === bookList.length) {
      setSelectedBooks(new Set());
    } else {
      setSelectedBooks(new Set(bookList.map(book => book.contentId)));
    }
  }, [bookList, selectedBooks.size]);

  const handleClearSelection = useCallback(() => {
    setSelectedBooks(new Set());
  }, []);

  const handleExportAll = useCallback(() => {
    setExportMode('all');
    setIsExportModalOpen(true);
  }, []);

  const handleExportSelected = useCallback(() => {
    setExportMode('selected');
    setIsExportModalOpen(true);
  }, []);

  const handleExportConfirm = useCallback(async (format: ExportFormat, structure: ExportStructure) => {
    if (!db) return;
    
    setIsExporting(true);
    setIsExportModalOpen(false);
    
    try {
      const options = {
        format,
        structure,
        bookIds: exportMode === 'selected' ? Array.from(selectedBooks) : undefined
      };
      
      await exportBooks(db, options);
      
      pushToDataLayer({
        event: 'export_books',
        export_format: format,
        export_structure: structure,
        export_count: exportMode === 'selected' ? selectedBooks.size : bookList?.length || 0
      });
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [db, exportMode, selectedBooks, bookList]);

  const actionBarState = selectedBooks.size > 0 ? 'selection' : 'default';
  const isAllSelected = bookList ? selectedBooks.size === bookList.length : false;
  const isPartiallySelected = selectedBooks.size > 0 && !isAllSelected;

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

          {bookList && bookList.length > 0 && (
            <div className="border-t border-b border-gray-200 rounded-t-lg rounded-b-lg overflow-hidden">
              <ActionBar
                selectedCount={selectedBooks.size}
                totalBooks={bookList?.length || 0}
                actionBarState={actionBarState}
                onExportAll={handleExportAll}
                onExportSelected={handleExportSelected}
                onClearSelection={handleClearSelection}
              />
              
              <div className="overflow-x-auto">
                <Table className="border-0">
                  <TableHead className='sticky top-0 z-10 bg-gray-100'>
                <TableRow className='h-[60px]'>
                  <TableHeader className='text-center'>
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isPartiallySelected}
                      onChange={handleSelectAll}
                    />
                  </TableHeader>
                  <TableHeader className='py-3'>Book Title</TableHeader>
                  <TableHeader className='hidden lg:table-cell py-3'>Author</TableHeader>
                  <TableHeader className='hidden sm:table-cell py-3'>Last Read</TableHeader>
                  <TableHeader className='py-3'>Highlights</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>


                {/* Book List Rows */}
                {bookList.map((theBook, idx) => {
                  const isSelected = selectedBooks.has(theBook.contentId);
                  return (
                  <React.Fragment key={theBook.contentId}>
                    <TableRow 
                      className=""
                    >
                      <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleSelect(theBook.contentId)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-wrap cursor-pointer" onClick={() => window.location.href = `/book/${encodeURIComponent(theBook.contentId)}/notes`}>
                        <Heading level={2} className='text-lg font-bold '>{theBook.bookTitle}</Heading>
                        {theBook.subtitle && <Text className='text-sm'>{theBook.subtitle}</Text>}
                        <Text className='lg:hidden text-sm'>{theBook.author}</Text>
                        <Text className='sm:hidden mt-2 text-sm'>{theBook.lastRead && formatDate(theBook.lastRead)}</Text>
                      </TableCell>
                      <TableCell className='max-w-64 text-wrap hidden lg:table-cell cursor-pointer' onClick={() => window.location.href = `/book/${encodeURIComponent(theBook.contentId)}/notes`}>
                        <Text>{theBook.author}</Text>
                      </TableCell>
                      <TableCell className='hidden sm:table-cell cursor-pointer' onClick={() => window.location.href = `/book/${encodeURIComponent(theBook.contentId)}/notes`}>
                        <Text>{theBook.lastRead && formatDate(theBook.lastRead)}</Text>
                      </TableCell>
                      <TableCell className='text-center cursor-pointer' onClick={() => window.location.href = `/book/${encodeURIComponent(theBook.contentId)}/notes`}>
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
                )})}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          
          <ExportModal
            isOpen={isExportModalOpen}
            mode={exportMode}
            selectedCount={selectedBooks.size}
            totalBooks={bookList?.length || 0}
            onConfirm={handleExportConfirm}
            onClose={() => setIsExportModalOpen(false)}
          />
        </div>
      )}
    </div>

  );
};

export default ChooseKoboSqlitePage;