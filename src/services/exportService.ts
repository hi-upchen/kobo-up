import type { IBook } from '../types/kobo'
import JSZip from 'jszip'
import { KoboService } from './koboService'
import { generateMarkdownContent } from '@/utils/markdownGenerator'
import { generateTextContent } from '@/utils/textGenerator'

/** Export format offered in the multi-book export flow. */
export type BooksExportFormat = 'markdown' | 'txt'

/**
 * Returns the file extension, content generator, and MIME type for a given
 * multi-book export format, so the ZIP and combined-file export paths stay
 * in sync when a new format is added.
 *
 * @param format - The export format chosen in the export options modal.
 * @returns The file extension (no dot), the per-book content generator
 *   function, and the MIME type to use for the downloaded file.
 */
function getFormatConfig(format: BooksExportFormat) {
  return format === 'txt'
    ? { extension: 'txt', generateContent: generateTextContent, mimeType: 'text/plain' }
    : { extension: 'md', generateContent: generateMarkdownContent, mimeType: 'text/markdown' }
}

export class ExportService {
  /**
   * Export content as file with specified name and MIME type
   */
  static exportAsFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    
    // Append to body, click, then remove
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up the URL object
    URL.revokeObjectURL(url)
  }

  /**
   * Generate safe filename from book title
   */
  static generateSafeFilename(title: string, extension: string): string {
    // Remove or replace invalid filename characters
    const safeTitle = title
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .substring(0, 100) // Limit length
    
    return `${safeTitle}.${extension}`
  }


  /**
   * Exports books as a ZIP archive containing one Markdown or plain-text
   * file per book.
   *
   * @param books - The books to export (list-page summaries; full content is reloaded per book).
   * @param format - `'markdown'` (default) for `.md` files or `'txt'` for plain-text files.
   */
  static async exportBooksAsZip(books: IBook[], format: BooksExportFormat = 'markdown'): Promise<void> {
    const zip = new JSZip()
    const { extension, generateContent } = getFormatConfig(format)

    // Load full content for each book and add to ZIP
    for (const bookFromList of books) {
      try {
        // Load book details (same as book detail page) - this gets the correct book object
        const book = await KoboService.loadBookDetails(bookFromList.contentId)

        if (!book) {
          console.error(`Book not found: ${bookFromList.contentId}`)
          continue
        }

        // Load book chapters with notes/highlights (same as book detail page)
        const bookChapters = await KoboService.loadBookChaptersWithNotes(book.contentId)

        // Use exactly the same logic as book detail page - identical content for both formats
        const content = generateContent(book, bookChapters)

        const safeTitle = book.bookTitle || book.title || 'Untitled'
        const filename = this.generateSafeFilename(safeTitle, extension)
        zip.file(filename, content)
      } catch (error) {
        const bookTitle = bookFromList.bookTitle || bookFromList.title || 'Untitled'
        console.error(`Failed to load content for book: ${bookTitle}`, error)
        // Add a fallback file with error message
        const errorContent = `${bookTitle}\n\nError loading content for this book.\n\nBook: ${bookTitle}\nAuthor: ${bookFromList.author || 'Unknown'}`
        const filename = this.generateSafeFilename(bookTitle, extension)
        zip.file(filename, errorContent)
      }
    }

    // Generate the ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const zipFilename = `kobo-books-export-${timestamp}.zip`

    // Download the ZIP file
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = zipFilename

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  /**
   * Exports books as a single file with each book's content concatenated
   * and separated by a divider.
   *
   * @param books - The books to export (list-page summaries; full content is reloaded per book).
   * @param exportMode - `'all'` for the whole library or `'selected'` for a user-picked subset; only affects the generated filename.
   * @param format - `'markdown'` (default) for a `.md` file or `'txt'` for a plain-text file.
   */
  static async exportBooksAsCombinedFile(
    books: IBook[],
    exportMode: 'all' | 'selected',
    format: BooksExportFormat = 'markdown'
  ): Promise<void> {
    let combinedContent = ''
    const { extension, generateContent, mimeType } = getFormatConfig(format)

    // Load and concatenate content for all books
    for (let i = 0; i < books.length; i++) {
      const bookFromList = books[i]

      try {
        // Load book details (same as book detail page) - this gets the correct book object
        const book = await KoboService.loadBookDetails(bookFromList.contentId)

        if (!book) {
          console.error(`Book not found: ${bookFromList.contentId}`)
          continue
        }

        // Load book chapters with notes/highlights (same as book detail page)
        const bookChapters = await KoboService.loadBookChaptersWithNotes(book.contentId)

        // Use the same content generator as the book detail page
        const bookContent = generateContent(book, bookChapters)

        // Add book content to combined content
        combinedContent += bookContent

        // Add separator between books (except for the last book)
        if (i < books.length - 1) {
          combinedContent += '\n\n---\n\n'
        }

      } catch (error) {
        const bookTitle = bookFromList.bookTitle || bookFromList.title || 'Untitled'
        console.error(`Failed to load content for book: ${bookTitle}`, error)

        // Add error message for this book
        combinedContent += `${bookTitle}\n\nError loading content for this book.\n\nBook: ${bookTitle}\nAuthor: ${bookFromList.author || 'Unknown'}`

        // Add separator if not the last book
        if (i < books.length - 1) {
          combinedContent += '\n\n---\n\n'
        }
      }
    }

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = exportMode === 'all'
      ? `kobo-library-export-${timestamp}.${extension}`
      : `kobo-${books.length}-books-export-${timestamp}.${extension}`

    // Download the combined file
    this.exportAsFile(combinedContent, filename, mimeType)
  }
}