'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IBook,
  IBookHighlightNAnnotation,
  IBookChapter
} from "@/types/kobo";
import { KoboService } from '@/services/koboService';
import { exportBookToNotion, fetchNotionPages, NotionPage } from '@/services/notionExportService';

import { NotesHeader } from './components/NotesHeader'
import { NotesSection } from './components/NotesSection'
import { generateMarkdownContent, downloadMarkdownFile } from '@/utils/markdownGenerator'

interface Toast {
  type: 'loading' | 'success' | 'error'
  message: string
  notionUrl?: string
}

interface PagePickerState {
  pages: NotionPage[]
  book: IBook
  chapters: IBookChapter[]
}

function NotesPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  let { contentId } = params as { contentId: string };

  if (contentId) {
    contentId = decodeURIComponent(contentId).trim();
  }

  const [book, setBook] = useState<IBook | null>(null);
  const [notes, setNotes] = useState<IBookHighlightNAnnotation[] | null>(null);
  const [bookChapters, setBookChapters] = useState<IBookChapter[] | null>(null);

  const [sponsorShouldBeShwonOnChapterIdx, setSponsorShouldBeShwonOnChapterIdx] = useState<number|null>(null);

  const [isExportingNotion, setIsExportingNotion] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pagePicker, setPagePicker] = useState<PagePickerState | null>(null);
  const [pageSearch, setPageSearch] = useState('');

  const hasHandledRedirect = useRef(false);

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

  // Handle OAuth redirect query params
  useEffect(() => {
    if (hasHandledRedirect.current) return;

    const notionParam = searchParams.get('notion');
    if (!notionParam) return;

    if (notionParam === 'error') {
      hasHandledRedirect.current = true;
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete('notion');
      window.history.replaceState({}, '', url.toString());
      setToast({ type: 'error', message: 'Failed to connect to Notion. Please try again.' });
      return;
    }

    if (notionParam === 'connected') {
      // Wait until book data is loaded before triggering export
      if (!book || !bookChapters) return;

      hasHandledRedirect.current = true;
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete('notion');
      window.history.replaceState({}, '', url.toString());
      handleExportNotion(book, bookChapters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handleExportNotion excluded: it changes with isExportingNotion, but the ref guard prevents re-execution
  }, [searchParams, book, bookChapters]);

  const handleBack = () => {
    router.push('/books');
  };

  const handleExportMarkdown = (book: IBook, chapters: IBookChapter[]) => {
    const content = generateMarkdownContent(book, chapters);
    downloadMarkdownFile(`${book.bookTitle}.md`, content);
  };

  const handleExportNotion = useCallback(async (book: IBook, chapters: IBookChapter[]) => {
    if (isExportingNotion) return;

    setToast({ type: 'loading', message: 'Loading Notion pages...' });

    try {
      const pages = await fetchNotionPages();
      setToast(null);

      if (pages.length === 0) {
        setToast({ type: 'error', message: 'No Notion pages found. Please create a page in Notion first.' });
        return;
      }

      // Show page picker
      setPagePicker({ pages, book, chapters });
    } catch (error) {
      console.error('Notion pages error:', error);
      setToast({ type: 'error', message: 'Failed to load Notion pages.' });
    }
  }, [isExportingNotion]);

  const startNotionExport = useCallback(async (parentPageId: string) => {
    if (!pagePicker) return;
    const { book, chapters } = pagePicker;
    setPagePicker(null);

    setIsExportingNotion(true);
    setToast({ type: 'loading', message: 'Preparing export...' });

    try {
      const result = await exportBookToNotion(book, chapters, parentPageId, (stage, current, total) => {
        const count = total > 1 ? ` (${current}/${total})` : '';
        setToast({ type: 'loading', message: `${stage}${count}` });
      });

      if (result.success) {
        setToast({
          type: 'success',
          message: 'Exported to Notion successfully!',
          notionUrl: result.pageUrl,
        });
      } else {
        setToast({ type: 'error', message: result.error ?? 'Export to Notion failed.' });
      }
    } catch (error) {
      console.error('Notion export error:', error);
      setToast({ type: 'error', message: 'An unexpected error occurred during export.' });
    } finally {
      setIsExportingNotion(false);
    }
  }, [pagePicker]);

  const handleDisconnectNotion = () => {
    setToast({ type: 'success', message: 'Notion disconnected successfully.' });
  };

  const dismissToast = () => setToast(null);

  return (
    <div>
      <NotesHeader
        book={book}
        onBack={handleBack}
      />

      <NotesSection
        notes={notes}
        bookChapters={bookChapters}
        book={book}
        sponsorShouldBeShownOnChapterIdx={sponsorShouldBeShwonOnChapterIdx}
        onExportMarkdown={handleExportMarkdown}
        onExportNotion={handleExportNotion}
        onDisconnectNotion={handleDisconnectNotion}
      />

      {pagePicker && (() => {
        const filtered = pageSearch
          ? pagePicker.pages.filter(p => p.title.toLowerCase().includes(pageSearch.toLowerCase()))
          : pagePicker.pages;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-xl bg-white dark:bg-zinc-800 p-6 shadow-2xl text-zinc-900 dark:text-white">
              <h3 className="text-base font-semibold mb-1">Choose a Notion page</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">Your book will be exported as a sub-page under the selected page.</p>
              <input
                type="text"
                placeholder="Search pages..."
                value={pageSearch}
                onChange={(e) => setPageSearch(e.target.value)}
                className="w-full rounded-lg bg-zinc-100 dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 mb-3"
                autoFocus
              />
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filtered.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => { setPageSearch(''); startNotionExport(page.id); }}
                    className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition flex items-center gap-2"
                  >
                    <svg className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    <span className="text-sm truncate">{page.title}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-zinc-500 text-center py-4">No pages found</p>
                )}
              </div>
              <button
                onClick={() => { setPageSearch(''); setPagePicker(null); }}
                className="mt-4 w-full text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {toast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`mx-4 w-full max-w-sm rounded-xl p-6 shadow-2xl ${
            toast.type === 'success' ? 'bg-green-600 text-white' :
            toast.type === 'error' ? 'bg-red-600 text-white' :
            'bg-zinc-800 text-white'
          }`}>
            <div className="flex flex-col items-center text-center gap-3">
              {toast.type === 'loading' && (
                <svg className="h-8 w-8 animate-spin text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {toast.type === 'success' && (
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              )}
              <p className="text-sm font-medium">{toast.message}</p>
              {toast.type === 'success' && toast.notionUrl && (
                <a
                  href={toast.notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30 transition"
                >
                  Open in Notion
                </a>
              )}
              {toast.type !== 'loading' && (
                <button
                  onClick={dismissToast}
                  className="mt-1 text-sm text-white/70 hover:text-white transition"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense>
      <NotesPageContent />
    </Suspense>
  );
}
