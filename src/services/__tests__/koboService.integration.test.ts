/**
 * Integration test for KoboService with real Kobo database
 * This test uses the actual database file to verify the service works correctly
 */
import { KoboService } from '../koboService'
import { readFileSync } from 'fs'

// Path to the real Kobo database file provided by user
const KOBO_DB_PATH = '/Users/upchen/Dropbox/01_Projects/15-KoboUp/db folders/up chen/KoboReader.sqlite'

describe('KoboService Integration Tests', () => {
  let koboFile: File

  beforeAll(async () => {
    try {
      // Read the actual Kobo database file
      const buffer = readFileSync(KOBO_DB_PATH)
      koboFile = new File([buffer], 'KoboReader.sqlite', {
        type: 'application/x-sqlite3'
      })

      console.log(`Loaded Kobo database file: ${koboFile.size} bytes`)
    } catch {
      console.warn('Real Kobo database file not found, skipping integration tests')
    }
  })

  afterAll(() => {
    // Clean up
    KoboService.clearStoredData()
  })

  describe('with real Kobo database', () => {
    it('should validate real Kobo database file', () => {
      if (!koboFile) {
        console.log('Skipping test - no database file available')
        return
      }

      const isValid = KoboService.isValidKoboDatabase(koboFile)
      expect(isValid).toBe(true)
    })

    it('should initialize database successfully', async () => {
      if (!koboFile) {
        console.log('Skipping test - no database file available')
        return
      }

      await expect(KoboService.initializeDatabase(koboFile)).resolves.not.toThrow()
      expect(KoboService.isDatabaseInitialized()).toBe(true)
    })

    it('should load books from real database', async () => {
      if (!koboFile) {
        console.log('Skipping test - no database file available')
        return
      }

      // Initialize database first
      await KoboService.initializeDatabase(koboFile)

      const books = await KoboService.loadBooksWithNotes()
      
      expect(Array.isArray(books)).toBe(true)
      expect(books.length).toBeGreaterThan(0)
      
      // Verify book structure
      const firstBook = books[0]
      expect(firstBook).toHaveProperty('contentId')
      expect(firstBook).toHaveProperty('title')
      expect(firstBook).toHaveProperty('totalHighlights')
      expect(firstBook).toHaveProperty('totalNotes')
      
      expect(typeof firstBook.contentId).toBe('string')
      expect(typeof firstBook.title).toBe('string')
      expect(typeof firstBook.totalHighlights).toBe('number')
      expect(typeof firstBook.totalNotes).toBe('number')

      console.log(`Found ${books.length} books in the database`)
      console.log('First book:', {
        title: firstBook.title,
        author: firstBook.author,
        highlights: firstBook.totalHighlights,
        notes: firstBook.totalNotes
      })
    })

    it('should load notes for a specific book', async () => {
      if (!koboFile) {
        console.log('Skipping test - no database file available')
        return
      }

      // Initialize and load books
      await KoboService.initializeDatabase(koboFile)
      const books = await KoboService.loadBooksWithNotes()
      
      // Find a book with notes
      const bookWithNotes = books.find(book => book.totalNotes > 0)
      
      if (bookWithNotes) {
        const notes = await KoboService.loadBookNotes(bookWithNotes.contentId)
        
        expect(Array.isArray(notes)).toBe(true)
        expect(notes.length).toBe(bookWithNotes.totalNotes)
        
        if (notes.length > 0) {
          const firstNote = notes[0]
          expect(firstNote).toHaveProperty('id')
          expect(firstNote).toHaveProperty('text')
          expect(firstNote).toHaveProperty('contentId')
          expect(firstNote).toHaveProperty('dateCreated')
          
          console.log(`Found ${notes.length} notes for book: ${bookWithNotes.title}`)
        }
      } else {
        console.log('No books with notes found in the database')
      }
    })

    it('should load highlights for a specific book', async () => {
      if (!koboFile) {
        console.log('Skipping test - no database file available')
        return
      }

      // Initialize and load books
      await KoboService.initializeDatabase(koboFile)
      const books = await KoboService.loadBooksWithNotes()
      
      // Find a book with highlights
      const bookWithHighlights = books.find(book => book.totalHighlights > 0)
      
      if (bookWithHighlights) {
        const highlights = await KoboService.loadBookHighlights(bookWithHighlights.contentId)
        
        expect(Array.isArray(highlights)).toBe(true)
        expect(highlights.length).toBe(bookWithHighlights.totalHighlights)
        
        if (highlights.length > 0) {
          const firstHighlight = highlights[0]
          expect(firstHighlight).toHaveProperty('id')
          expect(firstHighlight).toHaveProperty('text')
          expect(firstHighlight).toHaveProperty('contentId')
          expect(firstHighlight).toHaveProperty('dateCreated')
          
          console.log(`Found ${highlights.length} highlights for book: ${bookWithHighlights.title}`)
        }
      } else {
        console.log('No books with highlights found in the database')
      }
    })

    it('should persist database data in localStorage', async () => {
      if (!koboFile) {
        console.log('Skipping test - no database file available')
        return
      }

      await KoboService.initializeDatabase(koboFile)
      
      const storedData = localStorage.getItem('kobo-database')
      expect(storedData).toBeTruthy()
      expect(typeof storedData).toBe('string')
      
      console.log('Database data successfully stored in localStorage')
    })

    it('should initialize from stored data', async () => {
      if (!koboFile) {
        console.log('Skipping test - no database file available')
        return
      }

      // First initialize and store data
      await KoboService.initializeDatabase(koboFile)
      const originalBooks = await KoboService.loadBooksWithNotes()
      
      // Get stored data
      const storedData = localStorage.getItem('kobo-database')
      expect(storedData).toBeTruthy()
      
      // Close database and reinitialize from stored data
      KoboService.closeDatabase()
      expect(KoboService.isDatabaseInitialized()).toBe(false)
      
      await KoboService.initializeFromData(storedData!)
      expect(KoboService.isDatabaseInitialized()).toBe(true)
      
      // Verify data is the same
      const restoredBooks = await KoboService.loadBooksWithNotes()
      expect(restoredBooks.length).toBe(originalBooks.length)
      
      console.log('Successfully restored database from localStorage')
    })
  })
})