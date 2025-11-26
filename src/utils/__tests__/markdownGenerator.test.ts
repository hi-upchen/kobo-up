import { generateMarkdownContent } from '../markdownGenerator';
import { IBook, IBookChapter } from '@/types/kobo';

describe('generateMarkdownContent', () => {
  const mockBook: IBook = {
    contentId: 'test-book-id',
    bookTitle: 'Test Book',
    author: 'Test Author',
  };

  it('should prepend color emoji to highlights when color is present', () => {
    const chapters: IBookChapter[] = [{
      contentId: 'chapter-1',
      title: 'Chapter 1',
      depth: 2,
      notes: [
        { bookmarkId: '1', text: 'Yellow highlight', color: 0 },
        { bookmarkId: '2', text: 'Pink highlight', color: 1 },
        { bookmarkId: '3', text: 'Blue highlight', color: 2 },
        { bookmarkId: '4', text: 'Green highlight', color: 3 },
      ]
    }];

    const result = generateMarkdownContent(mockBook, chapters);

    expect(result).toContain('* 🟡 Yellow highlight');
    expect(result).toContain('* 🔴 Pink highlight');
    expect(result).toContain('* 🔵 Blue highlight');
    expect(result).toContain('* 🟢 Green highlight');
  });

  it('should not prepend emoji when color is undefined or null', () => {
    const chapters: IBookChapter[] = [{
      contentId: 'chapter-1',
      title: 'Chapter 1',
      depth: 2,
      notes: [
        { bookmarkId: '1', text: 'No color highlight' },
        { bookmarkId: '2', text: 'Null color highlight', color: null },
      ]
    }];

    const result = generateMarkdownContent(mockBook, chapters);

    expect(result).toContain('* No color highlight');
    expect(result).toContain('* Null color highlight');
    expect(result).not.toMatch(/\* 🟡 No color/);
    expect(result).not.toMatch(/\* 🟡 Null color/);
  });
});
