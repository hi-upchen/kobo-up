# KoboUp Project Context

## Project Overview
- **Name**: KoboUp
- **Type**: Kobo e-reader data visualization web application
- **Purpose**: Allow users to upload Kobo SQLite files and view their reading notes and highlights

## Tech Stack
- **Frontend**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQL.js (SQLite in browser, client-side only)
- **Internationalization**: Multi-language support (English, Traditional Chinese)

## Architecture
- **Client-side only**: Privacy-focused, no server database
- **Local processing**: All SQLite operations happen in browser using WebAssembly
- **App Router**: Uses Next.js 13+ app directory structure

## Core Pages
1. **Landing page** - File upload interface for Kobo SQLite files
2. **Book listing page** - Shows all books from uploaded database
3. **Book detail page** - Displays notes and highlights for each book

## Key Features
- Local processing of Kobo SQLite files using SQL.js WebAssembly
- Extract and display reading annotations (notes/highlights)
- Export utilities for data backup/sharing (markdown, JSON, etc.)
- Multi-language support
- Donation integration (Buy Me a Coffee)

## Project Structure
```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (landing)/         # Landing page route group
│   │   └── components/    # Landing-specific components
│   ├── api/               # API routes
│   │   └── kobodb/        # Kobo database API endpoints
│   ├── book/              # Individual book pages
│   │   └── [contentId]/   # Dynamic book detail routes
│   │       └── notes/     # Book notes and highlights
│   ├── books/             # Books listing page
│   │   └── components/    # Books page components (BookGridRow, etc.)
│   └── components/        # Page-specific shared components
├── components/            # Reusable UI component library (Headless UI components)
├── constants/             # Application constants
├── models/                # Data models and database operations
│   └── KoboDB.ts         # SQLite database interface for Kobo data
├── services/              # Business logic services
│   ├── errorService.ts   # Error handling
│   ├── exportService.ts  # Data export functionality
│   ├── koboService.ts    # Core Kobo data service
│   └── navigationService.ts # Navigation utilities
├── types/                 # TypeScript type definitions
│   └── kobo.ts           # Kobo data types (IBook, INote, etc.)
└── utils/                 # Utility functions
    ├── gtm.ts           # Google Tag Manager
    └── markdownGenerator.ts # Markdown generation

public/
└── sql.js/              # SQL.js WebAssembly files for browser SQLite
```

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks

## Coding Standards
- **Minimal changes**: Make the smallest possible changes to achieve the goal
- **Clean code**: Keep code simple, readable, and maintainable
- **Industry best practices**: Follow established patterns and conventions
- **No over-engineering**: Avoid unnecessary complexity or abstractions
- **Native functions**: Prefer built-in JavaScript/TypeScript functions over libraries
- **Tailwind CSS**: Use Tailwind utility classes for all styling
- **Delete unused code**: When moving/refactoring code, immediately remove unused code and imports

## Key Technical Notes
- All database operations are client-side for privacy
- Uses SQL.js WebAssembly for SQLite operations in browser
- No server-side database or API endpoints for data storage
- Focuses on reading/displaying existing Kobo data, not creating new data