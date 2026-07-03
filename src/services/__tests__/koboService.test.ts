import { KoboService } from '../koboService'
import { APP_CONSTANTS } from '../../constants/appConstants'
import * as KoboDB from '../../models/KoboDB'

// Mock the KoboDB module
jest.mock('../../models/KoboDB')

// Mock File constructor for testing
const mockFile = (name: string, size: number = 1000) => ({
  name,
  size,
  type: 'application/x-sqlite3'
} as File)

describe('KoboService', () => {
  describe('isValidKoboDatabase', () => {
    it('should return true for files with .sqlite extension', () => {
      const file = mockFile('KoboReader.sqlite')
      expect(KoboService.isValidKoboDatabase(file)).toBe(true)
    })

    it('should return true for files with .db extension', () => {
      const file = mockFile('KoboReader.db')
      expect(KoboService.isValidKoboDatabase(file)).toBe(true)
    })

    it('should return false for files with other extensions', () => {
      const file = mockFile('document.pdf')
      expect(KoboService.isValidKoboDatabase(file)).toBe(false)
    })

    it('should return false for files exceeding max size', () => {
      const file = mockFile('KoboReader.sqlite', APP_CONSTANTS.MAX_FILE_SIZE + 1)
      expect(KoboService.isValidKoboDatabase(file)).toBe(false)
    })

    it('should return true for files within size limit', () => {
      const file = mockFile('KoboReader.sqlite', APP_CONSTANTS.MAX_FILE_SIZE - 1)
      expect(KoboService.isValidKoboDatabase(file)).toBe(true)
    })
  })

  describe('getFileExtension', () => {
    it('should extract file extension correctly', () => {
      expect(KoboService.getFileExtension('file.sqlite')).toBe('.sqlite')
      expect(KoboService.getFileExtension('file.db')).toBe('.db')
      expect(KoboService.getFileExtension('file.txt')).toBe('.txt')
    })

    it('should handle files without extensions', () => {
      expect(KoboService.getFileExtension('file')).toBe('')
    })

    it('should handle empty strings', () => {
      expect(KoboService.getFileExtension('')).toBe('')
    })
  })

  describe('validateFileSize', () => {
    it('should return true for files within size limit', () => {
      const file = mockFile('test.sqlite', 1000)
      expect(KoboService.validateFileSize(file)).toBe(true)
    })

    it('should return false for files exceeding size limit', () => {
      const file = mockFile('test.sqlite', APP_CONSTANTS.MAX_FILE_SIZE + 1)
      expect(KoboService.validateFileSize(file)).toBe(false)
    })

    it('should return true for files at exact size limit', () => {
      const file = mockFile('test.sqlite', APP_CONSTANTS.MAX_FILE_SIZE)
      expect(KoboService.validateFileSize(file)).toBe(true)
    })
  })

  describe('isDatabaseInitialized', () => {
    it('should return true when database is initialized', () => {
      // Set up database mock
      ;(KoboService as { database: unknown }).database = {}
      expect(KoboService.isDatabaseInitialized()).toBe(true)
    })

    it('should return false when database is null', () => {
      ;(KoboService as { database: unknown }).database = null
      expect(KoboService.isDatabaseInitialized()).toBe(false)
    })
  })

  describe('loadBookDetails', () => {
    const mockBook = {
      contentId: 'test-book-id',
      title: 'Test Book',
      author: 'Test Author',
      subtitle: 'Test Subtitle'
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should return book details when database is initialized', async () => {
      ;(KoboService as { database: unknown }).database = {}
      ;(KoboDB.getBook as jest.Mock).mockResolvedValue(mockBook)

      const result = await KoboService.loadBookDetails('test-book-id')
      
      expect(result).toEqual(mockBook)
      expect(KoboDB.getBook).toHaveBeenCalledWith({}, 'test-book-id')
    })

    it('should throw error when database is not initialized', async () => {
      ;(KoboService as { database: unknown }).database = null

      await expect(KoboService.loadBookDetails('test-book-id'))
        .rejects
        .toThrow('Database not initialized')
    })

    it('should return null when book is not found', async () => {
      ;(KoboService as { database: unknown }).database = {}
      ;(KoboDB.getBook as jest.Mock).mockResolvedValue(null)

      const result = await KoboService.loadBookDetails('non-existent-id')
      
      expect(result).toBeNull()
    })
  })

  describe('loadBookAnnotations', () => {
    const mockAnnotations = [
      { bookmarkId: '1', text: 'Note 1', annotation: 'Annotation 1' },
      { bookmarkId: '2', text: 'Note 2', annotation: 'Annotation 2' }
    ]

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should return book annotations when database is initialized', async () => {
      ;(KoboService as { database: unknown }).database = {}
      ;(KoboDB.getHighlightNAnnotationList as jest.Mock).mockResolvedValue(mockAnnotations)

      const result = await KoboService.loadBookAnnotations('test-book-id')
      
      expect(result).toEqual(mockAnnotations)
      expect(KoboDB.getHighlightNAnnotationList).toHaveBeenCalledWith({}, 'test-book-id')
    })

    it('should throw error when database is not initialized', async () => {
      ;(KoboService as { database: unknown }).database = null

      await expect(KoboService.loadBookAnnotations('test-book-id'))
        .rejects
        .toThrow('Database not initialized')
    })

    it('should return empty array when no annotations found', async () => {
      ;(KoboService as { database: unknown }).database = {}
      ;(KoboDB.getHighlightNAnnotationList as jest.Mock).mockResolvedValue([])

      const result = await KoboService.loadBookAnnotations('test-book-id')
      
      expect(result).toEqual([])
    })
  })

  describe('loadBookChaptersWithNotes', () => {
    const mockChapters = [
      { contentId: 'chapter-1', title: 'Chapter 1', notes: [] },
      { contentId: 'chapter-2', title: 'Chapter 2', notes: [] }
    ]

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should return book chapters with notes when database is initialized', async () => {
      ;(KoboService as { database: unknown }).database = {}
      ;(KoboDB.getChaptersWithNotes as jest.Mock).mockResolvedValue(mockChapters)

      const result = await KoboService.loadBookChaptersWithNotes('test-book-id')
      
      expect(result).toEqual(mockChapters)
      expect(KoboDB.getChaptersWithNotes).toHaveBeenCalledWith({}, 'test-book-id')
    })

    it('should throw error when database is not initialized', async () => {
      ;(KoboService as { database: unknown }).database = null

      await expect(KoboService.loadBookChaptersWithNotes('test-book-id'))
        .rejects
        .toThrow('Database not initialized')
    })

    it('should return empty array when no chapters found', async () => {
      ;(KoboService as { database: unknown }).database = {}
      ;(KoboDB.getChaptersWithNotes as jest.Mock).mockResolvedValue([])

      const result = await KoboService.loadBookChaptersWithNotes('test-book-id')

      expect(result).toEqual([])
    })
  })

  describe('hasStoredData', () => {
    it('should return false when indexedDB is not available', async () => {
      // Jest environment has no indexedDB, so this tests the SSR guard
      const result = await KoboService.hasStoredData()
      expect(result).toBe(false)
    })

    it('should return false when IndexedDB open fails', async () => {
      const originalIndexedDB = globalThis.indexedDB
      // Mock indexedDB with a failing open
      const mockOpen = {
        onerror: null as ((event: unknown) => void) | null,
        onsuccess: null as ((event: unknown) => void) | null,
        onupgradeneeded: null as ((event: unknown) => void) | null,
      }
      globalThis.indexedDB = {
        open: () => {
          setTimeout(() => mockOpen.onerror?.({}), 0)
          return mockOpen
        },
      } as unknown as IDBFactory

      const result = await KoboService.hasStoredData()
      expect(result).toBe(false)

      globalThis.indexedDB = originalIndexedDB
    })
  })

  describe('getBookCount', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should return null when database is not initialized', async () => {
      ;(KoboService as { database: unknown }).database = null
      expect(await KoboService.getBookCount()).toBeNull()
    })

    it('should return the number of books from a single getBookList query', async () => {
      ;(KoboService as { database: unknown }).database = {}
      ;(KoboDB.getBookList as jest.Mock).mockResolvedValue([{ contentId: '1' }, { contentId: '2' }, { contentId: '3' }])

      expect(await KoboService.getBookCount()).toBe(3)
      expect(KoboDB.getBookList).toHaveBeenCalledTimes(1)
    })

    it('should return null when the query fails, without throwing', async () => {
      ;(KoboService as { database: unknown }).database = {}
      ;(KoboDB.getBookList as jest.Mock).mockRejectedValue(new Error('query failed'))

      await expect(KoboService.getBookCount()).resolves.toBeNull()
    })
  })

  describe('consumeLoadedTransition', () => {
    beforeEach(() => {
      // Reset the private one-shot gate directly, since it has no public
      // setter other than clearStoredData (exercised in its own test below).
      ;(KoboService as unknown as { hasFiredLoadedEvent: boolean }).hasFiredLoadedEvent = false
      // A prior describe block in this file may have left `database` set to
      // a plain object with no `.close()` method; clear it so
      // `clearStoredData`'s internal `closeDatabase()` call doesn't throw.
      ;(KoboService as { database: unknown }).database = null
    })

    it('should return true on the first call and false on every call after', () => {
      expect(KoboService.consumeLoadedTransition()).toBe(true)
      expect(KoboService.consumeLoadedTransition()).toBe(false)
      expect(KoboService.consumeLoadedTransition()).toBe(false)
    })

    it('should return true again after clearStoredData resets the gate', async () => {
      expect(KoboService.consumeLoadedTransition()).toBe(true)
      expect(KoboService.consumeLoadedTransition()).toBe(false)

      await KoboService.clearStoredData()

      expect(KoboService.consumeLoadedTransition()).toBe(true)
    })
  })
})