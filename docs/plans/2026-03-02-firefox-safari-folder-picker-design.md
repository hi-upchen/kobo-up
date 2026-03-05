# Firefox & Safari Folder Picker Support

## Problem

Handwriting annotations only work when users select their Kobo root folder (to access `.kobo/markups/` files). The current implementation uses `showDirectoryPicker` which only works on Chrome/Edge. Firefox/Safari users fall back to a single-file `.sqlite` upload that cannot load handwriting data.

## Decision

Use `<input webkitdirectory>` as a fallback for Firefox/Safari. This attribute is supported on all major browsers and allows directory selection with recursive file enumeration.

## Design

### Three-Tier Browser Support

| Tier | API | Browsers | Experience |
|------|-----|----------|------------|
| 1 | `showDirectoryPicker` | Chrome, Edge | Full features, lazy file loading |
| 2 | `<input webkitdirectory>` | Firefox, Safari | Full features, all files loaded at once |
| 3 | `<input type="file">` | Very old browsers | Text highlights only, no handwriting |

### UI

- **Tier 1 & 2**: Same prominent "Select Kobo Root Folder" button. Users cannot tell which API is used underneath.
- **Tier 3**: Fallback "Upload KoboReader.sqlite" button with info note: "Handwriting annotations require Chrome, Edge, Firefox, or Safari"

Feature detection:
- `'showDirectoryPicker' in window` → Tier 1
- Check `webkitdirectory` support (create test input, check attribute) → Tier 2
- Neither → Tier 3

### Data Flow

Both Tier 1 and Tier 2 converge to the same processing path:

```
User clicks "Select Kobo Root Folder"
│
├── Tier 1 (Chrome/Edge): showDirectoryPicker()
│   └── FileSystemDirectoryHandle
│
└── Tier 2 (Firefox/Safari): <input webkitdirectory>
    └── FileList with webkitRelativePath
│
▼ (converge)
│
├── Find KoboReader.sqlite (or Kobo.sqlite)
├── Find .kobo/markups/*.svg and *.jpg files
├── Pair SVG/JPG by basename → MarkupFile[]
├── saveMarkupFiles(markupFiles)
└── handleDatabaseSelect(sqliteFile)
```

### Processing the webkitdirectory FileList

When using `webkitdirectory`, the browser returns a flat `FileList` where each `File` has a `webkitRelativePath` property (e.g., `.kobo/KoboReader.sqlite`, `.kobo/markups/abc123.svg`).

Processing logic:
1. Iterate `FileList`, find file where `webkitRelativePath` ends with `KoboReader.sqlite` or `Kobo.sqlite`
2. Collect files where `webkitRelativePath` matches `.kobo/markups/*.svg` or `.kobo/markups/*.jpg`
3. Pair SVG and JPG files by basename (filename without extension)
4. Read paired files as `ArrayBuffer` → same `MarkupFile` type
5. Hand off to existing `saveMarkupFiles()` and `handleDatabaseSelect()`

### Component Changes

**`DatabaseSelector.tsx`**:
- Remove `isDirectoryPickerSupported` branching for folder vs file UI
- Add new prop: `supportLevel: 'directory-api' | 'webkitdirectory' | 'file-only'`
- Always show folder picker button for Tier 1 & 2
- Add hidden `<input webkitdirectory>` element for Tier 2
- Show file-only fallback with handwriting warning for Tier 3

**`page.tsx`**:
- Detect support level at mount: Tier 1 → 2 → 3
- For Tier 2: add `handleWebkitDirectoryFiles(files: FileList)` that extracts the sqlite file and markup files from the flat file list
- Both Tier 1 `handleDirectorySelect` and Tier 2 `handleWebkitDirectoryFiles` converge to the same downstream processing (save markups + init database)
- Remove `isDirectoryPickerSupported` state, replace with `supportLevel`

### Performance

- `webkitdirectory` enumerates ALL files in the selected directory tree before returning
- A typical Kobo has a few hundred files — enumeration should take 1-3 seconds
- Heavy readers with thousands of books may wait 5-10 seconds
- Existing loading spinner covers this wait time
- No additional optimization needed for v1

### Error Handling

- No `.sqlite` file found in selected folder → existing error message
- Empty markups folder → graceful degradation (text highlights still work)
- `webkitdirectory` enumeration slow → loading spinner visible
- Very old browser (no webkitdirectory) → Tier 3 file picker with handwriting warning
