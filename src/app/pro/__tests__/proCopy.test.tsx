/** The Pro page must not say the limits are still to come, since they started on 2026-11-19. */
import { renderToStaticMarkup } from 'react-dom/server'
import ProPage, { metadata } from '../page'

jest.mock('@/components/LicenseEntry', () => ({ LicenseEntry: () => null }))
jest.mock('@/components/ProCheckoutButton', () => ({ ProCheckoutButton: () => null }))

describe('Pro page copy', () => {
  it('states the limits have started and keeps free export free', () => {
    const html = renderToStaticMarkup(<ProPage />)
    expect(html).not.toMatch(/Until (then|2026-11-19) everything stays free/)
    expect(html).toContain('Pro limits started on 2026-11-19')
    expect(html).toContain('up to 10 books at once')
    expect(metadata.description).not.toMatch(/Until then/)
  })
})
