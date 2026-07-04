/**
 * @jest-environment jsdom
 */
/**
 * Verifies the landing page's "Try with a sample library" secondary CTA
 * (`handleTryDemo`): clicking it fetches the demo database, loads it
 * through `handleDatabaseSelect` tagged as `'demo'`, marks the demo flag,
 * and fires `kobodb_loaded` with `method: 'demo'` exactly once — mirroring
 * `kobodbLoadedEvent.test.tsx`'s verification of the real-upload paths, but
 * for the no-signup sample-library entry point this PR adds.
 *
 * The real `LandingPage` component is rendered so the actual `handleTryDemo`
 * code path runs; `KoboService` is mocked so this test doesn't depend on
 * sql.js/WASM or IndexedDB, matching the existing test's approach.
 */
import { act } from 'react-dom/test-utils'
import { createRoot, type Root } from 'react-dom/client'
import LandingPage from '../page'
import { KoboService } from '@/services/koboService'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@/services/koboService', () => ({
  KoboService: {
    hasStoredData: jest.fn(),
    initializeDatabase: jest.fn(),
    consumeLoadedTransition: jest.fn(),
    getBookCount: jest.fn(),
    fetchDemoFile: jest.fn(),
    markAsDemoData: jest.fn(),
  },
}))

describe('LandingPage demo mode', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    window.dataLayer = []
    ;(KoboService.hasStoredData as jest.Mock).mockResolvedValue(false)
    ;(KoboService.consumeLoadedTransition as jest.Mock).mockReturnValue(true)
    ;(KoboService.getBookCount as jest.Mock).mockResolvedValue(4)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    jest.clearAllMocks()
  })

  /** Finds and clicks the secondary "Try with a sample library" text link. */
  const clickTryDemo = async () => {
    const buttons = Array.from(container.querySelectorAll('button'))
    const demoButton = buttons.find(b => b.textContent?.includes('Try with a sample library'))
    expect(demoButton).toBeDefined()

    await act(async () => {
      demoButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  it('fires kobodb_loaded with method demo and marks the flag after a successful demo load', async () => {
    const demoFile = new File(['sqlite bytes'], 'KoboReader-demo.sqlite')
    ;(KoboService.fetchDemoFile as jest.Mock).mockResolvedValue(demoFile)
    ;(KoboService.initializeDatabase as jest.Mock).mockResolvedValue(undefined)

    await act(async () => {
      root.render(<LandingPage />)
    })

    await clickTryDemo()

    expect(KoboService.fetchDemoFile).toHaveBeenCalledTimes(1)
    expect(KoboService.initializeDatabase).toHaveBeenCalledWith(demoFile)
    expect(KoboService.markAsDemoData).toHaveBeenCalledTimes(1)
    expect(window.dataLayer).toContainEqual({ event: 'kobodb_loaded', method: 'demo', book_count: 4 })
  })

  it('does not mark the demo flag or fire kobodb_loaded when fetching the demo file fails', async () => {
    ;(KoboService.fetchDemoFile as jest.Mock).mockRejectedValue(new Error('network error'))

    await act(async () => {
      root.render(<LandingPage />)
    })

    await clickTryDemo()

    expect(KoboService.initializeDatabase).not.toHaveBeenCalled()
    expect(KoboService.markAsDemoData).not.toHaveBeenCalled()
    expect(window.dataLayer).toEqual([])
  })
})
