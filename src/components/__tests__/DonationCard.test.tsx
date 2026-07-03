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

  const placements: DonationCardPlacement[] = ['donation_card_books', 'donation_card_notes']

  it.each(placements)('renders the Buy Me a Coffee link for placement "%s"', (placement) => {
    act(() => {
      root.render(<DonationCard placement={placement} />)
    })

    const link = container.querySelector('a[href="https://buymeacoffee.com/hi.upchen"]')
    expect(link).not.toBeNull()
    expect(link?.getAttribute('target')).toBe('_blank')
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
})
