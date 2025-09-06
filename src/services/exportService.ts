import type { IBook } from '../types/kobo'

export class ExportService {
  /**
   * Generate markdown content from books array
   */
  static generateMarkdown(books: IBook[]): string {
    if (books.length === 0) {
      return `# Kobo Books Export

No books found in your library.

---
*Exported from KoboUp on ${new Date().toLocaleDateString()}*`
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

    markdown += `*Exported from KoboUp on ${new Date().toLocaleDateString()}*`

    return markdown
  }

  /**
   * Generate JSON content from books array
   */
  static generateJson(books: IBook[]): string {
    const exportData = {
      metadata: {
        version: '1.0',
        source: 'KoboUp',
        exportDate: new Date().toISOString(),
        totalBooks: books.length,
        totalHighlights: books.reduce((sum, book) => sum + book.totalHighlights, 0),
        totalNotes: books.reduce((sum, book) => sum + book.totalNotes, 0)
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
   * Export books as plain text file
   */
  static exportBooksToText(books: IBook[]): void {
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
    
    content += `\nExported from KoboUp on ${new Date().toLocaleDateString()}`
    
    const filename = this.generateFilename('kobo-books-export', 'txt')
    this.downloadFile(content, filename)
  }
}