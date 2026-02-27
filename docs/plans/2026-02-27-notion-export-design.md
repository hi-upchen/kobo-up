# Notion Export Design

**Goal:** Export a single book's highlights, annotations, and handwriting images to a Notion page with full formatting (colored highlights, chapter structure, embedded handwriting images).

**Status:** Design complete, pending implementation decision.

---

## Architecture

All Notion API calls must go through server-side proxy because Notion blocks CORS.

```
Browser                          Next.js API Routes              Notion API
------                          ------------------              ----------
1. User clicks "Export to
   Notion" in dropdown

2. If not connected:
   -> Redirect to Notion OAuth -> /api/notion/auth ------------> Notion OAuth
   <- Redirect back with code <-- /api/notion/callback <-------- (token exchange)
   (token stored in encrypted
   httpOnly cookie)

3. Browser sends book data
   (chapters, notes, highlights,
   handwriting composited JPGs)
   --------------------------> /api/notion/export -------------> Create page
                                  - Convert to Notion blocks      Upload images
                                  - Batch in groups of 100        Append blocks
                                  <- Return Notion page URL <---
4. Show success + link to
   Notion page
```

## Key Decisions

- **Auth:** Notion public OAuth integration. Server handles token exchange (client_secret required). Token stored in encrypted httpOnly cookie via iron-session (stateless, no database).
- **CORS:** Notion blocks CORS. All API calls must be server-proxied. No client-side Notion API calls possible.
- **Images:** Handwriting SVG+JPG composited into single JPG in browser (canvas). Uploaded to Notion via File Upload API through server proxy.
- **Scope:** Per-book export only (from book notes page). No bulk export.
- **Image format:** JPG for composited handwriting images (smaller file size).

## OAuth Flow

1. Register public Notion integration at developers.notion.com
2. Configure redirect URI: `https://yourdomain.com/api/notion/callback`
3. Capabilities: "Insert content" only

### User Flow

1. User clicks "Export to Notion" -> browser checks if connected (cookie exists)
2. If not connected -> redirect to `/api/notion/auth`
3. `/api/notion/auth` redirects to Notion authorization URL
4. User sees Notion's page picker -> selects parent page
5. Notion redirects to `/api/notion/callback?code=TEMP_CODE`
6. Server exchanges code for access_token using client_secret
7. Server stores access_token in encrypted httpOnly cookie
8. Redirect back to book notes page with `?notion=connected`
9. Browser detects connection, proceeds to export

### Disconnect

User clicks "Disconnect Notion" -> clears the cookie.

## Export Pipeline

### Browser Side

1. Collect book data: IBook + IBookChapter[] with all notes
2. For each handwriting annotation: composite SVG + JPG -> single JPG via canvas
3. Send to `/api/notion/export` as multipart form data

### Server Side (`/api/notion/export`)

1. Read access token from cookie
2. Create Notion page under user's selected parent:
   - H1: Book title
   - Subtitle paragraph: Author
3. For each chapter, append blocks in batches of 100:
   - H2/H3: Chapter heading (based on depth)
   - For each note (in appearing order):
     - **Markup (handwriting):** Upload image -> add image block
     - **Highlight:** Quote block with colored background
     - **Annotation:** Callout block with memo emoji
4. Return Notion page URL

### Kobo Color -> Notion Color Mapping

| Kobo Code | Color  | Notion Value         |
|-----------|--------|---------------------|
| 0         | Yellow | yellow_background    |
| 1         | Pink   | pink_background      |
| 2         | Blue   | blue_background      |
| 3         | Green  | green_background     |
| null      | None   | default              |

### Rate Limiting

- Notion allows ~3 req/s
- Batch blocks in groups of 100
- Typical book (~100 notes) = 1-2 block API calls + N image uploads

## Notion Page Structure

```
# Book Title
## Author Name

### Chapter 1: Title
> "Highlighted text..."         [yellow_background quote block]
  [memo callout] User's note    [callout block]
> "Another highlight..."        [blue_background quote block]
[Handwriting image]             [image block]

### Chapter 2: Title
...
```

## UI Changes

### Export Dropdown (NotesExportDropdown.tsx)

- Add third option: "Export to Notion"
- If not connected: "Connect & Export to Notion" with Notion icon
- If connected: "Export to Notion" directly
- During export: progress indicator ("Exporting... 15/42 notes")

### Connection State

- Check cookie existence for connection status
- "Connected to Notion" badge when connected
- "Disconnect Notion" option in dropdown

### Progress & Feedback

- Progress bar/counter during multi-call export
- Success: toast with link to Notion page
- Error: toast with error message and retry

## New Files

- `src/app/api/notion/auth/route.ts` - OAuth redirect handler
- `src/app/api/notion/callback/route.ts` - Token exchange
- `src/app/api/notion/export/route.ts` - Export endpoint
- `src/services/notionExportService.ts` - Client-side: prepare data, composite images
- `src/utils/notionBlockBuilder.ts` - Convert chapters/notes to Notion blocks
- `src/utils/imageCompositor.ts` - Canvas-based SVG+JPG compositing

## Dependencies

- `@notionhq/client` - Official Notion SDK (server-side)
- `iron-session` - Encrypted stateless sessions

## Environment Variables

- `NOTION_CLIENT_ID` - Public integration client ID
- `NOTION_CLIENT_SECRET` - Secret for token exchange
- `NOTION_REDIRECT_URI` - OAuth callback URL

## Research Notes

- Notion does NOT support CORS (confirmed via official SDK repo issue #96)
- Notion does NOT support PKCE - client_secret is mandatory
- Notion File Upload API added May 2025 (files must be attached within 1 hour)
- SVG rendering in Notion is unreliable - must composite to JPG/PNG before upload
- Max 100 blocks per API request, 500KB payload limit
- Notion OAuth works without gallery listing approval
