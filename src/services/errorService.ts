export enum ErrorType {
  DATABASE_ERROR = 'DATABASE_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NAVIGATION_ERROR = 'NAVIGATION_ERROR',
  EXPORT_ERROR = 'EXPORT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export class KoboError extends Error {
  public readonly type: ErrorType
  public readonly context?: Record<string, any>
  public readonly timestamp: Date

  constructor(
    message: string,
    type: ErrorType,
    context?: Record<string, any>
  ) {
    super(message)
    this.name = 'KoboError'
    this.type = type
    this.context = context
    this.timestamp = new Date()

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, KoboError)
    }
  }
}

export class ErrorService {
  /**
   * Handle database-related errors
   */
  static handleDatabaseError(error: Error, operation?: string): KoboError {
    const koboError = new KoboError(
      `Database ${operation || 'operation'} failed: ${error.message}`,
      ErrorType.DATABASE_ERROR,
      {
        operation,
        originalError: error.message
      }
    )

    this.logError(koboError)
    return koboError
  }

  /**
   * Handle file-related errors
   */
  static handleFileError(message: string, context?: Record<string, any>): KoboError {
    const koboError = new KoboError(message, ErrorType.FILE_ERROR, context)
    this.logError(koboError)
    return koboError
  }

  /**
   * Handle navigation-related errors
   */
  static handleNavigationError(route: string, message: string): KoboError {
    const koboError = new KoboError(
      message,
      ErrorType.NAVIGATION_ERROR,
      { route }
    )

    this.logError(koboError)
    return koboError
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(message: string, context?: Record<string, any>): KoboError {
    const koboError = new KoboError(message, ErrorType.VALIDATION_ERROR, context)
    this.logError(koboError)
    return koboError
  }

  /**
   * Handle export-related errors
   */
  static handleExportError(message: string, context?: Record<string, any>): KoboError {
    const koboError = new KoboError(message, ErrorType.EXPORT_ERROR, context)
    this.logError(koboError)
    return koboError
  }

  /**
   * Log error to console with proper formatting
   */
  static logError(error: KoboError | Error): void {
    if (this.isKoboError(error)) {
      console.error(
        `[KoboError] ${error.type}: ${error.message}`,
        error.context
      )
    } else {
      console.error('[Error]', error.message, error)
    }
  }

  /**
   * Check if error is a KoboError instance
   */
  static isKoboError(error: any): error is KoboError {
    return error instanceof KoboError
  }

  /**
   * Get user-friendly error message
   */
  static getErrorMessage(error: Error): string {
    if (!this.isKoboError(error)) {
      return error.message
    }

    switch (error.type) {
      case ErrorType.DATABASE_ERROR:
        return 'Unable to access the database. Please try uploading your file again.'
      
      case ErrorType.FILE_ERROR:
        return 'The selected file is not a valid Kobo database. Please select a .sqlite file from your Kobo device.'
      
      case ErrorType.VALIDATION_ERROR:
        return 'The provided data is invalid. Please check your input and try again.'
      
      case ErrorType.NAVIGATION_ERROR:
        return 'Navigation failed. Please try again or return to the home page.'
      
      case ErrorType.EXPORT_ERROR:
        return 'Export failed. Please try again or contact support if the problem persists.'
      
      case ErrorType.NETWORK_ERROR:
        return 'Network error. Please check your connection and try again.'
      
      default:
        return error.message
    }
  }

  /**
   * Create a standardized error response for UI components
   */
  static createErrorResponse(error: Error): {
    message: string
    type: string
    timestamp: Date
    context?: Record<string, any>
  } {
    return {
      message: this.getErrorMessage(error),
      type: this.isKoboError(error) ? error.type : 'UNKNOWN_ERROR',
      timestamp: new Date(),
      context: this.isKoboError(error) ? error.context : undefined
    }
  }
}