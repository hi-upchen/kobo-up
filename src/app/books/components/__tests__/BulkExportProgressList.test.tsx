/**
 * @jest-environment jsdom
 */
/**
 * Verifies that `BulkExportProgressList` renders the overall "book N of M"
 * line and a status marker per book for each state the bulk export
 * orchestrator can report (pending, exporting, success, failed, skipped).
 *
 * No React Testing Library dependency is available in this repo (see
 * `src/components/__tests__/DonationCard.test.tsx`), so the component is
 * rendered directly with `react-dom/client` inside `act()`.
 */
import { act } from 'react-dom/test-utils'
import { createRoot, type Root } from 'react-dom/client'
import { BulkExportProgressList, type BulkExportBookStatus } from '../BulkExportProgressList'

describe('BulkExportProgressList', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
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

  const books: BulkExportBookStatus[] = [
    { contentId: 'a', bookTitle: 'Book A', state: 'success' },
    { contentId: 'b', bookTitle: 'Book B', state: 'failed', error: 'Notion API error' },
    { contentId: 'c', bookTitle: 'Book C', state: 'exporting', stage: 'Uploading images' },
    { contentId: 'd', bookTitle: 'Book D', state: 'pending' },
    { contentId: 'e', bookTitle: 'Book E', state: 'skipped' },
  ]

  it('shows the overall "book N of M" progress line', () => {
    act(() => {
      root.render(<BulkExportProgressList books={books} settledCount={2} total={5} />)
    })

    // settledCount=2 (a, b already settled) means book 3 ('c') is the one in flight.
    expect(container.textContent).toContain('Exporting book 3 of 5')
  })

  it('renders one list row per book, in the given order', () => {
    act(() => {
      root.render(<BulkExportProgressList books={books} settledCount={2} total={5} />)
    })

    const rows = container.querySelectorAll('li')
    expect(rows.length).toBe(5)
    expect(rows[0].textContent).toContain('Book A')
    expect(rows[1].textContent).toContain('Book B')
    expect(rows[2].textContent).toContain('Book C')
    expect(rows[3].textContent).toContain('Book D')
    expect(rows[4].textContent).toContain('Book E')
  })

  it('shows the failure reason for a failed book', () => {
    act(() => {
      root.render(<BulkExportProgressList books={books} settledCount={2} total={5} />)
    })

    const failedRow = Array.from(container.querySelectorAll('li')).find((li) => li.textContent?.includes('Book B'))
    expect(failedRow?.textContent).toContain('Notion API error')
  })

  it('shows the current stage for the book actively exporting', () => {
    act(() => {
      root.render(<BulkExportProgressList books={books} settledCount={2} total={5} />)
    })

    const exportingRow = Array.from(container.querySelectorAll('li')).find((li) => li.textContent?.includes('Book C'))
    expect(exportingRow?.textContent).toContain('Uploading images')
  })

  it('caps the displayed "current book" number at the total once everything has settled', () => {
    const allSettled: BulkExportBookStatus[] = [
      { contentId: 'a', bookTitle: 'Book A', state: 'success' },
      { contentId: 'b', bookTitle: 'Book B', state: 'success' },
    ]

    act(() => {
      root.render(<BulkExportProgressList books={allSettled} settledCount={2} total={2} />)
    })

    expect(container.textContent).toContain('Exporting book 2 of 2')
  })

  it('renders a full-width progress bar once every book has settled', () => {
    act(() => {
      root.render(
        <BulkExportProgressList
          books={[{ contentId: 'a', bookTitle: 'Book A', state: 'success' }]}
          settledCount={1}
          total={1}
        />
      )
    })

    const bar = container.querySelector('[role="progressbar"]') as HTMLElement
    expect(bar.style.width).toBe('100%')
  })
})
