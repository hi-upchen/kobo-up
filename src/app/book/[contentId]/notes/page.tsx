'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IBook,
  IBookHighlightNAnnotation,
  IBookChapter
} from "@/models/KoboDB";
import { KoboService } from '@/services/koboService';

import { NotesHeader } from './components/NotesHeader'
import { NotesSection } from './components/NotesSection'
import { generateMarkdownContent, downloadMarkdownFile, downloadTxtFile } from '@/utils/markdownGenerator'

const NotesPage = () => {
  const params = useParams();
  const router = useRouter();
  let { contentId } = params as { contentId: string };

  if (contentId) {
    contentId = decodeURIComponent(contentId).trim();
  }

  const [book, setBook] = useState<IBook | null>(null);
  const [notes, setNotes] = useState<IBookHighlightNAnnotation[] | null>(null);
  const [bookChapters, setBookChapters] = useState<IBookChapter[] | null>(null);

  const [sponsorShouldBeShwonOnChapterIdx, setSponsorShouldBeShwonOnChapterIdx] = useState<number|null>(null);

  useEffect(() => {
    const loadBookData = async () => {
      try {
        // Check if database is initialized
        if (!KoboService.isDatabaseInitialized()) {
          // Try to initialize from stored IndexedDB data
          const hasStoredData = await KoboService.hasStoredData()
          
          if (hasStoredData) {
            console.log('Auto-initializing database from stored data...')
            await KoboService.initializeFromStoredData()
          } else {
            // No data found, redirect to landing page
            console.error('No database found')
            alert('No Kobo database found. Please upload a Kobo database first.')
            router.push('/')
            return
          }
        }

        // Load book details
        const theBook = await KoboService.loadBookDetails(contentId);

        if (!theBook) {
          alert('Book not found. Redirecting back to home page in 3 seconds...');
          setTimeout(() => {
            router.push('/books');
          }, 3000);
          return;
        }
        setBook(theBook);

        // Load book annotations (notes and highlights)
        const fetchedNotes = await KoboService.loadBookAnnotations(contentId);
        setNotes(fetchedNotes);

        // Load book chapters with notes
        const bookChapterAndNotes = await KoboService.loadBookChaptersWithNotes(contentId);
        setBookChapters(bookChapterAndNotes);
      } catch (error) {
        console.error('Error loading book data:', error);
        alert('Error loading book data. Please try again.');
      }
    };

    loadBookData();
  }, [contentId, router]);

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

  const handleBack = () => {
    window.history.back();
  };

  const handleExport = (book: IBook, chapters: IBookChapter[], format: 'markdown' | 'txt') => {
    const content = generateMarkdownContent(book, chapters);
    if (format === 'markdown') {
      downloadMarkdownFile(`${book.bookTitle}.md`, content);
    } else {
      downloadTxtFile(`${book.bookTitle}.txt`, content);
    }
  };

  return (
    <div>
      <NotesHeader 
        book={book} 
        notesCount={notes?.length || 0} 
        onBack={handleBack} 
      />

      <NotesSection 
        notes={notes}
        bookChapters={bookChapters}
        book={book}
        sponsorShouldBeShownOnChapterIdx={sponsorShouldBeShwonOnChapterIdx}
        onExport={handleExport}
      />
    </div>
  );
};

export default NotesPage;