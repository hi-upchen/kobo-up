import { NavigationService } from '../navigationService'
import { ROUTES } from '../../constants/appConstants'

// Mock Next.js router
const mockPush = jest.fn()
const mockRouter = {
  push: mockPush,
  pathname: '/',
  query: {},
  asPath: '/'
} as const

describe('NavigationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('navigateToBooks', () => {
    it('should navigate to books page', () => {
      NavigationService.navigateToBooks(mockRouter as Parameters<typeof NavigationService.navigateToBooks>[0])
      expect(mockPush).toHaveBeenCalledWith(ROUTES.BOOKS)
    })
  })

  describe('navigateToLanding', () => {
    it('should navigate to landing page', () => {
      NavigationService.navigateToLanding(mockRouter as Parameters<typeof NavigationService.navigateToLanding>[0])
      expect(mockPush).toHaveBeenCalledWith(ROUTES.LANDING)
    })
  })

  describe('navigateToBookDetail', () => {
    it('should navigate to book detail page with encoded contentId', () => {
      const contentId = 'test-book-id'
      NavigationService.navigateToBookDetail(mockRouter as Parameters<typeof NavigationService.navigateToBookDetail>[0], contentId)
      expect(mockPush).toHaveBeenCalledWith(ROUTES.BOOK_DETAIL(contentId))
    })

    it('should properly encode contentId with special characters', () => {
      const contentId = 'test book/with spaces & symbols'
      NavigationService.navigateToBookDetail(mockRouter as Parameters<typeof NavigationService.navigateToBookDetail>[0], contentId)
      expect(mockPush).toHaveBeenCalledWith(ROUTES.BOOK_DETAIL(contentId))
    })
  })

  describe('redirectWithDelay', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should redirect after specified delay', () => {
      const path = '/test-path'
      const delay = 1000

      NavigationService.redirectWithDelay(mockRouter as Parameters<typeof NavigationService.redirectWithDelay>[0], path, delay)

      // Should not call immediately
      expect(mockPush).not.toHaveBeenCalled()

      // Fast forward time
      jest.advanceTimersByTime(delay)

      // Should call after delay
      expect(mockPush).toHaveBeenCalledWith(path)
    })

    it('should redirect with default delay if not specified', () => {
      const path = '/test-path'

      NavigationService.redirectWithDelay(mockRouter as Parameters<typeof NavigationService.redirectWithDelay>[0], path)

      // Fast forward by default delay (3000ms from constants)
      jest.advanceTimersByTime(3000)

      expect(mockPush).toHaveBeenCalledWith(path)
    })
  })

  describe('generateBookDetailRoute', () => {
    it('should generate correct book detail route', () => {
      const contentId = 'test-book-id'
      const route = NavigationService.generateBookDetailRoute(contentId)
      expect(route).toBe(ROUTES.BOOK_DETAIL(contentId))
    })

    it('should handle special characters in contentId', () => {
      const contentId = 'test book/with spaces'
      const route = NavigationService.generateBookDetailRoute(contentId)
      expect(route).toBe(`/book/${encodeURIComponent(contentId)}/notes`)
    })
  })
})