/**
 * Integration test that proves `generateTextContent` produces real, readable
 * plain text from an actual Kobo SQLite database — not just synthetic
 * fixtures. It loads a real `KoboReader.sqlite` sample file with `sql.js`
 * (the same library the production app uses in the browser) and runs it
 * through the same `KoboDB` query functions the app calls at runtime.
 *
 * The sample database lives outside this repo (a local developer fixture,
 * not committed for size/privacy reasons), so the whole suite is skipped —
 * rather than failing — when that file isn't present, e.g. in CI or on a
 * teammate's machine.
 */
import fs from 'fs'
import path from 'path'
import initSqlJs from 'sql.js'
import { getBook, getChaptersWithNotes } from '@/models/KoboDB'
import { generateTextContent } from '@/utils/textGenerator'
import { generateMarkdownContent } from '@/utils/markdownGenerator'

// Sample database checked into the developer's local project folder
// (sibling to this repo), used only when present.
const SAMPLE_DB_PATH = path.resolve(
  __dirname,
  '../../../../sample-kobo-folder/KoboReader.sqlite'
)

// A small real book from the sample library (3 highlights, no annotations)
// chosen so the expected output fixture below stays readable.
const SAMPLE_BOOK_CONTENT_ID = '52c9acea-9123-4de4-96f7-396dbbf638d5'

const hasSampleDb = fs.existsSync(SAMPLE_DB_PATH)
const describeIfSampleDb = hasSampleDb ? describe : describe.skip

describeIfSampleDb('generateTextContent (real Kobo database integration)', () => {
  let db: import('sql.js').Database

  beforeAll(async () => {
    const SQL = await initSqlJs()
    const fileBuffer = fs.readFileSync(SAMPLE_DB_PATH)
    db = new SQL.Database(fileBuffer)
  })

  afterAll(() => {
    db?.close()
  })

  it('renders the real book title, author, and all real highlights as plain text', async () => {
    const book = await getBook(db, SAMPLE_BOOK_CONTENT_ID)
    const chapters = await getChaptersWithNotes(db, SAMPLE_BOOK_CONTENT_ID)

    expect(book.bookTitle).toContain('經濟學的40堂公開課')
    expect(book.author).toContain('傑斯坦尼')

    const text = generateTextContent(book, chapters)

    // Title and author appear at the top of the export.
    expect(text.startsWith(`${book.bookTitle}\n${book.author}\n\n`)).toBe(true)

    // All three real highlights from the sample database are present verbatim.
    expect(text).toContain('要有改進，唯一的標準是在沒有任何人變得比較差的情況下，至少有一個人變得比較好。')
    expect(text).toContain('當人很理性時，市場會變得更難以預測，而不是更容易。')
    expect(text).toContain('總是忙著追求均衡的經濟行為者是一個可悲的角色')

    // No Markdown syntax leaks into the plain-text rendering.
    expect(text).not.toMatch(/^#/m)
    expect(text).not.toMatch(/^\* /m)
    expect(text).not.toMatch(/^> /m)
  })

  it('contains the same highlight text as the Markdown export, only without Markdown syntax', async () => {
    const book = await getBook(db, SAMPLE_BOOK_CONTENT_ID)
    const chapters = await getChaptersWithNotes(db, SAMPLE_BOOK_CONTENT_ID)

    const text = generateTextContent(book, chapters)
    const markdown = generateMarkdownContent(book, chapters)

    const sampleHighlight = '要有改進，唯一的標準是在沒有任何人變得比較差的情況下，至少有一個人變得比較好。'
    expect(markdown).toContain(`* ${sampleHighlight}`)
    expect(text).toContain(sampleHighlight)
    expect(text).not.toContain(`* ${sampleHighlight}`)
  })
})
