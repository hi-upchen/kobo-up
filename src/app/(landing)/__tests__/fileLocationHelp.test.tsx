/**
 * @jest-environment jsdom
 */
/**
 * Verifies the "Where is my file?" help block: it shows the macOS and
 * Windows paths plus the hidden-folder tips, and it pushes one
 * `file_location_help_open` event when a visitor opens it.
 */
import { act } from 'react-dom/test-utils'
import { createRoot, type Root } from 'react-dom/client'
import { FileLocationHelp } from '../components/FileLocationHelp'

describe('FileLocationHelp', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    window.dataLayer = []
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => {
      root.render(<FileLocationHelp />)
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('shows Mac and Windows paths and hidden-folder tips', () => {
    const text = container.textContent ?? ''
    expect(text).toContain('Where is my file?')
    expect(text).toContain('/Volumes/KOBOeReader/.kobo/KoboReader.sqlite')
    expect(text).toContain('E:\\.kobo\\KoboReader.sqlite')
    expect(text).toContain('⌘+Shift+.')
    expect(text).toContain('View → Show → Hidden items')
  })

  it('pushes file_location_help_open when opened', () => {
    const details = container.querySelector('details') as HTMLDetailsElement
    act(() => {
      details.open = true
      details.dispatchEvent(new Event('toggle'))
    })
    expect(window.dataLayer).toEqual([{ event: 'file_location_help_open' }])
  })
})
