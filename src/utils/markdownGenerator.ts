import { IBook, IBookChapter } from '@/types/kobo'

export const generateMarkdownContent = (book: IBook, bookChapterAndNotes: IBookChapter[]): string => {
  let content = ``

  content += `# ${book.bookTitle}\n`;
  content += `## ${book.author}\n\n`;

  bookChapterAndNotes.forEach((chapter) => {
    const headingPrefix = '#'.repeat(chapter.depth);
    content += `${headingPrefix} ${chapter.title}\n`;

    if (chapter.notes && chapter.notes.length > 0) {
      content += '\n';
      chapter.notes.forEach((chapterNote) => {
        if (chapterNote.text) {
          content += `* ${chapterNote.text.replace(/\r?\n|\r/g, '').trim()}\n`;
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

export const downloadTxtFile = (filename: string, content: string) => {
  downloadFile(filename, content, 'text/plain');
}