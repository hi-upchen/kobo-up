/**
 * @jest-environment jsdom
 */
import { act } from 'react-dom/test-utils'
import { createRoot, type Root } from 'react-dom/client'
import { ExportFeedbackQuestion, EXPORT_FEEDBACK_STORAGE_KEY } from '@/components/ExportFeedbackQuestion'

describe('ExportFeedbackQuestion', () => {
  let container: HTMLDivElement
  let root: Root

  const render = () => act(() => { root.render(<ExportFeedbackQuestion />) })
  const buttonByLabel = (label: string) =>
    Array.from(container.querySelectorAll('button')).find(b => b.textContent === label || b.getAttribute('aria-label') === label) as HTMLButtonElement

  beforeEach(() => {
    window.dataLayer = []
    window.localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    jest.restoreAllMocks()
  })

  it('pushes exactly one event with a fixed answer id and hides the question', () => {
    render()
    expect(container.textContent).toContain('What will you do with these notes?')
    act(() => buttonByLabel('Write or blog').click())
    expect(window.dataLayer).toEqual([{ event: 'export_feedback', answer: 'write_blog' }])
    expect(container.textContent).toBe('')
  })

  it('pushes nothing on dismiss and does not show again in the same browser', () => {
    render()
    act(() => buttonByLabel('Dismiss question').click())
    expect(window.dataLayer).toEqual([])
    expect(container.textContent).toBe('')
    expect(window.localStorage.getItem(EXPORT_FEEDBACK_STORAGE_KEY)).toBe('1')
    act(() => root.unmount())
    root = createRoot(container)
    render()
    expect(container.textContent).toBe('')
  })

  it('does not crash when storage throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(() => render()).not.toThrow()
    expect(container.textContent).toBe('')
  })
})
