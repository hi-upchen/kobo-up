import {
  mapKoboColorToNotion,
  buildHighlightBlock,
  buildAnnotationBlock,
  buildChapterHeadingBlock,
  buildMarkupPlaceholder,
  buildBookPageBlocks,
} from '../notionBlockBuilder';
import { IBookChapter, IBookHighlightNAnnotation } from '@/types/kobo';

const makeNote = (
  overrides: Partial<IBookHighlightNAnnotation> = {}
): IBookHighlightNAnnotation => ({
  bookmarkId: 'bm-1',
  text: 'Some highlighted text',
  annotation: null,
  startContainerPath: '',
  startOffset: 0,
  chapterProgress: 0,
  contentId: 'content-1',
  dateCreated: '2024-01-01',
  hidden: 'false',
  type: 'highlight',
  volumeId: 'vol-1',
  color: 0,
  ...overrides,
});

const makeChapter = (
  overrides: Partial<IBookChapter> = {}
): IBookChapter => ({
  contentId: 'chapter-1',
  contentType: 899,
  bookId: 'book-1',
  bookTitle: 'Test Book',
  title: 'Chapter 1',
  chapterIdBookmarked: 'chapter-1',
  volumeIndex: 0,
  depth: 1,
  notes: [],
  ...overrides,
});

describe('mapKoboColorToNotion', () => {
  it('should map color 0 (Yellow) to yellow_background', () => {
    expect(mapKoboColorToNotion(0)).toBe('yellow_background');
  });

  it('should map color 1 (Pink) to pink_background', () => {
    expect(mapKoboColorToNotion(1)).toBe('pink_background');
  });

  it('should map color 2 (Blue) to blue_background', () => {
    expect(mapKoboColorToNotion(2)).toBe('blue_background');
  });

  it('should map color 3 (Green) to green_background', () => {
    expect(mapKoboColorToNotion(3)).toBe('green_background');
  });

  it('should return default for null', () => {
    expect(mapKoboColorToNotion(null)).toBe('default');
  });

  it('should return default for undefined', () => {
    expect(mapKoboColorToNotion(undefined)).toBe('default');
  });

  it('should return default for unknown color code', () => {
    expect(mapKoboColorToNotion(99)).toBe('default');
  });
});

describe('buildHighlightBlock', () => {
  it('should create a bulleted list item block with text and mapped color', () => {
    const block = buildHighlightBlock('Hello world', 0);
    expect(block).toEqual({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Hello world' } }],
        color: 'yellow_background',
      },
    });
  });

  it('should use default color when color is null', () => {
    const block = buildHighlightBlock('Some text', null);
    expect(block.bulleted_list_item.color).toBe('default');
  });

  it('should use default color when color is undefined', () => {
    const block = buildHighlightBlock('Some text');
    expect(block.bulleted_list_item.color).toBe('default');
  });
});

describe('buildAnnotationBlock', () => {
  it('should create a callout block with memo emoji and gray_background', () => {
    const block = buildAnnotationBlock('My note');
    expect(block).toEqual({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [{ type: 'text', text: { content: 'My note' } }],
        icon: { type: 'emoji', emoji: '\uD83D\uDCDD' },
        color: 'gray_background',
      },
    });
  });
});

describe('buildChapterHeadingBlock', () => {
  it('should create heading_2 for depth 1', () => {
    const block = buildChapterHeadingBlock('Introduction', 1);
    expect(block).toEqual({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Introduction' } }],
      },
    });
  });

  it('should create heading_3 for depth 2', () => {
    const block = buildChapterHeadingBlock('Section A', 2);
    expect(block).toEqual({
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: 'Section A' } }],
      },
    });
  });

  it('should create heading_3 for depth 3 or higher', () => {
    const block = buildChapterHeadingBlock('Sub-section', 5);
    expect(block.type).toBe('heading_3');
  });
});

describe('buildMarkupPlaceholder', () => {
  it('should create a paragraph block with italic gray text', () => {
    const block = buildMarkupPlaceholder('bm-42');
    expect(block).toEqual({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: { content: '[Handwriting annotation]' },
            annotations: { italic: true, color: 'gray' },
          },
        ],
      },
      _meta: {
        bookmarkId: 'bm-42',
        isMarkup: true,
      },
    });
  });

  it('should include _meta with bookmarkId and isMarkup flag', () => {
    const block = buildMarkupPlaceholder('bm-99');
    expect(block._meta).toEqual({
      bookmarkId: 'bm-99',
      isMarkup: true,
    });
  });
});

describe('buildBookPageBlocks', () => {
  it('should return empty array for empty chapters', () => {
    expect(buildBookPageBlocks([])).toEqual([]);
  });

  it('should produce a heading block for a chapter with no notes', () => {
    const chapters = [makeChapter({ title: 'Empty Chapter', depth: 1, notes: [] })];
    const blocks = buildBookPageBlocks(chapters);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('heading_2');
  });

  it('should produce heading + bulleted list item for a chapter with one highlight', () => {
    const chapters = [
      makeChapter({
        title: 'Ch1',
        depth: 1,
        notes: [makeNote({ text: 'Highlighted text', color: 2, type: 'highlight' })],
      }),
    ];
    const blocks = buildBookPageBlocks(chapters);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('heading_2');
    expect(blocks[1].type).toBe('bulleted_list_item');
    expect(blocks[1].bulleted_list_item.rich_text[0].text.content).toBe('Highlighted text');
    expect(blocks[1].bulleted_list_item.color).toBe('blue_background');
  });

  it('should produce heading + bulleted list item + callout for a highlight with annotation', () => {
    const chapters = [
      makeChapter({
        title: 'Ch1',
        depth: 2,
        notes: [
          makeNote({
            text: 'Important passage',
            annotation: 'My thoughts',
            color: 1,
            type: 'highlight',
          }),
        ],
      }),
    ];
    const blocks = buildBookPageBlocks(chapters);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe('heading_3');
    expect(blocks[1].type).toBe('bulleted_list_item');
    expect(blocks[1].bulleted_list_item.color).toBe('pink_background');
    expect(blocks[2].type).toBe('callout');
    expect(blocks[2].callout.rich_text[0].text.content).toBe('My thoughts');
  });

  it('should produce a markup placeholder for notes with type "markup"', () => {
    const chapters = [
      makeChapter({
        title: 'Ch1',
        depth: 1,
        notes: [
          makeNote({ bookmarkId: 'bm-markup', type: 'markup', text: '' }),
        ],
      }),
    ];
    const blocks = buildBookPageBlocks(chapters);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('heading_2');
    expect(blocks[1].type).toBe('paragraph');
    expect(blocks[1]._meta).toEqual({ bookmarkId: 'bm-markup', isMarkup: true });
  });

  it('should handle multiple chapters with mixed note types', () => {
    const chapters = [
      makeChapter({
        title: 'Chapter 1',
        depth: 1,
        notes: [
          makeNote({ text: 'Highlight 1', color: 0, type: 'highlight', annotation: null }),
          makeNote({ text: 'Highlight 2', color: 3, type: 'highlight', annotation: 'A note' }),
        ],
      }),
      makeChapter({
        contentId: 'chapter-2',
        title: 'Chapter 2',
        depth: 2,
        notes: [
          makeNote({ bookmarkId: 'bm-m1', type: 'markup', text: '' }),
        ],
      }),
    ];
    const blocks = buildBookPageBlocks(chapters);

    // Chapter 1: heading + bullet + bullet + callout = 4
    // Chapter 2: heading + placeholder = 2
    expect(blocks).toHaveLength(6);

    expect(blocks[0].type).toBe('heading_2');
    expect(blocks[1].type).toBe('bulleted_list_item');
    expect(blocks[1].bulleted_list_item.color).toBe('yellow_background');
    expect(blocks[2].type).toBe('bulleted_list_item');
    expect(blocks[2].bulleted_list_item.color).toBe('green_background');
    expect(blocks[3].type).toBe('callout');
    expect(blocks[4].type).toBe('heading_3');
    expect(blocks[5].type).toBe('paragraph');
    expect(blocks[5]._meta.isMarkup).toBe(true);
  });
});
