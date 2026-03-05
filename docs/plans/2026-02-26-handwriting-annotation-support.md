# Handwriting Annotation Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Display handwriting (markup) annotations from newer Kobo e-readers alongside existing text highlights in the notes view.

**Architecture:** Extend the directory picker to also collect SVG/JPG markup files from the `.kobo/markups/` folder. Store them in IndexedDB alongside the database. Update the SQL query to include `Type='markup'` bookmarks. Render markup annotations as SVG-over-JPG overlays interleaved with text highlights.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, SQL.js, IndexedDB, native SVG/img rendering

---

### Task 1: Create Markup Storage Service

**Files:**
- Create: `src/services/markupService.ts`

**Step 1: Create the markupService.ts file**

This service handles IndexedDB CRUD for markup SVG and JPG files. It uses its own IndexedDB database (`KoboMarkups`) separate from the main database store.

```typescript
// src/services/markupService.ts

const MARKUP_DB_NAME = 'KoboMarkups';
const MARKUP_DB_VERSION = 1;
const MARKUP_STORE_NAME = 'markups';

export interface MarkupFile {
  bookmarkId: string;
  svg: ArrayBuffer;
  jpg: ArrayBuffer;
}

function openMarkupDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MARKUP_DB_NAME, MARKUP_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MARKUP_STORE_NAME)) {
        db.createObjectStore(MARKUP_STORE_NAME, { keyPath: 'bookmarkId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to open markup IndexedDB'));
  });
}

export async function saveMarkupFiles(files: MarkupFile[]): Promise<void> {
  const db = await openMarkupDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MARKUP_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(MARKUP_STORE_NAME);

    for (const file of files) {
      store.put(file);
    }

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(new Error('Failed to save markup files'));
    };
  });
}

export async function getMarkupFile(bookmarkId: string): Promise<MarkupFile | null> {
  const db = await openMarkupDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MARKUP_STORE_NAME, 'readonly');
    const store = transaction.objectStore(MARKUP_STORE_NAME);
    const request = store.get(bookmarkId);

    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      db.close();
      reject(new Error('Failed to get markup file'));
    };
  });
}

export async function getMarkupFilesByIds(bookmarkIds: string[]): Promise<Map<string, MarkupFile>> {
  const db = await openMarkupDB();
  const results = new Map<string, MarkupFile>();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MARKUP_STORE_NAME, 'readonly');
    const store = transaction.objectStore(MARKUP_STORE_NAME);

    let completed = 0;
    for (const id of bookmarkIds) {
      const request = store.get(id);
      request.onsuccess = () => {
        if (request.result) {
          results.set(id, request.result);
        }
        completed++;
        if (completed === bookmarkIds.length) {
          db.close();
          resolve(results);
        }
      };
      request.onerror = () => {
        completed++;
        if (completed === bookmarkIds.length) {
          db.close();
          resolve(results);
        }
      };
    }

    if (bookmarkIds.length === 0) {
      db.close();
      resolve(results);
    }
  });
}

export async function clearMarkupFiles(): Promise<void> {
  const db = await openMarkupDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MARKUP_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(MARKUP_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(new Error('Failed to clear markup files'));
    };
  });
}

export async function hasMarkupFiles(): Promise<boolean> {
  const db = await openMarkupDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MARKUP_STORE_NAME, 'readonly');
    const store = transaction.objectStore(MARKUP_STORE_NAME);
    const request = store.count();

    request.onsuccess = () => {
      db.close();
      resolve(request.result > 0);
    };
    request.onerror = () => {
      db.close();
      resolve(false);
    };
  });
}
```

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit src/services/markupService.ts 2>&1 || true`

Then run: `npm run typecheck`

Expected: No TypeScript errors related to markupService.ts

**Step 3: Commit**

```bash
git add src/services/markupService.ts
git commit -m "feat: add markup storage service for handwriting annotations"
```

---

### Task 2: Update Types to Support Markup Annotations

**Files:**
- Modify: `src/types/kobo.ts`

**Step 1: Add `isMarkup` computed flag to IBookHighlightNAnnotation**

The existing `type` field already captures `'markup'` vs `'highlight'` from the database. We don't need a new field — we just need to know it can be `'markup'`. No type changes needed since `type: string` already covers it.

Actually, we do NOT need to change the interface. The `type` field is already `string` and will contain `'markup'` for handwriting entries. The `text` field is already `string` (can be empty). No type changes needed.

**This task is a no-op.** Skip to Task 3.

---

### Task 3: Update SQL Query to Include Markup Bookmarks

**Files:**
- Modify: `src/models/KoboDB.ts:223-247` (the `getHighlightNAnnotationList` function)

**Step 1: Update the WHERE clause**

Change the SQL query in `getHighlightNAnnotationList` to include markup-type bookmarks. The current filter is `T.Text != ''` which excludes markups (they have empty Text). Change it to `(T.Text != '' OR T.Type = 'markup')`.

In `src/models/KoboDB.ts`, find the `getHighlightNAnnotationList` function and change line 241:

```
// OLD:
WHERE B.ContentID = T.VolumeID AND T.Text != '' AND T.Hidden = 'false' AND B.ContentID = ?

// NEW:
WHERE B.ContentID = T.VolumeID AND (T.Text != '' OR T.Type = 'markup') AND T.Hidden = 'false' AND B.ContentID = ?
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`

Expected: PASS, no errors

**Step 3: Commit**

```bash
git add src/models/KoboDB.ts
git commit -m "feat: include markup bookmarks in highlight query"
```

---

### Task 4: Extend Directory Picker to Collect Markup Files

**Files:**
- Modify: `src/app/(landing)/page.tsx:62-93` (the `handleDirectorySelect` function)
- Modify: `src/app/(landing)/page.tsx:495-541` (the `findKoboDBInDirectory` helper)

**Step 1: Create a helper function to find and read markup files**

Add this function after the existing `findKoboDBInDirectory` function at the bottom of `src/app/(landing)/page.tsx`:

```typescript
// Helper function to find and read markup files from the .kobo/markups/ directory
async function findMarkupFiles(
  directoryHandle: FileSystemDirectoryHandle
): Promise<{ bookmarkId: string; svg: ArrayBuffer; jpg: ArrayBuffer }[]> {
  const markupFiles: { bookmarkId: string; svg: ArrayBuffer; jpg: ArrayBuffer }[] = [];

  // Try to find the markups directory (could be in .kobo/markups/ or _kobo/markups/)
  const koboFolderNames = ['.kobo', '_kobo'];
  let markupsDir: FileSystemDirectoryHandle | null = null;

  for (const koboName of koboFolderNames) {
    try {
      const koboDir = await directoryHandle.getDirectoryHandle(koboName);
      markupsDir = await koboDir.getDirectoryHandle('markups');
      break;
    } catch {
      // Folder not found, try next
    }
  }

  // Also try markups/ directly in case user selected the .kobo folder
  if (!markupsDir) {
    try {
      markupsDir = await directoryHandle.getDirectoryHandle('markups');
    } catch {
      // No markups directory found
    }
  }

  if (!markupsDir) {
    console.log('No markups directory found');
    return markupFiles;
  }

  // Collect all SVG files, then match with JPG pairs
  const svgFiles = new Map<string, FileSystemFileHandle>();
  const jpgFiles = new Map<string, FileSystemFileHandle>();

  for await (const entry of markupsDir.values()) {
    if (entry.kind !== 'file') continue;
    const name = entry.name;
    const dotIndex = name.lastIndexOf('.');
    if (dotIndex === -1) continue;
    const baseName = name.substring(0, dotIndex);
    const ext = name.substring(dotIndex + 1).toLowerCase();

    if (ext === 'svg') {
      svgFiles.set(baseName, entry as FileSystemFileHandle);
    } else if (ext === 'jpg' || ext === 'jpeg') {
      jpgFiles.set(baseName, entry as FileSystemFileHandle);
    }
  }

  // Read paired files
  for (const [bookmarkId, svgHandle] of svgFiles) {
    const jpgHandle = jpgFiles.get(bookmarkId);
    if (!jpgHandle) continue; // Skip SVGs without matching JPG

    try {
      const svgFile = await svgHandle.getFile();
      const jpgFile = await jpgHandle.getFile();
      const svg = await svgFile.arrayBuffer();
      const jpg = await jpgFile.arrayBuffer();
      markupFiles.push({ bookmarkId, svg, jpg });
    } catch (error) {
      console.warn(`Failed to read markup files for ${bookmarkId}:`, error);
    }
  }

  console.log(`Found ${markupFiles.length} markup file pairs`);
  return markupFiles;
}
```

**Step 2: Update `handleDirectorySelect` to also collect and store markup files**

In the `handleDirectorySelect` function, after the line `const dbFileHandle = await findKoboDBInDirectory(directoryHandle)`, add markup file collection and storage. Update the function to:

```typescript
const handleDirectorySelect = async () => {
    if (!('showDirectoryPicker' in window)) {
      setError('File system access is not supported in your browser.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use the File System Access API
      const directoryHandle = await (window as Window & { showDirectoryPicker(): Promise<FileSystemDirectoryHandle> }).showDirectoryPicker()

      // Find Kobo database file in the directory
      const dbFileHandle = await findKoboDBInDirectory(directoryHandle)
      if (!dbFileHandle) {
        throw new Error('Kobo database file not found in selected directory')
      }

      // Find and store markup files (handwriting annotations)
      const markupFiles = await findMarkupFiles(directoryHandle)
      if (markupFiles.length > 0) {
        const { clearMarkupFiles, saveMarkupFiles } = await import('@/services/markupService')
        await clearMarkupFiles()
        await saveMarkupFiles(markupFiles)
      }

      // Get file from handle and process
      const file = await dbFileHandle.getFile()
      await handleDatabaseSelect(file)

    } catch (error) {
      const errorMessage = ErrorService.getErrorMessage(error as Error)
      setError(errorMessage)
      ErrorService.logError(error as Error)

    } finally {
      setIsLoading(false)
    }
  }
```

Note: We use dynamic `import()` for `markupService` to keep it lazy-loaded.

**Step 3: Add import for MarkupFile type at top (not needed since we use dynamic import)**

No additional imports needed at the top of the file since we use dynamic `import()`.

**Step 4: Verify typecheck passes**

Run: `npm run typecheck`

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/\(landing\)/page.tsx
git commit -m "feat: collect markup files from directory picker"
```

---

### Task 5: Create MarkupViewer Component

**Files:**
- Create: `src/components/MarkupViewer.tsx`

**Step 1: Create the MarkupViewer component**

This component renders an SVG overlay on top of a JPG page screenshot. It accepts binary data (ArrayBuffers) and creates object URLs for rendering.

```typescript
// src/components/MarkupViewer.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface MarkupViewerProps {
  svgData: ArrayBuffer;
  jpgData: ArrayBuffer;
  className?: string;
}

export function MarkupViewer({ svgData, jpgData, className }: MarkupViewerProps) {
  const [jpgUrl, setJpgUrl] = useState<string | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const jpgBlob = new Blob([jpgData], { type: 'image/jpeg' });
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
    const jpgObjectUrl = URL.createObjectURL(jpgBlob);
    const svgObjectUrl = URL.createObjectURL(svgBlob);
    setJpgUrl(jpgObjectUrl);
    setSvgUrl(svgObjectUrl);

    return () => {
      URL.revokeObjectURL(jpgObjectUrl);
      URL.revokeObjectURL(svgObjectUrl);
    };
  }, [svgData, jpgData]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isExpanded) {
      setIsExpanded(false);
    }
  }, [isExpanded]);

  if (!jpgUrl || !svgUrl) return null;

  return (
    <>
      {/* Thumbnail view */}
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className={`relative cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors ${className || ''}`}
        style={{ maxWidth: '300px', aspectRatio: '1264 / 1680' }}
        title="Click to expand"
      >
        <img
          src={jpgUrl}
          alt="Book page"
          className="w-full h-full object-cover"
        />
        <img
          src={svgUrl}
          alt="Handwriting annotation"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </button>

      {/* Expanded modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setIsExpanded(false)}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded handwriting annotation"
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="absolute top-2 right-2 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="relative" style={{ aspectRatio: '1264 / 1680' }}>
              <img
                src={jpgUrl}
                alt="Book page"
                className="w-full h-full object-contain"
              />
              <img
                src={svgUrl}
                alt="Handwriting annotation"
                className="absolute inset-0 w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`

Expected: PASS

**Step 3: Commit**

```bash
git add src/components/MarkupViewer.tsx
git commit -m "feat: add MarkupViewer component for SVG-over-JPG rendering"
```

---

### Task 6: Update ChapterSection to Render Markup Annotations

**Files:**
- Modify: `src/app/book/[contentId]/notes/components/ChapterSection.tsx`

**Step 1: Add markup rendering logic**

Update `ChapterSection.tsx` to detect markup-type notes and render them using the `MarkupViewer` component. Markup notes will need to load their SVG/JPG data from IndexedDB.

Replace the entire file content:

```typescript
'use client';

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
  const [markupData, setMarkupData] = useState<Map<string, MarkupFile>>(new Map())

  // Check first note for color support (all notes have same schema)
  const hasColorSupport = chapter.notes?.[0]?.color !== undefined;

  // Load markup files for any markup-type notes in this chapter
  useEffect(() => {
    const markupIds = chapter.notes
      ?.filter(note => note.type === 'markup')
      .map(note => note.bookmarkId) || [];

    if (markupIds.length === 0) return;

    getMarkupFilesByIds(markupIds).then(setMarkupData);
  }, [chapter.notes]);

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
            const isMarkup = chapterNote.type === 'markup';
            const markup = isMarkup ? markupData.get(chapterNote.bookmarkId) : null;
            const hasColor = chapterNote.color !== undefined && chapterNote.color !== null;
            const colorClasses = hasColorSupport && hasColor ? getHighlightColorClasses(chapterNote.color) : null;

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
                        <Text className="text-sm text-zinc-400 italic">
                          Handwriting data not available
                        </Text>
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
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`

Expected: PASS

**Step 3: Commit**

```bash
git add src/app/book/\[contentId\]/notes/components/ChapterSection.tsx
git commit -m "feat: render handwriting annotations in chapter notes"
```

---

### Task 7: Update NotesSection Count to Include Markups

**Files:**
- Modify: `src/app/book/[contentId]/notes/components/NotesSection.tsx:23,34`

**Step 1: Fix the empty-state check and count display**

The current empty check `notes.length === 0` will now also count markup entries, which is correct. But the count label says "highlights" — update it to be more inclusive.

In `src/app/book/[contentId]/notes/components/NotesSection.tsx`, change line 34:

```
// OLD:
<Text className='text-zinc-500 dark:text-zinc-400'>{notes.length} highlghts</Text>

// NEW:
<Text className='text-zinc-500 dark:text-zinc-400'>{notes.length} annotations</Text>
```

Also fix the typo "highlghts" -> "annotations" (it was misspelled as "highlghts").

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`

Expected: PASS

**Step 3: Commit**

```bash
git add src/app/book/\[contentId\]/notes/components/NotesSection.tsx
git commit -m "fix: update annotation count label and fix typo"
```

---

### Task 8: Update Book List Counts to Include Markups

**Files:**
- Modify: `src/services/koboService.ts:120-131`

**Step 1: Update the count logic in loadBooksWithNotes**

Currently the highlight/note counting logic in `loadBooksWithNotes` separates by `annotation` field presence. Markup entries have no text and no annotation, so they wouldn't be counted in either category. Add a count for markups.

In `src/services/koboService.ts`, update the counting block inside the `for` loop (around lines 125-131):

```typescript
// OLD:
const highlights = highlightsAndNotes.filter(item => item.annotation === null || item.annotation === '')
const notes = highlightsAndNotes.filter(item => item.annotation !== null && item.annotation !== '')

const transformedBook: IBook = {
  // ...
  totalHighlights: highlights.length,
  totalNotes: notes.length
}

// NEW:
const markups = highlightsAndNotes.filter(item => item.type === 'markup')
const textItems = highlightsAndNotes.filter(item => item.type !== 'markup')
const highlights = textItems.filter(item => item.annotation === null || item.annotation === '')
const notes = textItems.filter(item => item.annotation !== null && item.annotation !== '')

const transformedBook: IBook = {
  // ...
  totalHighlights: highlights.length + markups.length,
  totalNotes: notes.length
}
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`

Expected: PASS

**Step 3: Commit**

```bash
git add src/services/koboService.ts
git commit -m "feat: include markup annotations in book highlight counts"
```

---

### Task 9: Clear Markup Data When Database Is Cleared

**Files:**
- Modify: `src/services/koboService.ts:365-377` (the `clearStoredData` method)

**Step 1: Add markup cleanup to clearStoredData**

In the `clearStoredData` method of `KoboService`, also clear the markup IndexedDB:

```typescript
// OLD:
static async clearStoredData(): Promise<void> {
    try {
      // Close database if open
      this.closeDatabase()

      // Clear IndexedDB
      if (typeof indexedDB !== 'undefined') {
        await indexedDB.deleteDatabase('KoboDB')
      }
    } catch (error) {
      console.warn('Failed to clear stored data:', error)
    }
  }

// NEW:
static async clearStoredData(): Promise<void> {
    try {
      // Close database if open
      this.closeDatabase()

      // Clear IndexedDB
      if (typeof indexedDB !== 'undefined') {
        await indexedDB.deleteDatabase('KoboDB')
        // Also clear markup files
        const { clearMarkupFiles } = await import('@/services/markupService')
        await clearMarkupFiles()
      }
    } catch (error) {
      console.warn('Failed to clear stored data:', error)
    }
  }
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`

Expected: PASS

**Step 3: Commit**

```bash
git add src/services/koboService.ts
git commit -m "feat: clear markup data when database is cleared"
```

---

### Task 10: Full Integration Verification

**Step 1: Run typecheck**

Run: `npm run typecheck`

Expected: PASS with zero errors

**Step 2: Run lint**

Run: `npm run lint`

Expected: PASS (fix any lint issues)

**Step 3: Run build**

Run: `npm run build`

Expected: PASS — successful production build

**Step 4: Manual verification checklist**

Verify these scenarios work by running `npm run dev` and testing:

1. Upload a Kobo folder that has markups/ — handwriting annotations appear in the notes view
2. Upload a Kobo folder without markups/ — existing behavior unchanged
3. Upload a single .sqlite file — existing behavior unchanged (no markups loaded)
4. Click a markup thumbnail — it expands to full size in modal
5. Click outside modal or X button — modal closes
6. Book list shows correct counts including markup annotations
7. Clear stored data and reload — markup data is also cleared

**Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "feat: complete handwriting annotation support"
```

---

### Task 11: Chrome MCP Visual Verification & UI Refinement

**IMPORTANT:** This task uses browser automation (Chrome MCP tools) to visually inspect every screen of the feature. If anything looks wrong or could be improved, use the `ui-ux-pro-max:ui-ux-pro-max` or `frontend-design:frontend-design` skill to fix UI/UX issues before moving on.

**Prerequisites:** `npm run dev` must be running on localhost.

**Step 1: Start dev server**

Run: `npm run dev` (in background)

Wait for the server to be ready.

**Step 2: Upload test data via Chrome MCP**

Use Chrome MCP tools to:
1. Open `http://localhost:3000` in the browser
2. Take a screenshot of the landing page
3. Use the directory picker to select the test Kobo folder at `/Users/upchen/Dropbox/01_Projects/15-KoboUp/db folders/up 2026`
4. Take a screenshot of the books list page after upload

**Verify visually:**
- Landing page loads correctly
- After upload, books list shows correct counts (should include markup annotation counts)
- No console errors

**Step 3: Verify notes page with handwriting annotations**

Use Chrome MCP tools to:
1. Click into the book that has markup annotations
2. Take a screenshot of the notes page
3. Scroll through the notes to find handwriting annotation cards

**Verify visually:**
- Handwriting annotations appear interleaved with text highlights
- The pen icon and "Handwriting" label are visible on markup cards
- SVG is properly overlaid on JPG (strokes visible on page background)
- Thumbnail size is reasonable (~300px width, not too large or too small)
- The annotation count at the top includes markup annotations
- Timeline/connector line between notes looks consistent for both types
- Indigo dot color for markup notes is visually distinct from highlight colors

**Step 4: Verify expanded modal**

Use Chrome MCP tools to:
1. Click on a handwriting annotation thumbnail
2. Take a screenshot of the expanded modal
3. Verify the SVG overlay aligns with the JPG background at full size
4. Close the modal (click X or click outside)
5. Take a screenshot to confirm modal closed cleanly

**Verify visually:**
- Modal backdrop is visible (dark overlay)
- Close button (X) is visible and accessible
- SVG strokes are clearly visible and aligned with page content
- Image quality is good at expanded size

**Step 5: Check for UI/UX issues and fix**

After all screenshots, evaluate the overall UI quality:
- Are markup cards visually cohesive with the existing highlight cards?
- Is spacing consistent between markup cards and text highlight cards?
- Does the "Handwriting data not available" fallback look acceptable?
- Are there any visual glitches, misalignment, or overflow issues?
- Does it look good on both light and dark mode?

**If ANY UI issues are found:**
1. Invoke the `ui-ux-pro-max:ui-ux-pro-max` skill for design guidance
2. Fix the CSS/component issues
3. Re-verify with Chrome MCP screenshots
4. Repeat until the UI is polished and production-ready

**Step 6: Production-readiness check**

Run ALL of the following and ensure they pass:
1. `npm test` — all tests must pass
2. `npm run lint` — no errors
3. `npm run build` — must compile successfully
4. Security review — review code changes for OWASP top 10 vulnerabilities, injection risks (especially SVG rendering — ensure no XSS via malicious SVG content), credential exposure

**Step 7: Final commit**

```bash
git add -A
git commit -m "polish: UI refinements for handwriting annotation support"
```
