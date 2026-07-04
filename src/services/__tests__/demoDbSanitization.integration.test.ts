/**
 * Integration test that independently verifies the privacy guarantee behind
 * `scripts/build-demo-db.mjs`: regenerating the sanitized demo database from
 * the real source library must not leak any of the source books' real
 * titles, authors, highlight text, note annotations, or the owner's real
 * account email into the generated artifact.
 *
 * `build-demo-db.mjs` already asserts this itself before writing the file
 * (and fails loudly if it doesn't hold) — this test re-derives the same
 * forbidden strings independently, straight from the source database via
 * `sql.js`, rather than trusting the script's own self-check, then inspects
 * the regenerated output file directly.
 *
 * The source database lives outside this repo (a local developer fixture,
 * not committed for size/privacy reasons), so this suite is skipped —
 * rather than failing — when that file isn't present, e.g. in CI or on a
 * teammate's machine, matching the pattern in
 * `textGenerator.integration.test.ts`.
 */
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import initSqlJs from 'sql.js'

// Sample database checked into the developer's local project folder
// (sibling to this repo), used only when present.
const SOURCE_DB_PATH = path.resolve(__dirname, '../../../../sample-kobo-folder/KoboReader.sqlite')
const OUTPUT_DB_PATH = path.resolve(__dirname, '../../../public/demo/KoboReader-demo.sqlite')
const SCRIPT_PATH = path.resolve(__dirname, '../../../scripts/build-demo-db.mjs')

// Real ContentIDs of the books `build-demo-db.mjs` keeps and rewrites — kept
// in sync manually with that script's `BOOK_PLAN`. These IDs are opaque
// UUIDs; only the human-readable columns they point at are privacy-sensitive.
const KEPT_SOURCE_BOOK_IDS = [
  '8729a8e9-1bd8-49ca-a07d-d50d04deaf6a',
  '49dc2dd8-7711-4a02-aa02-7db61d3fe1b1',
  'a2a89e2b-6eea-4861-b60c-50afa50f8f5c',
  '5811c1d0-9fb7-46f3-8deb-4370f5483ae5'
]

const hasSampleDb = fs.existsSync(SOURCE_DB_PATH)
const describeIfSampleDb = hasSampleDb ? describe : describe.skip

describeIfSampleDb('build-demo-db.mjs sanitization (real Kobo database integration)', () => {
  it('leaves no real title, author, highlight, annotation, or account email in the regenerated demo database', async () => {
    // Independently collect the real, human-readable strings tied to the
    // kept books plus the account email — before running the script, so
    // this check does not depend on anything the script itself computed.
    const SQL = await initSqlJs()
    const sourceDb = new SQL.Database(fs.readFileSync(SOURCE_DB_PATH))

    const forbidden = new Set<string>()
    const idList = KEPT_SOURCE_BOOK_IDS.map(id => `'${id}'`).join(',')

    const bookRows = sourceDb.exec(`SELECT Title, Attribution FROM content WHERE ContentID IN (${idList})`)
    bookRows[0]?.values.forEach(([title, author]) => {
      if (title) forbidden.add(String(title))
      if (author) forbidden.add(String(author))
    })

    const bookmarkRows = sourceDb.exec(`SELECT Text, Annotation FROM Bookmark WHERE VolumeID IN (${idList})`)
    bookmarkRows[0]?.values.forEach(([text, annotation]) => {
      if (text) forbidden.add(String(text))
      if (annotation) forbidden.add(String(annotation))
    })

    const userRows = sourceDb.exec('SELECT UserEmail FROM user')
    userRows[0]?.values.forEach(([email]) => {
      if (email) forbidden.add(String(email))
    })
    sourceDb.close()

    // Sanity check on the test itself: the source library must actually
    // contain real content for these books, otherwise this test would pass
    // vacuously without checking anything.
    expect(forbidden.size).toBeGreaterThan(10)

    // Regenerate the artifact fresh (the script has its own internal
    // assertion and exits non-zero if it fails, which execFileSync surfaces
    // as a thrown error and fails this test).
    execFileSync('node', [SCRIPT_PATH], { stdio: 'pipe' })

    const outputBytes = fs.readFileSync(OUTPUT_DB_PATH)
    const outputText = outputBytes.toString('latin1')

    const leaked = Array.from(forbidden).filter(s => outputText.includes(s))
    expect(leaked).toEqual([])
  }, 30000)
})
