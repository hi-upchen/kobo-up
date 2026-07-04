/**
 * @jest-environment jsdom
 */
/**
 * Verifies the two pieces of `KoboService` demo mode is built on:
 *
 *  - `fetchDemoFile()`, which turns the fetched `/demo/KoboReader-demo.sqlite`
 *    response into a `File` the rest of the app treats identically to a real
 *    upload. `fetch` is mocked here, but it serves the *real* generated
 *    demo database bytes read straight off disk — the same file
 *    `koboService.demoDatabase.integration.test.ts` proves is a working
 *    Kobo database — so this test exercises the actual artifact end to end
 *    up to (but not including) the browser-only sql.js/WASM parse step,
 *    which is exercised separately by the pure-Node integration test.
 *  - `markAsDemoData()` / `isDemoData()` / `clearStoredData()`'s clearing of
 *    that flag, all backed by `localStorage`, which only jsdom provides.
 */
import fs from 'fs'
import path from 'path'
import { KoboService } from '../koboService'
import { DEMO_MARKUP_BOOKMARK_ID } from '../../constants/demoConstants'

jest.mock('../../models/KoboDB')

const DEMO_DB_PATH = path.resolve(__dirname, '../../../public/demo/KoboReader-demo.sqlite')
const DEMO_MARKUP_SVG = path.resolve(__dirname, `../../../public/demo/markups/${DEMO_MARKUP_BOOKMARK_ID}.svg`)
const DEMO_MARKUP_JPG = path.resolve(__dirname, `../../../public/demo/markups/${DEMO_MARKUP_BOOKMARK_ID}.jpg`)

/** Reads a jsdom `Blob`/`File` into a Node `Buffer` via `FileReader` (jsdom lacks `Blob.arrayBuffer()`). */
function readFileAsBuffer(file: Blob): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(Buffer.from(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

describe('KoboService demo mode', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    localStorage.clear()
  })

  describe('fetchDemoFile', () => {
    it('fetches the real generated demo database and wraps it in a File with the expected bytes', async () => {
      const realBytes = fs.readFileSync(DEMO_DB_PATH)
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new Blob([realBytes])),
      } as unknown as Response)

      const file = await KoboService.fetchDemoFile()

      expect(fetch).toHaveBeenCalledWith('/demo/KoboReader-demo.sqlite')
      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe('KoboReader-demo.sqlite')
      expect(file.size).toBe(realBytes.length)

      // jsdom's Blob/File don't implement `.arrayBuffer()`, unlike real
      // browsers (where production code reads the file this way inside
      // KoboDB's `connKoboDB`) — read via FileReader instead, which jsdom
      // does support, to independently confirm the File really carries the
      // exact real SQLite bytes served by the mocked fetch.
      const fileBytes = await readFileAsBuffer(file)
      // SQLite files always start with this 16-byte magic header — proves
      // the mocked fetch really served real SQLite bytes, not a stub.
      expect(fileBytes.subarray(0, 16).toString('utf-8')).toBe('SQLite format 3\0')
      expect(fileBytes.equals(realBytes)).toBe(true)
    })

    it('throws a KoboError when the fetch response is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 } as unknown as Response)

      await expect(KoboService.fetchDemoFile()).rejects.toThrow(/sample library/i)
    })

    it('throws a KoboError when fetch itself rejects (e.g. offline)', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network down'))

      await expect(KoboService.fetchDemoFile()).rejects.toThrow(/sample library/i)
    })
  })

  describe('fetchDemoMarkupFiles', () => {
    /** Mocks `fetch` to serve the real shipped SVG/JPG bytes, keyed by URL. */
    function mockMarkupFetch() {
      const svgBytes = fs.readFileSync(DEMO_MARKUP_SVG)
      const jpgBytes = fs.readFileSync(DEMO_MARKUP_JPG)
      global.fetch = jest.fn().mockImplementation((url: string) => {
        const bytes = url.endsWith('.svg') ? svgBytes : jpgBytes
        return Promise.resolve({
          ok: true,
          status: 200,
          arrayBuffer: () =>
            Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
        } as unknown as Response)
      })
      return { svgBytes, jpgBytes }
    }

    it('returns the paired SVG/JPG assets keyed by the shared markup bookmark id', async () => {
      const { svgBytes, jpgBytes } = mockMarkupFetch()

      const files = await KoboService.fetchDemoMarkupFiles()

      expect(files).toHaveLength(1)
      expect(files[0].bookmarkId).toBe(DEMO_MARKUP_BOOKMARK_ID)
      // The SVG really is the transparent stroke overlay, the JPG really is
      // the JPEG page background — confirm by byte length and format magic.
      expect(Buffer.from(files[0].svg).equals(svgBytes)).toBe(true)
      expect(Buffer.from(files[0].jpg).equals(jpgBytes)).toBe(true)
      expect(Buffer.from(files[0].svg).toString('utf-8')).toContain('<svg')
      // JPEG files start with the bytes FF D8 FF.
      expect(Array.from(Buffer.from(files[0].jpg).subarray(0, 3))).toEqual([0xff, 0xd8, 0xff])
    })

    it('throws a KoboError when a markup asset fetch is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 } as unknown as Response)

      await expect(KoboService.fetchDemoMarkupFiles()).rejects.toThrow(/handwriting/i)
    })

    it('throws a KoboError when fetch itself rejects (e.g. offline)', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network down'))

      await expect(KoboService.fetchDemoMarkupFiles()).rejects.toThrow(/handwriting/i)
    })
  })

  describe('demo data marker', () => {
    it('is false by default, true after markAsDemoData, and false again after clearStoredData', async () => {
      expect(KoboService.isDemoData()).toBe(false)

      KoboService.markAsDemoData()
      expect(KoboService.isDemoData()).toBe(true)

      await KoboService.clearStoredData()
      expect(KoboService.isDemoData()).toBe(false)
    })
  })
})
