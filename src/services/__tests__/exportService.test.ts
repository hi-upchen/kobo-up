import { ExportService } from '../exportService'
import type { IBook } from '../../types/kobo'

// Mock sample books for testing
const mockBooks: IBook[] = [
  {
    contentId: 'book-1',
    title: 'Test Book 1',
    author: 'Author 1',
    totalHighlights: 5,
    totalNotes: 3,
    dateCreated: '2024-01-01'
  },
  {
    contentId: 'book-2',
    title: 'Test Book 2',
    author: 'Author 2',
    totalHighlights: 2,
    totalNotes: 1,
    dateCreated: '2024-01-02'
  }
]

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = jest.fn()
Object.defineProperty(global, 'URL', {
  writable: true,
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL
  }
})

// Mock document.createElement and related DOM methods
const mockClick = jest.fn()
const mockAppendChild = jest.fn()
const mockRemoveChild = jest.fn()
const mockElement = {
  href: '',
  download: '',
  click: mockClick
}

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: jest.fn(() => mockElement)
})

Object.defineProperty(document.body, 'appendChild', {
  writable: true,
  value: mockAppendChild
})

Object.defineProperty(document.body, 'removeChild', {
  writable: true,
  value: mockRemoveChild
})

describe('ExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateMarkdown', () => {
    it('should generate markdown for books list', () => {
      const markdown = ExportService.generateMarkdown(mockBooks)
      
      expect(markdown).toContain('# Kobo Books Export')
      expect(markdown).toContain('## Test Book 1')
      expect(markdown).toContain('**Author:** Author 1')
      expect(markdown).toContain('**Highlights:** 5')
      expect(markdown).toContain('**Notes:** 3')
      expect(markdown).toContain('## Test Book 2')
    })

    it('should handle books without authors', () => {
      const booksWithoutAuthor: IBook[] = [{
        contentId: 'book-3',
        title: 'Book Without Author',
        totalHighlights: 1,
        totalNotes: 0,
        dateCreated: '2024-01-03'
      }]

      const markdown = ExportService.generateMarkdown(booksWithoutAuthor)
      expect(markdown).toContain('## Book Without Author')
      expect(markdown).toContain('**Author:** Unknown')
    })

    it('should return empty content for empty books array', () => {
      const markdown = ExportService.generateMarkdown([])
      expect(markdown).toContain('# Kobo Books Export')
      expect(markdown).toContain('No books found')
    })
  })

  describe('generateJson', () => {
    it('should generate valid JSON string', () => {
      const json = ExportService.generateJson(mockBooks)
      const parsed = JSON.parse(json)
      
      expect(parsed).toHaveProperty('exportDate')
      expect(parsed).toHaveProperty('totalBooks', 2)
      expect(parsed).toHaveProperty('books')
      expect(parsed.books).toHaveLength(2)
      expect(parsed.books[0]).toMatchObject(mockBooks[0])
    })

    it('should include metadata in JSON export', () => {
      const json = ExportService.generateJson(mockBooks)
      const parsed = JSON.parse(json)
      
      expect(parsed.metadata).toMatchObject({
        version: '1.0',
        source: 'KoboUp',
        totalBooks: 2,
        totalHighlights: 7,
        totalNotes: 4
      })
    })
  })

  describe('downloadFile', () => {
    it('should trigger file download with correct parameters', () => {
      const content = 'test content'
      const filename = 'test.txt'
      
      ExportService.downloadFile(content, filename)
      
      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob))
      expect(mockElement.download).toBe(filename)
      expect(mockElement.href).toBe('blob:mock-url')
      expect(mockAppendChild).toHaveBeenCalledWith(mockElement)
      expect(mockClick).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalledWith(mockElement)
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should create blob with correct MIME type for different file types', () => {
      ExportService.downloadFile('content', 'test.json')
      
      // Check that Blob was created with correct type
      const blobCall = mockCreateObjectURL.mock.calls[0][0]
      expect(blobCall.type).toBe('application/json')
    })
  })

  describe('getBlobType', () => {
    it('should return correct MIME type for different extensions', () => {
      expect(ExportService.getBlobType('file.json')).toBe('application/json')
      expect(ExportService.getBlobType('file.md')).toBe('text/markdown')
      expect(ExportService.getBlobType('file.txt')).toBe('text/plain')
      expect(ExportService.getBlobType('file.unknown')).toBe('text/plain')
    })
  })

  describe('exportBooksToMarkdown', () => {
    it('should export books as markdown file', () => {
      ExportService.exportBooksToMarkdown(mockBooks)
      
      expect(mockElement.download).toMatch(/^kobo-books-export-.*\.md$/)
      expect(mockClick).toHaveBeenCalled()
    })
  })

  describe('exportBooksToJson', () => {
    it('should export books as JSON file', () => {
      ExportService.exportBooksToJson(mockBooks)
      
      expect(mockElement.download).toMatch(/^kobo-books-export-.*\.json$/)
      expect(mockClick).toHaveBeenCalled()
    })
  })
})