/**
 * @jest-environment jsdom
 */
/**
 * Verifies that DonationCard fires a `donate_click` GTM event with the
 * correct `placement` when its Buy Me a Coffee link is clicked, for each
 * placement the component supports. This is the funnel's donation-intent
 * signal, so a regression here would silently break conversion tracking.
 *
 * No React Testing Library dependency is available in this repo, so the
 * component is rendered directly with `react-dom/client` and the link is
 * clicked via a real DOM `click()` call inside `act()`.
 */
import { act } from 'react-dom/test-utils'
import { createRoot, type Root } from 'react-dom/client'
import { DonationCard, type DonationCardPlacement } from '@/components/DonationCard'

describe('DonationCard', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    // Stub the dataLayer the same way GTM would provide it in a real page.
    window.dataLayer = []
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

  const placements: DonationCardPlacement[] = [
    // Pre-existing inline placements (the control group).
    'donation_card_books',
    'donation_card_notes',
    // Delivered-value placements added in Growth Loop 2.
    'donation_card_bulk_notion_summary',
    'donation_card_bulk_file_success',
    'donation_card_post_export_notes',
    'donation_card_notion_toast',
  ]

  it.each(placements)('renders the Buy Me a Coffee link for placement "%s"', (placement) => {
    act(() => {
      root.render(<DonationCard placement={placement} />)
    })

    const link = container.querySelector('a[href="https://buymeacoffee.com/hi.upchen"]')
    expect(link).not.toBeNull()
    expect(link?.getAttribute('target')).toBe('_blank')
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it.each(placements)('fires donate_click with placement "%s" on click', (placement) => {
    act(() => {
      root.render(<DonationCard placement={placement} />)
    })

    const link = container.querySelector('a[href="https://buymeacoffee.com/hi.upchen"]') as HTMLAnchorElement

    act(() => {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(window.dataLayer).toContainEqual({ event: 'donate_click', placement })
  })

  it('renders and fires donate_click in the compact variant', () => {
    act(() => {
      root.render(<DonationCard variant="compact" placement="donation_card_bulk_file_success" />)
    })

    const link = container.querySelector('a[href="https://buymeacoffee.com/hi.upchen"]') as HTMLAnchorElement
    expect(link).not.toBeNull()
    expect(link.getAttribute('target')).toBe('_blank')
    // The compact copy sticks to the honest, verifiable claims only.
    expect(container.textContent).toContain('free and open-source')

    act(() => {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(window.dataLayer).toContainEqual({ event: 'donate_click', placement: 'donation_card_bulk_file_success' })
  })
})
