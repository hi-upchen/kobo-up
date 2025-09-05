import JSZip from 'jszip'
import { Database } from 'sql.js'
import { getBookList, getChaptersWithNotes, IBook, IBookChapter } from '@/models/KoboDB'
import { ExportFormat, ExportStructure } from '@/app/components/ExportFeature'
import { generateMarkdownContent } from './markdownGenerator'

export interface ExportOptions {
  format: ExportFormat
  structure: ExportStructure
  bookIds?: string[]
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200)
}


function formatBook(book: IBook, chapters: IBookChapter[], format: ExportFormat): string {
  // Both markdown and text formats use the same content (just like single book export)
  return generateMarkdownContent(book, chapters)
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function exportBooks(
  db: Database,
  options: ExportOptions,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const books = await getBookList(db)
  
  const booksToExport = options.bookIds 
    ? books.filter(book => options.bookIds!.includes(book.contentId))
    : books
  
  const extension = options.format === 'markdown' ? 'md' : 'txt'
  
  if (options.structure === 'zip') {
    const zip = new JSZip()
    
    for (let i = 0; i < booksToExport.length; i++) {
      const book = booksToExport[i]
      onProgress?.(i + 1, booksToExport.length)
      
      const chapters = await getChaptersWithNotes(db, book.contentId)
      const content = formatBook(book, chapters, options.format)
      const filename = sanitizeFilename(`${book.bookTitle}.${extension}`)
      
      zip.file(filename, content)
    }
    
    const exportInfo = `Export Information
==================
Date: ${new Date().toISOString()}
Total Books: ${booksToExport.length}
Format: ${options.format}
Structure: Separate files in ZIP
`
    zip.file('export-info.txt', exportInfo)
    
    const blob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })
    
    const timestamp = new Date().toISOString().split('T')[0]
    downloadBlob(blob, `kobo-notes-${timestamp}.zip`)
    
  } else {
    let combinedContent = ''
    
    combinedContent += `# All Books Export\n\n`
    combinedContent += `_Exported: ${new Date().toLocaleDateString()}_\n`
    combinedContent += `_Total Books: ${booksToExport.length}_\n\n`
    combinedContent += `---\n\n`
    
    for (let i = 0; i < booksToExport.length; i++) {
      const book = booksToExport[i]
      onProgress?.(i + 1, booksToExport.length)
      
      const chapters = await getChaptersWithNotes(db, book.contentId)
      const content = formatBook(book, chapters, options.format)
      
      combinedContent += content
      combinedContent += '\n\n' + '='.repeat(50) + '\n\n'
    }
    
    const mimeType = options.format === 'markdown' 
      ? 'text/markdown' 
      : 'text/plain'
    
    const blob = new Blob([combinedContent], { type: mimeType })
    const timestamp = new Date().toISOString().split('T')[0]
    downloadBlob(blob, `all-books-${timestamp}.${extension}`)
  }
}

export async function getAllBooksWithNotes(db: Database): Promise<{ book: IBook; chapters: IBookChapter[] }[]> {
  const books = await getBookList(db)
  const result: { book: IBook; chapters: IBookChapter[] }[] = []
  
  for (const book of books) {
    const chapters = await getChaptersWithNotes(db, book.contentId)
    const hasNotes = chapters.some(chapter => chapter.notes && chapter.notes.length > 0)
    
    if (hasNotes) {
      result.push({ book, chapters })
    }
  }
  
  return result
}