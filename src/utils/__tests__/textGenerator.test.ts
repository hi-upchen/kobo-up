import { generateTextContent } from '../textGenerator';
import { IBook, IBookChapter } from '@/types/kobo';

describe('generateTextContent', () => {
  const mockBook: IBook = {
    contentId: 'test-book-id',
    bookTitle: 'Test Book',
    author: 'Test Author',
  };

  it('renders title, author, and a chapter with a plain highlight as readable text with no Markdown syntax', () => {
    const chapters: IBookChapter[] = [{
      contentId: 'chapter-1',
      title: 'Chapter 1',
      depth: 1,
      notes: [
        { bookmarkId: '1', text: 'A plain highlight' },
      ]
    }] as IBookChapter[];

    const result = generateTextContent(mockBook, chapters);

    expect(result).toBe(
      'Test Book\n' +
      'Test Author\n\n' +
      'Chapter 1\n\n' +
      '  A plain highlight\n\n'
    );
    expect(result).not.toMatch(/[#*>]/);
  });

  it('prepends a color emoji to highlights when color is present', () => {
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
    }] as IBookChapter[];

    const result = generateTextContent(mockBook, chapters);

    expect(result).toContain('🟡 Yellow highlight');
    expect(result).toContain('🔴 Pink highlight');
    expect(result).toContain('🔵 Blue highlight');
    expect(result).toContain('🟢 Green highlight');
  });

  it('does not prepend an emoji when color is undefined or null', () => {
    const chapters: IBookChapter[] = [{
      contentId: 'chapter-1',
      title: 'Chapter 1',
      depth: 1,
      notes: [
        { bookmarkId: '1', text: 'No color highlight' },
        { bookmarkId: '2', text: 'Null color highlight', color: null },
      ]
    }] as IBookChapter[];

    const result = generateTextContent(mockBook, chapters);

    expect(result).toContain('No color highlight');
    expect(result).toContain('Null color highlight');
    expect(result).not.toMatch(/🟡/);
  });

  it('indents nested chapters according to their depth', () => {
    const chapters: IBookChapter[] = [
      { contentId: 'c1', title: 'Part One', depth: 1, notes: [] },
      { contentId: 'c2', title: 'Section 1.1', depth: 2, notes: [] },
      { contentId: 'c3', title: 'Subsection 1.1.1', depth: 3, notes: [] },
    ] as IBookChapter[];

    const result = generateTextContent(mockBook, chapters);

    expect(result).toContain('Part One\n');
    expect(result).toContain('  Section 1.1\n');
    expect(result).toContain('    Subsection 1.1.1\n');
  });

  it('renders a book with no notes as just the title, author, and chapter outline', () => {
    const chapters: IBookChapter[] = [
      { contentId: 'c1', title: 'Chapter 1', depth: 1, notes: [] },
      { contentId: 'c2', title: 'Chapter 2', depth: 1, notes: [] },
    ] as IBookChapter[];

    const result = generateTextContent(mockBook, chapters);

    expect(result).toBe(
      'Test Book\n' +
      'Test Author\n\n' +
      'Chapter 1\n' +
      'Chapter 2\n'
    );
  });

  it('renders a book with an empty chapter list as just the title and author', () => {
    const result = generateTextContent(mockBook, []);

    expect(result).toBe('Test Book\nTest Author\n\n');
  });

  it('renders a note-only annotation (no highlighted text) as a labeled Note line', () => {
    const chapters: IBookChapter[] = [{
      contentId: 'chapter-1',
      title: 'Chapter 1',
      depth: 1,
      notes: [
        { bookmarkId: '1', text: '', annotation: 'A standalone note with no highlight' },
      ]
    }] as IBookChapter[];

    const result = generateTextContent(mockBook, chapters);

    expect(result).toContain('Note: A standalone note with no highlight');
    expect(result).not.toContain('undefined');
  });

  it('renders a highlight paired with its annotation on the following line', () => {
    const chapters: IBookChapter[] = [{
      contentId: 'chapter-1',
      title: 'Chapter 1',
      depth: 1,
      notes: [
        { bookmarkId: '1', text: 'Highlighted passage', annotation: 'My thoughts on this' },
      ]
    }] as IBookChapter[];

    const result = generateTextContent(mockBook, chapters);

    const lines = result.split('\n');
    const highlightIdx = lines.findIndex(l => l.includes('Highlighted passage'));
    const noteIdx = lines.findIndex(l => l.includes('Note: My thoughts on this'));
    expect(highlightIdx).toBeGreaterThanOrEqual(0);
    expect(noteIdx).toBe(highlightIdx + 1);
  });

  it('renders a handwriting annotation (markup type) as a bracketed placeholder', () => {
    const chapters: IBookChapter[] = [{
      contentId: 'chapter-1',
      title: 'Chapter 1',
      depth: 1,
      notes: [
        { bookmarkId: '1', type: 'markup' },
      ]
    }] as IBookChapter[];

    const result = generateTextContent(mockBook, chapters);

    expect(result).toContain('[Handwriting annotation]');
  });

  it('collapses multi-line highlight text and annotations onto single readable lines', () => {
    const chapters: IBookChapter[] = [{
      contentId: 'chapter-1',
      title: 'Chapter 1',
      depth: 1,
      notes: [
        { bookmarkId: '1', text: 'Line one\nLine two\r\nLine three', annotation: 'Note line one\nNote line two' },
      ]
    }] as IBookChapter[];

    const result = generateTextContent(mockBook, chapters);

    expect(result).toContain('Line oneLine twoLine three');
    expect(result).toContain('Note: Note line one Note line two');
  });
});
