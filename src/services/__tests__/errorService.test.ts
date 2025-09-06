import { ErrorService, KoboError, ErrorType } from '../errorService'

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})

describe('ErrorService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    mockConsoleError.mockRestore()
    mockConsoleWarn.mockRestore()
  })

  describe('KoboError', () => {
    it('should create error with correct properties', () => {
      const error = new KoboError(
        'Test error message',
        ErrorType.DATABASE_ERROR,
        { detail: 'Additional info' }
      )

      expect(error.message).toBe('Test error message')
      expect(error.type).toBe(ErrorType.DATABASE_ERROR)
      expect(error.context).toEqual({ detail: 'Additional info' })
      expect(error.timestamp).toBeInstanceOf(Date)
      expect(error.name).toBe('KoboError')
    })

    it('should create error without context', () => {
      const error = new KoboError('Test error', ErrorType.VALIDATION_ERROR)

      expect(error.context).toBeUndefined()
    })
  })

  describe('handleDatabaseError', () => {
    it('should handle database initialization errors', () => {
      const originalError = new Error('Database connection failed')
      const result = ErrorService.handleDatabaseError(originalError, 'initialization')

      expect(result).toBeInstanceOf(KoboError)
      expect(result.type).toBe(ErrorType.DATABASE_ERROR)
      expect(result.message).toContain('Database initialization failed')
      expect(result.context).toEqual({
        operation: 'initialization',
        originalError: originalError.message
      })
      expect(mockConsoleError).toHaveBeenCalled()
    })

    it('should handle database query errors', () => {
      const originalError = new Error('SQL syntax error')
      const result = ErrorService.handleDatabaseError(originalError, 'query')

      expect(result.type).toBe(ErrorType.DATABASE_ERROR)
      expect(result.message).toContain('Database query failed')
    })
  })

  describe('handleFileError', () => {
    it('should handle file validation errors', () => {
      const result = ErrorService.handleFileError('Invalid file format')

      expect(result).toBeInstanceOf(KoboError)
      expect(result.type).toBe(ErrorType.FILE_ERROR)
      expect(result.message).toBe('Invalid file format')
    })

    it('should handle file size errors', () => {
      const result = ErrorService.handleFileError('File too large', { size: 200000000 })

      expect(result.context).toEqual({ size: 200000000 })
    })
  })

  describe('handleNavigationError', () => {
    it('should handle navigation errors', () => {
      const result = ErrorService.handleNavigationError('/invalid-route', 'Route not found')

      expect(result).toBeInstanceOf(KoboError)
      expect(result.type).toBe(ErrorType.NAVIGATION_ERROR)
      expect(result.context).toEqual({ route: '/invalid-route' })
    })
  })

  describe('logError', () => {
    it('should log error to console with context', () => {
      const error = new KoboError('Test error', ErrorType.VALIDATION_ERROR, { field: 'email' })

      ErrorService.logError(error)

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[KoboError] VALIDATION_ERROR: Test error',
        { field: 'email' }
      )
    })

    it('should log error without context', () => {
      const error = new KoboError('Simple error', ErrorType.EXPORT_ERROR)

      ErrorService.logError(error)

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[KoboError] EXPORT_ERROR: Simple error',
        undefined
      )
    })
  })

  describe('isKoboError', () => {
    it('should return true for KoboError instances', () => {
      const error = new KoboError('Test', ErrorType.DATABASE_ERROR)
      expect(ErrorService.isKoboError(error)).toBe(true)
    })

    it('should return false for regular errors', () => {
      const error = new Error('Regular error')
      expect(ErrorService.isKoboError(error)).toBe(false)
    })

    it('should return false for non-error objects', () => {
      expect(ErrorService.isKoboError('string')).toBe(false)
      expect(ErrorService.isKoboError(null)).toBe(false)
    })
  })

  describe('getErrorMessage', () => {
    it('should return user-friendly message for known error types', () => {
      const dbError = new KoboError('SQL error', ErrorType.DATABASE_ERROR)
      expect(ErrorService.getErrorMessage(dbError)).toBe(
        'Unable to access the database. Please try uploading your file again.'
      )

      const fileError = new KoboError('Invalid file', ErrorType.FILE_ERROR)
      expect(ErrorService.getErrorMessage(fileError)).toBe(
        'The selected file is not a valid Kobo database. Please select a .sqlite file from your Kobo device.'
      )
    })

    it('should return original message for regular errors', () => {
      const error = new Error('Regular error message')
      expect(ErrorService.getErrorMessage(error)).toBe('Regular error message')
    })

    it('should handle unknown error types', () => {
      const unknownError = new KoboError('Unknown', 'UNKNOWN_TYPE' as ErrorType)
      expect(ErrorService.getErrorMessage(unknownError)).toBe('Unknown')
    })
  })
})