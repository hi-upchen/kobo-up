import { useRouter } from 'next/navigation'
import { ROUTES, APP_CONSTANTS } from '../constants/appConstants'

type AppRouterInstance = ReturnType<typeof useRouter>

export class NavigationService {
  /**
   * Navigate to the books listing page
   */
  static navigateToBooks(router: AppRouterInstance): void {
    router.push(ROUTES.BOOKS)
  }

  /**
   * Navigate to the landing page
   */
  static navigateToLanding(router: AppRouterInstance, options?: { reupload?: boolean }): void {
    if (options?.reupload) {
      router.push(`${ROUTES.LANDING}?reupload=true`)
    } else {
      router.push(ROUTES.LANDING)
    }
  }

  /**
   * Navigate to a specific book's detail page
   */
  static navigateToBookDetail(router: AppRouterInstance, contentId: string): void {
    const route = this.generateBookDetailRoute(contentId)
    router.push(route)
  }

  /**
   * Redirect to a path after a specified delay
   */
  static redirectWithDelay(
    router: AppRouterInstance, 
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