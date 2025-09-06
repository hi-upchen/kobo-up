import { APP_CONSTANTS } from '../constants/appConstants'
import type { IBook, INote, IHighlight, IBookHighlightNAnnotation, IBookChapter } from '../types/kobo'
import { ErrorService } from './errorService'
import { 
  connKoboDB, 
  checkIsKoboDB, 
  getBookList, 
  getHighlightNAnnotationList,
  getBook,
  getChaptersWithNotes
} from '../models/KoboDB'
import type { Database } from 'sql.js'

export class KoboService {
  private static database: Database | null = null

  /**
   * Check if the provided file is a valid Kobo database file
   */
  static isValidKoboDatabase(file: File): boolean {
    const extension = this.getFileExtension(file.name)
    const hasValidExtension = APP_CONSTANTS.SUPPORTED_DB_EXTENSIONS.includes(extension as '.sqlite' | '.db')
    const hasValidSize = this.validateFileSize(file)
    
    return hasValidExtension && hasValidSize
  }

  /**
   * Extract file extension from filename
   */
  static getFileExtension(filename: string): string {
    if (!filename || filename.length === 0) return ''
    
    const lastDotIndex = filename.lastIndexOf('.')
    if (lastDotIndex === -1) return ''
    
    return filename.substring(lastDotIndex)
  }

  /**
   * Validate file size is within acceptable limits
   */
  static validateFileSize(file: File): boolean {
    return file.size <= APP_CONSTANTS.MAX_FILE_SIZE
  }

  /**
   * Initialize database from uploaded file
   */
  static async initializeDatabase(file: File): Promise<void> {
    try {
      if (!this.isValidKoboDatabase(file)) {
        throw ErrorService.handleFileError('Invalid Kobo database file')
      }

      // Initialize database connection using existing KoboDB functions
      const db = await connKoboDB(file)
      
      // Validate it's actually a Kobo database
      const isKoboDb = await checkIsKoboDB(db)
      if (!isKoboDb) {
        throw ErrorService.handleDatabaseError(
          new Error('File does not contain Kobo database structure'),
          'validation'
        )
      }

      this.database = db
      
      // Store database data using the original IndexedDB approach
      // Convert File to ArrayBuffer and store in IndexedDB
      const arrayBuffer = await file.arrayBuffer()
      await this.saveToIndexedDB(arrayBuffer)

    } catch (error) {
      throw ErrorService.handleDatabaseError(error as Error, 'initialization')
    }
  }

  /**
   * Initialize database from stored IndexedDB data
   */
  static async initializeFromStoredData(): Promise<void> {
    try {
      const storedArrayBuffer = await this.getFromIndexedDB()
      if (!storedArrayBuffer) {
        throw ErrorService.handleDatabaseError(
          new Error('No stored database found'),
          'loading'
        )
      }
      
      // Create a File object from the ArrayBuffer
      const blob = new Blob([storedArrayBuffer], { type: 'application/x-sqlite3' })
      const file = new File([blob], 'KoboReader.sqlite', { type: 'application/x-sqlite3' })
      
      // Initialize database
      const db = await connKoboDB(file)
      this.database = db

    } catch (error) {
      throw ErrorService.handleDatabaseError(error as Error, 'loading')
    }
  }

  /**
   * Load all books with their note/highlight counts
   */
  static async loadBooksWithNotes(): Promise<IBook[]> {
    try {
      if (!this.database) {
        throw new Error('Database not initialized')
      }

      // Get books from the existing KoboDB function
      const rawBooks = await getBookList(this.database)
      
      // Transform to match our IBook interface and add note/highlight counts
      const booksWithCounts: IBook[] = []
      
      for (const book of rawBooks) {
        try {
          // Get highlights and notes for this book
          const highlightsAndNotes = await getHighlightNAnnotationList(this.database, book.contentId)
          
          // Separate highlights from notes
          const highlights = highlightsAndNotes.filter(item => item.annotation === null || item.annotation === '')
          const notes = highlightsAndNotes.filter(item => item.annotation !== null && item.annotation !== '')
          
          // Transform book to our interface
          const transformedBook: IBook = {
            contentId: book.contentId,
            title: book.bookTitle || 'Untitled',
            subtitle: book.subtitle || undefined,
            author: book.author || undefined,
            isbn: book.isbn || undefined,
            dateCreated: book.releaseDate || undefined,
            lastRead: book.lastRead || undefined,
            totalHighlights: highlights.length,
            totalNotes: notes.length
          }
          
          booksWithCounts.push(transformedBook)
        } catch (error) {
          // Log error but continue with other books
          console.warn(`Failed to load notes for book ${book.contentId}:`, error)
          
          // Add book without counts
          booksWithCounts.push({
            contentId: book.contentId,
            title: book.bookTitle || 'Untitled',
            subtitle: book.subtitle || undefined,
            author: book.author || undefined,
            isbn: book.isbn || undefined,
            dateCreated: book.releaseDate || undefined,
            lastRead: book.lastRead || undefined,
            totalHighlights: 0,
            totalNotes: 0
          })
        }
      }

      // Sort books by 2 groups: 
      // 1. Books with notes >= 1, sorted by lastRead desc
      // 2. Books with notes = 0, sorted by lastRead desc
      return booksWithCounts.sort((a, b) => {
        const aTotalNotes = a.totalNotes + a.totalHighlights
        const bTotalNotes = b.totalNotes + b.totalHighlights
        
        // First, separate by groups: books with notes vs books without notes
        if (aTotalNotes >= 1 && bTotalNotes === 0) return -1  // a (with notes) comes first
        if (aTotalNotes === 0 && bTotalNotes >= 1) return 1   // b (with notes) comes first
        
        // Within the same group, sort by lastRead desc (most recent first)
        const aLastRead = a.lastRead ? new Date(a.lastRead).getTime() : 0
        const bLastRead = b.lastRead ? new Date(b.lastRead).getTime() : 0
        
        return bLastRead - aLastRead  // Descending order (most recent first)
      })

    } catch (error) {
      throw ErrorService.handleDatabaseError(error as Error, 'book loading')
    }
  }

  /**
   * Load notes for a specific book
   */
  static async loadBookNotes(contentId: string): Promise<INote[]> {
    try {
      if (!this.database) {
        throw new Error('Database not initialized')
      }

      const highlightsAndNotes = await getHighlightNAnnotationList(this.database, contentId)
      
      // Filter and transform notes (items with annotations)
      const notes: INote[] = highlightsAndNotes
        .filter(item => item.annotation !== null && item.annotation !== '')
        .map(item => ({
          id: item.bookmarkId,
          contentId: item.contentId,
          text: item.text,
          annotation: item.annotation || undefined,
          chapterProgress: item.chapterProgress,
          dateCreated: item.dateCreated,
          extraData: JSON.stringify({
            startContainerPath: item.startContainerPath,
            startOffset: item.startOffset,
            volumeId: item.volumeId,
            type: item.type
          })
        }))

      return notes

    } catch (error) {
      throw ErrorService.handleDatabaseError(error as Error, 'note loading')
    }
  }

  /**
   * Load highlights for a specific book
   */
  static async loadBookHighlights(contentId: string): Promise<IHighlight[]> {
    try {
      if (!this.database) {
        throw new Error('Database not initialized')
      }

      const highlightsAndNotes = await getHighlightNAnnotationList(this.database, contentId)
      
      // Filter and transform highlights (items without annotations)
      const highlights: IHighlight[] = highlightsAndNotes
        .filter(item => item.annotation === null || item.annotation === '')
        .map(item => ({
          id: item.bookmarkId,
          contentId: item.contentId,
          text: item.text,
          chapterProgress: item.chapterProgress,
          dateCreated: item.dateCreated,
          extraData: JSON.stringify({
            startContainerPath: item.startContainerPath,
            startOffset: item.startOffset,
            volumeId: item.volumeId,
            type: item.type
          })
        }))

      return highlights

    } catch (error) {
      throw ErrorService.handleDatabaseError(error as Error, 'highlight loading')
    }
  }

  /**
   * Get the current database instance
   */
  static getDatabase(): Database | null {
    return this.database
  }

  /**
   * Close the database connection
   */
  static closeDatabase(): void {
    if (this.database) {
      this.database.close()
      this.database = null
    }
  }

  /**
   * Check if database is initialized
   */
  static isDatabaseInitialized(): boolean {
    return this.database !== null
  }

  /**
   * Save database to IndexedDB
   */
  private static async saveToIndexedDB(arrayBuffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open('KoboDB', 1)
      
      dbRequest.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database')
        }
      }
      
      dbRequest.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = db.transaction(['database'], 'readwrite')
        const store = transaction.objectStore('database')
        
        store.put(arrayBuffer, 'koboDatabase')
        
        transaction.oncomplete = () => {
          db.close()
          resolve()
        }
        
        transaction.onerror = () => {
          db.close()
          reject(new Error('Failed to save database to IndexedDB'))
        }
      }
      
      dbRequest.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }
    })
  }

  /**
   * Get database from IndexedDB
   */
  private static async getFromIndexedDB(): Promise<ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open('KoboDB', 1)
      
      dbRequest.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database')
        }
      }
      
      dbRequest.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = db.transaction(['database'], 'readonly')
        const store = transaction.objectStore('database')
        const getRequest = store.get('koboDatabase')
        
        getRequest.onsuccess = () => {
          db.close()
          resolve(getRequest.result || null)
        }
        
        getRequest.onerror = () => {
          db.close()
          reject(new Error('Failed to read database from IndexedDB'))
        }
      }
      
      dbRequest.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }
    })
  }

  /**
   * Check if there's stored database data in IndexedDB
   */
  static async hasStoredData(): Promise<boolean> {
    try {
      const storedData = await this.getFromIndexedDB()
      return storedData !== null
    } catch {
      return false
    }
  }

  /**
   * Clear all stored database data from IndexedDB
   */
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

  /**
   * Convert Uint8Array to base64 string efficiently (handles large files)
   */
  private static arrayBufferToBase64(uint8Array: Uint8Array): string {
    let binary = ''
    const chunkSize = 8192 // Process in 8KB chunks to avoid stack overflow
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize)
      binary += String.fromCharCode(...chunk)
    }
    
    return btoa(binary)
  }

  /**
   * Check if database is initialized
   */
  static isDatabaseInitialized(): boolean {
    return this.database !== null
  }

  /**
   * Load single book details by contentId
   */
  static async loadBookDetails(contentId: string): Promise<IBook | null> {
    if (!this.database) {
      throw new Error('Database not initialized')
    }

    try {
      const book = await getBook(this.database, contentId)
      return book || null
    } catch (error) {
      ErrorService.logError(error as Error)
      return null
    }
  }

  /**
   * Load book annotations (highlights and notes) by contentId
   */
  static async loadBookAnnotations(contentId: string): Promise<IBookHighlightNAnnotation[]> {
    if (!this.database) {
      throw new Error('Database not initialized')
    }

    try {
      const annotations = await getHighlightNAnnotationList(this.database, contentId)
      return annotations || []
    } catch (error) {
      ErrorService.logError(error as Error)
      return []
    }
  }

  /**
   * Load book chapters with notes by contentId
   */
  static async loadBookChaptersWithNotes(contentId: string): Promise<IBookChapter[]> {
    if (!this.database) {
      throw new Error('Database not initialized')
    }

    try {
      const chapters = await getChaptersWithNotes(this.database, contentId)
      return chapters || []
    } catch (error) {
      ErrorService.logError(error as Error)
      return []
    }
  }
}