/**
 * @jest-environment jsdom
 */
/**
 * Verifies the delivered-value donation ask on the bulk file-export flow:
 * after a successful download, `ExportActionBar` shows a success confirmation
 * whose compact `DonationCard` is wired to fire `donate_click` with the
 * `donation_card_bulk_file_success` placement. This is the render-site
 * counterpart to `DonationCard.test.tsx`, which covers the card in isolation.
 *
 * The real `ExportActionBar` is rendered (not a re-implementation) so the
 * actual `handleExportConfirm` path runs, following the `window.dataLayer`
 * stubbing + `react-dom/client` style used across this repo's component tests.
 * `ExportService` is mocked so no real file is generated, and `next/navigation`
 * is mocked because `NotionOAuthReturnHandler` reads `useSearchParams`.
 */
import { act } from 'react-dom/test-utils'
import { createRoot, type Root } from 'react-dom/client'
import type { IBook } from '@/types/kobo'
import { ExportActionBar } from '../ExportActionBar'
import { ExportService } from '@/services/exportService'

jest.mock('next/navigation', () => ({
  // NotionOAuthReturnHandler only calls searchParams.get('notion'); no param here.
  useSearchParams: () => ({ get: () => null }),
}))

jest.mock('@/services/exportService', () => ({
  ExportService: {
    exportBooksAsZip: jest.fn(),
    exportBooksAsCombinedFile: jest.fn(),
  },
}))

/** Finds the first rendered button whose trimmed text matches `label`, searching the whole document (Headless UI dialogs render into a body portal). */
function findButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.body.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label
  ) as HTMLButtonElement | undefined
}

describe('ExportActionBar delivered-value donation ask', () => {
  let container: HTMLDivElement
  let root: Root

  const books: IBook[] = [
    { contentId: 'book-1', bookTitle: 'Book One', totalNotes: 3, totalHighlights: 0 } as IBook,
    { contentId: 'book-2', bookTitle: 'Book Two', totalNotes: 0, totalHighlights: 5 } as IBook,
  ]

  beforeEach(() => {
    window.dataLayer = []
    ;(ExportService.exportBooksAsZip as jest.Mock).mockResolvedValue(undefined)
    ;(ExportService.exportBooksAsCombinedFile as jest.Mock).mockResolvedValue(undefined)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('shows the compact donation card after a successful export and fires donate_click with donation_card_bulk_file_success', async () => {
    await act(async () => {
      root.render(
        <ExportActionBar books={books} selectedBooks={new Set()} onSelectionChange={() => {}} />
      )
    })

    // Open the export options modal, then confirm the download.
    await act(async () => {
      findButton('Export All')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(async () => {
      findButton('Download')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    // The success confirmation now carries the compact donation card.
    expect(document.body.textContent).toContain('has downloaded')
    const link = document.body.querySelector(
      'a[href="https://buymeacoffee.com/hi.upchen"]'
    ) as HTMLAnchorElement
    expect(link).not.toBeNull()

    await act(async () => {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(window.dataLayer).toContainEqual({
      event: 'donate_click',
      placement: 'donation_card_bulk_file_success',
    })
  })
})
