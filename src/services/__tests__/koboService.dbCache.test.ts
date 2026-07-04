/**
 * Proves the in-memory database cache introduced to stop `/books` and
 * `/book/[contentId]/notes` from re-reading IndexedDB and re-parsing the
 * whole SQLite file with sql.js on every mount.
 *
 * `KoboService.database` is a static field, so it already behaves as a
 * module-level singleton for the lifetime of the page's JS execution
 * context. The bug was that `initializeFromStoredData()` never checked it
 * before doing the expensive work again. These tests spy on
 * `KoboDB.connKoboDB` (the sql.js parse) and the private
 * `getFromIndexedDB`/`saveToIndexedDB` IndexedDB helpers to prove the parse
 * only happens when it actually needs to.
 */
import { KoboService } from '../koboService'
import * as KoboDB from '../../models/KoboDB'

jest.mock('../../models/KoboDB')

// Typed handles for the private static members exercised in these tests.
// Casting through `unknown` mirrors the pattern already used in
// `koboService.test.ts` for reading/writing `database` directly.
type PrivateKoboService = {
  database: unknown
  getFromIndexedDB: () => Promise<ArrayBuffer | null>
  saveToIndexedDB: (arrayBuffer: ArrayBuffer) => Promise<void>
}
const privateKoboService = KoboService as unknown as PrivateKoboService

const mockFile = (name: string) => ({
  name,
  size: 1000,
  type: 'application/x-sqlite3',
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
} as unknown as File)

describe('KoboService in-memory database cache', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    privateKoboService.database = null
    ;(KoboDB.checkIsKoboDB as jest.Mock).mockResolvedValue(true)
    jest.spyOn(privateKoboService, 'getFromIndexedDB').mockResolvedValue(new ArrayBuffer(8))
    jest.spyOn(privateKoboService, 'saveToIndexedDB').mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  /** Creates a fake sql.js `Database` instance with a spyable `close()`. */
  const makeFakeDb = () => ({ close: jest.fn() })

  it('reuses the cached instance on a second initializeFromStoredData() call instead of re-parsing', async () => {
    const fakeDb = makeFakeDb()
    ;(KoboDB.connKoboDB as jest.Mock).mockResolvedValue(fakeDb)

    await KoboService.initializeFromStoredData()
    const firstInstance = KoboService.getDatabase()

    await KoboService.initializeFromStoredData()
    const secondInstance = KoboService.getDatabase()

    expect(KoboDB.connKoboDB).toHaveBeenCalledTimes(1)
    expect(privateKoboService.getFromIndexedDB).toHaveBeenCalledTimes(1)
    expect(secondInstance).toBe(firstInstance)
  })

  it('does not re-parse when initializeFromStoredData() runs right after a fresh upload', async () => {
    // Mirrors the real flow: landing page calls initializeDatabase() on
    // upload, then navigates to /books, whose mount calls
    // initializeFromStoredData(). Before this fix, that second call
    // re-read IndexedDB and re-parsed the file it had just parsed.
    const fakeDb = makeFakeDb()
    ;(KoboDB.connKoboDB as jest.Mock).mockResolvedValue(fakeDb)

    await KoboService.initializeDatabase(mockFile('KoboReader.sqlite'))
    await KoboService.initializeFromStoredData()

    expect(KoboDB.connKoboDB).toHaveBeenCalledTimes(1)
    expect(privateKoboService.getFromIndexedDB).not.toHaveBeenCalled()
    expect(KoboService.getDatabase()).toBe(fakeDb)
  })

  it('invalidates the cache on clearStoredData(), closing the old instance and re-parsing on next access', async () => {
    const firstDb = makeFakeDb()
    const secondDb = makeFakeDb()
    ;(KoboDB.connKoboDB as jest.Mock)
      .mockResolvedValueOnce(firstDb)
      .mockResolvedValueOnce(secondDb)

    await KoboService.initializeFromStoredData()
    expect(KoboService.getDatabase()).toBe(firstDb)

    await KoboService.clearStoredData()
    expect(firstDb.close).toHaveBeenCalledTimes(1)
    expect(KoboService.getDatabase()).toBeNull()

    await KoboService.initializeFromStoredData()

    expect(KoboDB.connKoboDB).toHaveBeenCalledTimes(2)
    expect(KoboService.getDatabase()).toBe(secondDb)
    expect(secondDb.close).not.toHaveBeenCalled()
  })

  it('closes the previous instance exactly once when a new database is loaded via initializeDatabase()', async () => {
    const firstDb = makeFakeDb()
    const secondDb = makeFakeDb()
    ;(KoboDB.connKoboDB as jest.Mock)
      .mockResolvedValueOnce(firstDb)
      .mockResolvedValueOnce(secondDb)

    await KoboService.initializeDatabase(mockFile('KoboReader.sqlite'))
    expect(KoboService.getDatabase()).toBe(firstDb)

    await KoboService.initializeDatabase(mockFile('KoboReader.sqlite'))

    expect(firstDb.close).toHaveBeenCalledTimes(1)
    expect(secondDb.close).not.toHaveBeenCalled()
    expect(KoboService.getDatabase()).toBe(secondDb)
  })
})
