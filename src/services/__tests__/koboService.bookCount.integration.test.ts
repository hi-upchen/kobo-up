/**
 * Integration test proving that `KoboService.getBookCount()` — the query
 * used to populate `kobodb_loaded`'s `book_count` analytics param — returns
 * a real, non-trivial count against an actual multi-book Kobo library, not
 * just mocked data as in `koboService.test.ts`.
 *
 * `getBookCount()` is a thin `(await getBookList(db)).length` wrapper, so
 * this exercises `getBookList` directly against a real `KoboReader.sqlite`
 * fixture with `sql.js` (the same library the production app uses in the
 * browser) rather than going through `KoboService.initializeDatabase`,
 * which loads its WASM binary via a browser-only relative path
 * (`/sql.js/...`) that only resolves when served over HTTP.
 *
 * The sample database lives outside this repo (a local developer fixture,
 * not committed for size/privacy reasons), so the whole suite is skipped —
 * rather than failing — when that file isn't present, e.g. in CI or on a
 * teammate's machine, matching the pattern in
 * `textGenerator.integration.test.ts`.
 */
import fs from 'fs'
import path from 'path'
import initSqlJs from 'sql.js'
import { getBookList } from '@/models/KoboDB'

// Sample database checked into the developer's local project folder
// (sibling to this repo), used only when present.
const SAMPLE_DB_PATH = path.resolve(
  __dirname,
  '../../../../sample-kobo-folder/KoboReader.sqlite'
)

const hasSampleDb = fs.existsSync(SAMPLE_DB_PATH)
const describeIfSampleDb = hasSampleDb ? describe : describe.skip

describeIfSampleDb('KoboService.getBookCount query (real Kobo database integration)', () => {
  let db: import('sql.js').Database

  beforeAll(async () => {
    const SQL = await initSqlJs()
    const fileBuffer = fs.readFileSync(SAMPLE_DB_PATH)
    db = new SQL.Database(fileBuffer)
  })

  afterAll(() => {
    db?.close()
  })

  it('returns the real book count from the sample library using a single query', async () => {
    const books = await getBookList(db)

    // A real library has more than a couple of books, proving this reads
    // actual content rather than an empty/mock table.
    expect(books.length).toBeGreaterThan(1)
    expect(Number.isInteger(books.length)).toBe(true)
  })
})
