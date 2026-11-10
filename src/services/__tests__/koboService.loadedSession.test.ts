/**
 * @jest-environment jsdom
 */
import { KoboService } from '../koboService'

type Gate = { hasFiredLoadedEvent: boolean; database: unknown }
const gate = KoboService as unknown as Gate

// A full page reload resets module state but keeps sessionStorage.
const simulateReload = () => {
  gate.hasFiredLoadedEvent = false
}

describe('KoboService.consumeLoadedTransition across page reloads', () => {
  beforeEach(() => {
    gate.hasFiredLoadedEvent = false
    gate.database = null
    window.sessionStorage.clear()
  })

  it('fires on the first stored load in a session', () => {
    expect(KoboService.consumeLoadedTransition()).toBe(true)
  })

  it('does not fire again after a simulated full reload in the same session', () => {
    expect(KoboService.consumeLoadedTransition()).toBe(true)
    simulateReload()
    expect(KoboService.consumeLoadedTransition()).toBe(false)
  })

  it('fires again in a new session', () => {
    expect(KoboService.consumeLoadedTransition()).toBe(true)
    simulateReload()
    window.sessionStorage.clear()
    expect(KoboService.consumeLoadedTransition()).toBe(true)
  })

  it('counts a fresh upload followed by navigation to /books once', () => {
    // The landing page consumes the gate after the upload.
    expect(KoboService.consumeLoadedTransition()).toBe(true)
    // The /books page asks again on mount and must not fire.
    expect(KoboService.consumeLoadedTransition()).toBe(false)
  })

  it('counts a fresh upload once even when the books page reloads', () => {
    expect(KoboService.consumeLoadedTransition()).toBe(true)
    simulateReload()
    expect(KoboService.consumeLoadedTransition()).toBe(false)
  })

  it('does not throw when sessionStorage access throws', () => {
    const getSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const setSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    try {
      expect(KoboService.consumeLoadedTransition()).toBe(true)
      expect(KoboService.consumeLoadedTransition()).toBe(false)
    } finally {
      getSpy.mockRestore()
      setSpy.mockRestore()
    }
  })

  it('clears the session flag in clearStoredData so a new upload counts again', async () => {
    expect(KoboService.consumeLoadedTransition()).toBe(true)
    await KoboService.clearStoredData()
    expect(window.sessionStorage.getItem('kobo_loaded_event_fired')).toBeNull()
    expect(KoboService.consumeLoadedTransition()).toBe(true)
  })
})
