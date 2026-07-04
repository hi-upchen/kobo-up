/**
 * @jest-environment jsdom
 */
/**
 * Verifies `DemoBanner` renders its message and "Connect your Kobo" link,
 * calls `onReUpload` when that link is clicked, and can be dismissed.
 *
 * No React Testing Library dependency is available in this repo (see
 * `src/components/__tests__/DonationCard.test.tsx`), so the component is
 * rendered directly with `react-dom/client` inside `act()`.
 */
import { act } from 'react-dom/test-utils'
import { createRoot, type Root } from 'react-dom/client'
import { DemoBanner } from '../DemoBanner'

describe('DemoBanner', () => {
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

  it('renders the sample-library message and calls onReUpload when "Connect your Kobo" is clicked', async () => {
    const onReUpload = jest.fn()

    await act(async () => {
      root.render(<DemoBanner onReUpload={onReUpload} />)
    })

    expect(container.textContent).toContain("You're browsing the sample library.")

    const connectButton = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent === 'Connect your Kobo'
    )
    expect(connectButton).toBeDefined()

    await act(async () => {
      connectButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onReUpload).toHaveBeenCalledTimes(1)
  })

  it('disappears after the dismiss button is clicked', async () => {
    await act(async () => {
      root.render(<DemoBanner onReUpload={jest.fn()} />)
    })

    expect(container.textContent).toContain("You're browsing the sample library.")

    const dismissButton = container.querySelector('button[aria-label="Dismiss"]') as HTMLButtonElement
    expect(dismissButton).toBeTruthy()

    await act(async () => {
      dismissButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).not.toContain("You're browsing the sample library.")
  })
})
