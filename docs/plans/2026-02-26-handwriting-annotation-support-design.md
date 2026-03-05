# Handwriting Annotation Support Design

## Overview

Add support for displaying handwriting (markup) annotations from newer Kobo e-readers that support stylus input. Users will see handwritten notes interleaved with text highlights in the existing notes view.

## How Kobo Stores Handwriting

- Handwriting bookmarks are in the `Bookmark` table with `Type = 'markup'`
- Each markup has an SVG file (`markups/{BookmarkID}.svg`) containing pen stroke vectors at 1264x1680px
- Each markup has a JPG file (`markups/{BookmarkID}.jpg`) — a page screenshot
- `Text` and `Annotation` fields are empty for markups
- SVG strokes are filled paths with pen colors (blue #0065bd, green #00985f, black #000000)
- The SVG is designed to overlay the JPG at the same dimensions

## Decisions

| Decision | Choice |
|----------|--------|
| Upload method | Directory picker only (no single-file support for markups) |
| Display style | SVG overlay on JPG page screenshot |
| Note ordering | Interleaved with highlights by chapter progress |
| Export handling | Deferred — placeholder with metadata later |
| Storage | IndexedDB persistence (same as database) |

## Data Flow

1. User selects Kobo root folder via directory picker (existing flow)
2. App finds `KoboReader.sqlite` (existing) AND scans for `.kobo/markups/` folder
3. SVG/JPG files from `markups/` are read as ArrayBuffers
4. Files stored in a new IndexedDB object store (`markups`) keyed by BookmarkID
5. SQL query updated to also read `Type = 'markup'` bookmarks (read-only, no DB modification)
6. When user uploads a new database, markups store is cleared and repopulated

## UI Rendering

- Markup cards appear in the same list as text highlights, sorted by `ChapterProgress`
- Each markup card shows:
  - Pen/drawing icon badge to distinguish from text highlights
  - Date created
  - Container with JPG as background, SVG overlaid on top
  - Preview size ~300px max-width
- Click to expand opens a modal/lightbox for full-size viewing
- Text highlight cards remain unchanged

## Files to Change

| File | Change |
|------|--------|
| `src/app/(landing)/page.tsx` | Extend directory picker to scan for `markups/` folder |
| `src/app/(landing)/components/DatabaseSelector.tsx` | Pass markup files alongside database |
| `src/services/koboService.ts` | Store markup files in IndexedDB |
| `src/models/KoboDB.ts` | Update SQL query to include markup bookmarks |
| `src/types/kobo.ts` | Add markup-related fields to types |
| `src/app/book/[contentId]/notes/components/ChapterSection.tsx` | Render markup cards |
| New: `src/components/MarkupViewer.tsx` | SVG-over-JPG rendering component |
| New: `src/services/markupService.ts` | IndexedDB CRUD for markup files |
