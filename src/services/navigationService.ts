import type { NextRouter } from 'next/router'
import { ROUTES, APP_CONSTANTS } from '../constants/appConstants'

export class NavigationService {
  /**
   * Navigate to the books listing page
   */
  static navigateToBooks(router: NextRouter): void {
    router.push(ROUTES.BOOKS)
  }

  /**
   * Navigate to the landing page
   */
  static navigateToLanding(router: NextRouter, options?: { reupload?: boolean }): void {
    if (options?.reupload) {
      router.push(`${ROUTES.LANDING}?reupload=true`)
    } else {
      router.push(ROUTES.LANDING)
    }
  }

  /**
   * Navigate to a specific book's detail page
   */
  static navigateToBookDetail(router: NextRouter, contentId: string): void {
    const route = this.generateBookDetailRoute(contentId)
    router.push(route)
  }

  /**
   * Redirect to a path after a specified delay
   */
  static redirectWithDelay(
    router: NextRouter, 
    path: string, 
    delay: number = APP_CONSTANTS.REDIRECT_DELAY_MS
  ): void {
    setTimeout(() => {
      router.push(path)
    }, delay)
  }

  /**
   * Generate book detail route with properly encoded contentId
   */
  static generateBookDetailRoute(contentId: string): string {
    return ROUTES.BOOK_DETAIL(contentId)
  }
}