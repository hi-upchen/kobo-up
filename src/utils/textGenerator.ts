/**
 * Renders a book's chapters, highlights, and notes as human-readable plain
 * text (no Markdown syntax). Mirrors the structure of `markdownGenerator.ts`
 * so the two export formats stay in sync as new fields are added, but
 * expresses chapter nesting with indentation instead of `#` headings and
 * labels annotations/handwriting with plain words instead of `>` / `*`.
 */
import { IBook, IBookChapter } from '@/types/kobo'
import { getColorEmoji } from './koboColors'
import { downloadFile } from './markdownGenerator'

/**
 * Builds the full plain-text export for a single book.
 *
 * @param book - The book being exported; only `bookTitle` and `author` are read.
 * @param bookChapterAndNotes - Chapters in reading order, each already carrying its attached notes/highlights.
 * @returns Plain-text content: book title, author, then one line per chapter
 *   (indented two spaces per nesting depth) followed by its highlights and
 *   notes. Chapters without notes render as a bare title line. Highlight
 *   text and annotations are flattened to a single line each.
 */
export const generateTextContent = (book: IBook, bookChapterAndNotes: IBookChapter[]): string => {
  let content = ``

  content += `${book.bookTitle}\n`
  content += `${book.author}\n\n`

  bookChapterAndNotes.forEach((chapter) => {
    const indent = '  '.repeat(Math.max(chapter.depth - 1, 0))
    content += `${indent}${chapter.title}\n`

    if (chapter.notes && chapter.notes.length > 0) {
      content += '\n'
      chapter.notes.forEach((chapterNote) => {
        if (chapterNote.type === 'markup') {
          content += `${indent}  [Handwriting annotation]\n`
        } else if (chapterNote.text) {
          const emoji = getColorEmoji(chapterNote.color)
          const prefix = emoji ? `${emoji} ` : ''
          content += `${indent}  ${prefix}${chapterNote.text.replace(/\r?\n|\r/g, '').trim()}\n`
        }
        if (chapterNote.annotation) {
          content += `${indent}  Note: ${chapterNote.annotation.replace(/\r?\n|\r/g, ' ').trim()}\n`
        }
      })
      content += '\n'
    }
  })
  return content
}

/**
 * Downloads plain-text export content as a `.txt` file.
 *
 * @param filename - Destination filename, e.g. `"My Book.txt"`.
 * @param content - Plain-text content produced by `generateTextContent`.
 */
export const downloadTextFile = (filename: string, content: string) => {
  downloadFile(filename, content, 'text/plain')
}
