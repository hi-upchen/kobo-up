/**
 * @jest-environment jsdom
 */
/**
 * Proves that free users export up to 10 books with no Pro prompt,
 * and that the pro_limit_shown event fires only when a limit is truly hit.
 * The real ExportActionBar runs. Only the export service and the license hook are mocked.
 */
import { act } from 'react-dom/test-utils'
import { createRoot, type Root } from 'react-dom/client'
import type { IBook } from '@/types/kobo'
import { ExportActionBar } from '../ExportActionBar'
import { useHasProLicense } from '@/lib/pro/licenseClient'

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}))
jest.mock('@/services/exportService', () => ({
  ExportService: { exportBooksAsZip: jest.fn(), exportBooksAsCombinedFile: jest.fn() },
}))
jest.mock('@/lib/pro/licenseClient', () => ({
  useHasProLicense: jest.fn(),
}))
jest.mock('@/components/LicenseEntry', () => ({ LicenseEntry: () => null }))

function findButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.body.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label
  ) as HTMLButtonElement | undefined
}

function makeBooks(count: number): IBook[] {
  return Array.from({ length: count }, (_, i) => ({
    contentId: `book-${i}`,
    bookTitle: `Book ${i}`,
    totalNotes: 1,
    totalHighlights: 1,
  })) as IBook[]
}

const limitEvents = () =>
  (window.dataLayer ?? []).filter((e: { event?: string }) => e.event === 'pro_limit_shown')

describe('ExportActionBar Pro limit', () => {
  let container: HTMLDivElement
  let root: Root

  async function renderBar(books: IBook[], selected: string[] = []) {
    await act(async () => {
      root.render(
        <ExportActionBar books={books} selectedBooks={new Set(selected)} onSelectionChange={() => {}} />
      )
    })
  }
  async function click(label: string) {
    await act(async () => {
      findButton(label)!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  }

  beforeEach(() => {
    window.dataLayer = []
    ;(useHasProLicense as jest.Mock).mockReturnValue(false)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('renders the bar and loads a library without any Pro event', async () => {
    await renderBar(makeBooks(25))
    expect(limitEvents()).toHaveLength(0)
    expect(document.body.textContent).not.toContain('Pro feature')
  })

  it('opens the export options for exactly 10 books with no Pro prompt', async () => {
    await renderBar(makeBooks(10))
    await click('Export All')
    expect(document.body.textContent).toContain('10 books with notes or highlights')
    expect(document.body.textContent).not.toContain('Pro feature')
    expect(limitEvents()).toHaveLength(0)
  })

  it('exports a 10-book selection out of a larger library with no Pro prompt', async () => {
    const books = makeBooks(25)
    await renderBar(books, books.slice(0, 10).map((b) => b.contentId))
    await click('Export')
    expect(document.body.textContent).not.toContain('Pro feature')
    expect(limitEvents()).toHaveLength(0)
  })

  it('shows the prompt and fires pro_limit_shown once for 11 selected books', async () => {
    const books = makeBooks(25)
    await renderBar(books, books.slice(0, 11).map((b) => b.contentId))
    await click('Export')
    expect(document.body.textContent).toContain('Bulk export of more than 10 books is a Pro feature')
    expect(limitEvents()).toEqual([{ event: 'pro_limit_shown', limit: 'bulk' }])
  })

  it('fires pro_limit_shown when Export All covers more than 10 books', async () => {
    await renderBar(makeBooks(11))
    await click('Export All')
    expect(limitEvents()).toHaveLength(1)
  })

  it('never fires or prompts for a Pro license holder, even with 25 books', async () => {
    ;(useHasProLicense as jest.Mock).mockReturnValue(true)
    await renderBar(makeBooks(25))
    await click('Export All')
    expect(document.body.textContent).not.toContain('Pro feature')
    expect(limitEvents()).toHaveLength(0)
  })
})
