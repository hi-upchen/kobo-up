# Firefox & Safari Folder Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Support folder selection on Firefox and Safari using `<input webkitdirectory>` so handwriting annotations work on all browsers.

**Architecture:** Replace the boolean `isDirectoryPickerSupported` with a three-tier support level. Tier 1 (Chrome/Edge) uses `showDirectoryPicker`. Tier 2 (Firefox/Safari) uses `<input webkitdirectory>`. Tier 3 (very old browsers) uses single-file upload with a handwriting warning. Extract shared processing logic so both Tier 1 and Tier 2 converge to the same path.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, File System Access API, `webkitdirectory` attribute

---

### Task 1: Extract shared processing logic into helper function

**Files:**
- Modify: `src/app/(landing)/page.tsx:62-101`

The current `handleDirectorySelect` mixes two concerns: opening the directory picker AND processing the found files. Extract the processing part so both the `showDirectoryPicker` path and the new `webkitdirectory` path can share it.

**Step 1: Create `processKoboFiles` helper**

Add this function inside `LandingPage` component, after `handleDatabaseSelect` (after line 60):

```typescript
const processKoboFiles = async (
  sqliteFile: File,
  markupFiles: { bookmarkId: string; svg: ArrayBuffer; jpg: ArrayBuffer }[]
) => {
  const { clearMarkupFiles, saveMarkupFiles } = await import('@/services/markupService')
  await clearMarkupFiles()
  if (markupFiles.length > 0) {
    await saveMarkupFiles(markupFiles)
  }
  await handleDatabaseSelect(sqliteFile)
}
```

**Step 2: Update `handleDirectorySelect` to use it**

Replace lines 81-91 of the current `handleDirectorySelect` with:

```typescript
// Find and store markup files (handwriting annotations)
const markupFiles = await findMarkupFiles(directoryHandle)

// Get file from handle and process
const file = await dbFileHandle.getFile()
await processKoboFiles(file, markupFiles)
```

**Step 3: Verify typecheck passes**

Run: `npm run typecheck`

Expected: PASS

**Step 4: Commit**

```bash
git add src/app/\(landing\)/page.tsx
git commit -m "refactor: extract processKoboFiles helper for shared processing"
```

---

### Task 2: Add `webkitdirectory` FileList processing helpers

**Files:**
- Modify: `src/app/(landing)/page.tsx` (add after `findMarkupFiles` function, ~line 619)

These functions extract the SQLite file and markup files from a flat `FileList` returned by `<input webkitdirectory>`.

**Step 1: Add `findKoboDBInFileList` function**

Add at the bottom of the file, after `findMarkupFiles`:

```typescript
function findKoboDBInFileList(files: FileList): File | null {
  const possibleNames = ['KoboReader.sqlite', 'Kobo.sqlite']

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    for (const name of possibleNames) {
      if (file.name === name) {
        return file
      }
    }
  }

  return null
}
```

**Step 2: Add `findMarkupFilesInFileList` function**

Add after `findKoboDBInFileList`:

```typescript
async function findMarkupFilesInFileList(
  files: FileList
): Promise<{ bookmarkId: string; svg: ArrayBuffer; jpg: ArrayBuffer }[]> {
  const markupFiles: { bookmarkId: string; svg: ArrayBuffer; jpg: ArrayBuffer }[] = []

  // Collect SVG and JPG files from .kobo/markups/ path
  const svgFiles = new Map<string, File>()
  const jpgFiles = new Map<string, File>()

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const relativePath = file.webkitRelativePath || ''

    // Match files in .kobo/markups/ or _kobo/markups/ directory
    const markupMatch = relativePath.match(/[./]kobo\/markups\/([^/]+)\.(svg|jpe?g)$/i)
    if (!markupMatch) continue

    const baseName = markupMatch[1]
    const ext = markupMatch[2].toLowerCase()

    if (ext === 'svg') {
      svgFiles.set(baseName, file)
    } else {
      jpgFiles.set(baseName, file)
    }
  }

  // Pair SVG and JPG files by basename
  for (const [bookmarkId, svgFile] of svgFiles) {
    const jpgFile = jpgFiles.get(bookmarkId)
    if (!jpgFile) continue

    try {
      const svg = await svgFile.arrayBuffer()
      const jpg = await jpgFile.arrayBuffer()
      markupFiles.push({ bookmarkId, svg, jpg })
    } catch (error) {
      console.warn(`Failed to read markup files for ${bookmarkId}:`, error)
    }
  }

  return markupFiles
}
```

**Step 3: Verify typecheck passes**

Run: `npm run typecheck`

Expected: PASS

**Step 4: Commit**

```bash
git add src/app/\(landing\)/page.tsx
git commit -m "feat: add webkitdirectory FileList processing helpers"
```

---

### Task 3: Replace `isDirectoryPickerSupported` with three-tier `supportLevel`

**Files:**
- Modify: `src/app/(landing)/page.tsx:19,21-23,62-66,243-247`

**Step 1: Define the support level type and replace state**

At the top of the file (after imports, before the component), add:

```typescript
type FolderPickerSupport = 'directory-api' | 'webkitdirectory' | 'file-only'
```

Inside `LandingPage`, replace line 19:

```typescript
// OLD:
const [isDirectoryPickerSupported, setIsDirectoryPickerSupported] = useState(true)

// NEW:
const [supportLevel, setSupportLevel] = useState<FolderPickerSupport>('directory-api')
```

**Step 2: Update the useEffect detection logic**

Replace line 23:

```typescript
// OLD:
setIsDirectoryPickerSupported('showDirectoryPicker' in window)

// NEW:
if ('showDirectoryPicker' in window) {
  setSupportLevel('directory-api')
} else {
  // Check webkitdirectory support
  const testInput = document.createElement('input')
  if ('webkitdirectory' in testInput) {
    setSupportLevel('webkitdirectory')
  } else {
    setSupportLevel('file-only')
  }
}
```

**Step 3: Update the `handleDirectorySelect` guard**

Replace lines 63-66 of `handleDirectorySelect`:

```typescript
// OLD:
if (!('showDirectoryPicker' in window)) {
  setError('File system access is not supported in your browser.')
  return
}

// NEW:
if (supportLevel !== 'directory-api') {
  setError('File system access is not supported in your browser.')
  return
}
```

**Step 4: Add `handleWebkitDirectorySelect` handler**

Add after `handleDirectorySelect` (after line 101):

```typescript
const handleWebkitDirectorySelect = async (files: FileList) => {
  setIsLoading(true)
  setError(null)

  try {
    const sqliteFile = findKoboDBInFileList(files)
    if (!sqliteFile) {
      throw new Error('Kobo database file not found in selected directory')
    }

    const markupFiles = await findMarkupFilesInFileList(files)
    await processKoboFiles(sqliteFile, markupFiles)

  } catch (error) {
    const errorMessage = ErrorService.getErrorMessage(error as Error)
    setError(errorMessage)
    ErrorService.logError(error as Error)

  } finally {
    setIsLoading(false)
  }
}
```

**Step 5: Update DatabaseSelector props**

Replace the `<DatabaseSelector>` usage (around line 243):

```tsx
// OLD:
<DatabaseSelector
  isDirectoryPickerSupported={isDirectoryPickerSupported}
  onFileSelect={handleDatabaseSelect}
  onDirectorySelect={handleDirectorySelect}
/>

// NEW:
<DatabaseSelector
  supportLevel={supportLevel}
  onDirectorySelect={handleDirectorySelect}
  onWebkitDirectorySelect={handleWebkitDirectorySelect}
  onFileSelect={handleDatabaseSelect}
/>
```

**Step 6: Verify typecheck (expect errors — DatabaseSelector not updated yet)**

Run: `npm run typecheck`

Expected: FAIL on `DatabaseSelector` props mismatch (will fix in Task 4)

**Step 7: Commit**

```bash
git add src/app/\(landing\)/page.tsx
git commit -m "feat: add three-tier support level and webkitdirectory handler"
```

---

### Task 4: Update DatabaseSelector component

**Files:**
- Modify: `src/app/(landing)/components/DatabaseSelector.tsx` (full rewrite)

**Step 1: Rewrite DatabaseSelector with three-tier support**

Replace the entire file:

```typescript
import React, { useRef } from 'react'
import { Strong, Text } from '@/components/text'

type FolderPickerSupport = 'directory-api' | 'webkitdirectory' | 'file-only'

interface DatabaseSelectorProps {
  supportLevel: FolderPickerSupport
  onDirectorySelect: () => void
  onWebkitDirectorySelect: (files: FileList) => void
  onFileSelect: (file: File) => void
}

export function DatabaseSelector({
  supportLevel,
  onDirectorySelect,
  onWebkitDirectorySelect,
  onFileSelect,
}: DatabaseSelectorProps) {
  const directoryInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDirectoryInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      onWebkitDirectorySelect(files)
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  const handleFolderButtonClick = () => {
    if (supportLevel === 'directory-api') {
      onDirectorySelect()
    } else {
      directoryInputRef.current?.click()
    }
  }

  return (
    <div className="space-y-6">
      {supportLevel !== 'file-only' ? (
        <>
          <button
            type="button"
            className="relative block w-full rounded-lg border-2 border-dashed border-indigo-700 p-12 text-center hover:border-indigo-600 transition"
            onClick={handleFolderButtonClick}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="mx-auto h-12 w-12 text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15"
              />
            </svg>
            <Text className="mt-6 block text-sm font-semibold animate-bounce">
              Click here and Select your <Strong>Kobo Root folder</Strong>
            </Text>
          </button>

          {/* Hidden directory input for webkitdirectory fallback */}
          {/* @ts-expect-error webkitdirectory is a non-standard attribute */}
          <input
            ref={directoryInputRef}
            type="file"
            webkitdirectory=""
            onChange={handleDirectoryInputChange}
            className="hidden"
          />
        </>
      ) : (
        <>
          <button
            type="button"
            className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400 transition"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="mx-auto h-8 w-8 text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            <Text className="mt-2 block text-sm font-medium">
              Upload <Strong>KoboReader.sqlite</Strong> file
            </Text>
            <Text className="mt-1 block text-xs text-gray-500">
              Usually found in .kobo folder on your Kobo device
            </Text>
            <Text className="mt-2 block text-xs text-amber-600 dark:text-amber-400">
              Handwriting annotations require Chrome, Edge, Firefox, or Safari
            </Text>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".sqlite,.db"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </>
      )}
    </div>
  )
}
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`

Expected: PASS — may need to handle the `webkitdirectory` TypeScript issue. If TS complains about the `webkitdirectory` attribute, the `@ts-expect-error` comment handles it.

**Step 3: Verify lint passes**

Run: `npm run lint`

Expected: PASS

**Step 4: Commit**

```bash
git add src/app/\(landing\)/components/DatabaseSelector.tsx
git commit -m "feat: update DatabaseSelector with three-tier folder picker support"
```

---

### Task 5: Add TypeScript declaration for webkitdirectory

**Files:**
- Check if needed: if `@ts-expect-error` is not clean enough, create `src/types/webkitdirectory.d.ts`

**Step 1: Check if typecheck passes from Task 4**

If typecheck already passes with the `@ts-expect-error` comment, skip this task.

If there are additional TS issues with `webkitRelativePath` on `File`, add:

```typescript
// src/types/webkitdirectory.d.ts
interface HTMLInputElement {
  webkitdirectory: boolean
}
```

Note: `webkitRelativePath` is already part of the `File` interface in TypeScript's lib.dom.d.ts, so it should not need a declaration.

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`

Expected: PASS

**Step 3: Commit (only if file was created)**

```bash
git add src/types/webkitdirectory.d.ts
git commit -m "feat: add TypeScript declaration for webkitdirectory attribute"
```

---

### Task 6: Full verification

**Step 1: Run typecheck**

Run: `npm run typecheck`

Expected: PASS

**Step 2: Run lint**

Run: `npm run lint`

Expected: PASS

**Step 3: Run build**

Run: `npm run build`

Expected: PASS

**Step 4: Run tests**

Run: `npm test`

Expected: PASS

**Step 5: Manual verification checklist**

Run `npm run dev` and test these scenarios:

1. **Chrome**: Click "Select Kobo Root Folder" — uses native directory picker, handwriting works (existing behavior preserved)
2. **Firefox**: Click "Select Kobo Root Folder" — opens folder dialog via `webkitdirectory`, finds database, loads markup files, handwriting works
3. **Safari**: Same as Firefox test
4. **Error case**: Select a non-Kobo folder — shows "Kobo database file not found" error
5. **No markups**: Select a Kobo folder without `.kobo/markups/` — text highlights work, no errors

**Step 6: Commit any fixes**

```bash
git add -A
git commit -m "feat: complete Firefox/Safari folder picker support"
```
