import type { IBook } from '../types/kobo'
import JSZip from 'jszip'
import { KoboService } from './koboService'
import { generateMarkdownContent } from '@/utils/markdownGenerator'

export class ExportService {
  /**
   * Generate markdown content from books array
   */
  static generateMarkdown(books: IBook[]): string {
    if (books.length === 0) {
      return `# Kobo Books Export

No books found in your library.

---
*Exported from Kobo Note Up on ${new Date().toLocaleDateString()}*`
    }

    let markdown = `# Kobo Books Export

Total books: ${books.length}

---

`

    books.forEach(book => {
      markdown += `## ${book.title}

**Author:** ${book.author || 'Unknown'}
**Highlights:** ${book.totalHighlights}
**Notes:** ${book.totalNotes}
${book.dateCreated ? `**Date Added:** ${book.dateCreated}` : ''}

---

`
    })

    markdown += `*Exported from Kobo Note Up on ${new Date().toLocaleDateString()}*`

    return markdown
  }

  /**
   * Generate JSON content from books array
   */
  static generateJson(books: IBook[]): string {
    const exportData = {
      metadata: {
        version: '1.0',
        source: 'Kobo Note Up',
        exportDate: new Date().toISOString(),
        totalBooks: books.length,
        totalHighlights: books.reduce((sum, book) => sum + (book.totalHighlights ?? 0), 0),
        totalNotes: books.reduce((sum, book) => sum + (book.totalNotes ?? 0), 0)
      },
      exportDate: new Date().toISOString(),
      totalBooks: books.length,
      books
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Get appropriate MIME type for file extension
   */
  static getBlobType(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop()
    
    switch (extension) {
      case 'json':
        return 'application/json'
      case 'md':
      case 'markdown':
        return 'text/markdown'
      case 'txt':
      default:
        return 'text/plain'
    }
  }

  /**
   * Generate filename with timestamp
   */
  static generateFilename(baseFilename: string, extension: string): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    return `${baseFilename}-${timestamp}.${extension}`
  }

  /**
   * Download file with given content and filename
   */
  static downloadFile(content: string, filename: string): void {
    const blobType = this.getBlobType(filename)
    const blob = new Blob([content], { type: blobType })
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
   * Export books as markdown file
   */
  static exportBooksToMarkdown(books: IBook[]): void {
    const content = this.generateMarkdown(books)
    const filename = this.generateFilename('kobo-books-export', 'md')
    this.downloadFile(content, filename)
  }

  /**
   * Export books as JSON file
   */
  static exportBooksToJson(books: IBook[]): void {
    const content = this.generateJson(books)
    const filename = this.generateFilename('kobo-books-export', 'json')
    this.downloadFile(content, filename)
  }

  /**
   * Generate plain text content from books array
   */
  static generateText(books: IBook[]): string {
    if (books.length === 0) {
      return `Kobo Books Export
${'='.repeat(20)}

No books found in your library.

---
Exported from Kobo Note Up on ${new Date().toLocaleDateString()}`
    }

    let content = `Kobo Books Export\n${'='.repeat(20)}\n\n`
    content += `Total books: ${books.length}\n\n`
    
    books.forEach((book, index) => {
      content += `${index + 1}. ${book.title}\n`
      content += `   Author: ${book.author || 'Unknown'}\n`
      content += `   Highlights: ${book.totalHighlights}\n`
      content += `   Notes: ${book.totalNotes}\n`
      if (book.dateCreated) {
        content += `   Date Added: ${book.dateCreated}\n`
      }
      content += '\n'
    })
    
    content += `\nExported from Kobo Note Up on ${new Date().toLocaleDateString()}`
    
    return content
  }

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
   * Export books as plain text file
   */
  static exportBooksToText(books: IBook[]): void {
    const content = this.generateText(books)
    const filename = this.generateFilename('kobo-books-export', 'txt')
    this.downloadFile(content, filename)
  }

  /**
   * Generate markdown content for a single book
   */
  static generateSingleBookMarkdown(book: IBook): string {
    let markdown = `# ${book.title}\n\n`
    markdown += `**Author:** ${book.author || 'Unknown'}\n`
    markdown += `**Highlights:** ${book.totalHighlights}\n`
    markdown += `**Notes:** ${book.totalNotes}\n`
    if (book.dateCreated) {
      markdown += `**Date Added:** ${book.dateCreated}\n`
    }
    markdown += `\n---\n\n`
    markdown += `*Exported from Kobo Note Up on ${new Date().toLocaleDateString()}*`
    
    return markdown
  }

  /**
   * Generate plain text content for a single book
   */
  static generateSingleBookText(book: IBook): string {
    const title = book.title || book.bookTitle || 'Unknown Title'
    let content = `${title}\n${'='.repeat(title.length)}\n\n`
    content += `Author: ${book.author || 'Unknown'}\n`
    content += `Highlights: ${book.totalHighlights}\n`
    content += `Notes: ${book.totalNotes}\n`
    if (book.dateCreated) {
      content += `Date Added: ${book.dateCreated}\n`
    }
    content += `\n---\n\n`
    content += `Exported from Kobo Note Up on ${new Date().toLocaleDateString()}`
    
    return content
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
   * Export books as ZIP archive with separate files
   */
  static async exportBooksAsZip(books: IBook[], format: 'markdown' | 'text'): Promise<void> {
    const zip = new JSZip()
    const extension = format === 'markdown' ? 'md' : 'txt'
    
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
        const content = generateMarkdownContent(book, bookChapters)
        
        const safeTitle = book.bookTitle || book.title || 'Untitled'
        const filename = this.generateSafeFilename(safeTitle, extension)
        zip.file(filename, content)
      } catch (error) {
        const bookTitle = bookFromList.bookTitle || bookFromList.title || 'Untitled'
        console.error(`Failed to load content for book: ${bookTitle}`, error)
        // Add a fallback file with error message
        const errorContent = `# ${bookTitle}\n\nError loading content for this book.\n\nBook: ${bookTitle}\nAuthor: ${bookFromList.author || 'Unknown'}`
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
   * Export books as single combined file (concatenated content)
   */
  static async exportBooksAsCombinedFile(books: IBook[], format: 'markdown' | 'text', exportMode: 'all' | 'selected'): Promise<void> {
    let combinedContent = ''
    const extension = format === 'markdown' ? 'md' : 'txt'
    
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
        
        // Use the same generateMarkdownContent function as book detail page
        const bookContent = generateMarkdownContent(book, bookChapters)
        
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
        combinedContent += `# ${bookTitle}\n\nError loading content for this book.\n\nBook: ${bookTitle}\nAuthor: ${bookFromList.author || 'Unknown'}`
        
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
    const mimeType = format === 'markdown' ? 'text/markdown' : 'text/plain'
    this.exportAsFile(combinedContent, filename, mimeType)
  }
}