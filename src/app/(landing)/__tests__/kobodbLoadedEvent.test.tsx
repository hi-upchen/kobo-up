/**
 * @jest-environment jsdom
 */
/**
 * Verifies that selecting a Kobo database file on the landing page fires a
 * `kobodb_loaded` activation event exactly once, right after the database
 * is confirmed usable, and that a failed load does not fire it at all.
 * This is the funnel's activation signal — the previously-instrumented
 * `export_complete`/`donate_click` events downstream are unmeasurable as a
 * conversion funnel without this step.
 *
 * The real `LandingPage` component is rendered (not a re-implementation)
 * so the actual `handleDatabaseSelect` code path runs, following the
 * `window.dataLayer` stubbing style from `DonationCard.test.tsx`. In this
 * jsdom environment neither `showDirectoryPicker` nor `webkitdirectory` are
 * available, so `DatabaseSelector` renders its file-only fallback input —
 * this test exercises that path, which fires `method: 'file_upload'`. The
 * folder-picker paths (File System Access API and `webkitdirectory`) share
 * this exact same success/failure firing logic inside `handleDatabaseSelect`
 * but require real browser folder-picker APIs jsdom does not provide, so
 * those are verified by reading the code rather than by this test (see the
 * PR description for which paths are unit-verified vs. code-traced).
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
  },
}))

describe('LandingPage kobodb_loaded activation event', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    // Stub the dataLayer the same way GTM would provide it in a real page.
    window.dataLayer = []
    ;(KoboService.hasStoredData as jest.Mock).mockResolvedValue(false)
    ;(KoboService.consumeLoadedTransition as jest.Mock).mockReturnValue(true)
    ;(KoboService.getBookCount as jest.Mock).mockResolvedValue(12)
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

  /** Simulates picking `file` via the rendered file-only `<input type="file">`. */
  const selectFile = async (file: File) => {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
      // Flush the microtask queue so handleDatabaseSelect's awaits resolve.
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  it('fires kobodb_loaded with method file_upload and book_count after a successful load', async () => {
    ;(KoboService.initializeDatabase as jest.Mock).mockResolvedValue(undefined)

    await act(async () => {
      root.render(<LandingPage />)
    })

    const file = new File(['sqlite bytes'], 'KoboReader.sqlite')
    await selectFile(file)

    expect(window.dataLayer).toContainEqual({ event: 'kobodb_loaded', method: 'file_upload', book_count: 12 })
    expect(KoboService.consumeLoadedTransition).toHaveBeenCalledTimes(1)
  })

  it('does not fire kobodb_loaded when the database fails to initialize', async () => {
    ;(KoboService.initializeDatabase as jest.Mock).mockRejectedValue(new Error('not a kobo database'))

    await act(async () => {
      root.render(<LandingPage />)
    })

    const file = new File(['not a real db'], 'not-a-db.sqlite')
    await selectFile(file)

    expect(window.dataLayer).toEqual([])
    expect(KoboService.consumeLoadedTransition).not.toHaveBeenCalled()
  })
})
