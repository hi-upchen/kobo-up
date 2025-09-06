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
})