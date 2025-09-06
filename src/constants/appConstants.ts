export const APP_CONSTANTS = {
  SPONSOR_DISPLAY_THRESHOLD: 10,
  REDIRECT_DELAY_MS: 3000,
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  SUPPORTED_DB_EXTENSIONS: ['.sqlite', '.db'] as const,
  STORAGE_KEYS: {
    KOBO_DB: 'kobo-database',
    USER_PREFERENCES: 'user-preferences'
  }
} as const

export const ROUTES = {
  LANDING: '/',
  BOOKS: '/books',
  BOOK_DETAIL: (contentId: string) => `/book/${encodeURIComponent(contentId)}/notes`
} as const