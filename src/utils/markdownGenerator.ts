import { IBook, IBookChapter } from '@/types/kobo'
import { getColorEmoji } from './koboColors'

const hasNotes = (chapter: IBookChapter): boolean =>
  Boolean(chapter.notes && chapter.notes.length > 0)

/**
 * Returns only the chapters worth a heading in an export.
 *
 * A chapter is kept when it has notes. A parent chapter is also kept when any
 * of its subchapters has notes, so the outline above a note stays intact.
 * Chapters arrive as a flat list in reading order. A chapter's subchapters are
 * the entries right after it that sit deeper than it.
 */
export const filterChaptersWithNotes = (chapters: IBookChapter[]): IBookChapter[] =>
  chapters.filter((chapter, index) => {
    if (hasNotes(chapter)) return true
    for (let next = index + 1; next < chapters.length; next++) {
      if (chapters[next].depth <= chapter.depth) return false
      if (hasNotes(chapters[next])) return true
    }
    return false
  })

export const generateMarkdownContent = (book: IBook, bookChapterAndNotes: IBookChapter[]): string => {
  let content = ``

  content += `# ${book.bookTitle}\n`;
  content += `## ${book.author}\n\n`;

  filterChaptersWithNotes(bookChapterAndNotes).forEach((chapter) => {
    const headingPrefix = '#'.repeat(chapter.depth);
    content += `${headingPrefix} ${chapter.title}\n`;

    if (chapter.notes && chapter.notes.length > 0) {
      content += '\n';
      chapter.notes.forEach((chapterNote) => {
        if (chapterNote.type === 'markup') {
          content += `* [Handwriting annotation]\n`;
        } else if (chapterNote.text) {
          const emoji = getColorEmoji(chapterNote.color);
          const prefix = emoji ? `${emoji} ` : '';
          content += `* ${prefix}${chapterNote.text.replace(/\r?\n|\r/g, '').trim()}\n`;
        }
        if (chapterNote.annotation) {
          content += `> ${chapterNote.annotation.replace(/\r?\n|\r/g, '\n> ').trim()}\n`;
        }
      });
      content += '\n';
    }
  })
  return content
}

export const downloadFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const downloadMarkdownFile = (filename: string, content: string) => {
  downloadFile(filename, content, 'text/markdown');
}

