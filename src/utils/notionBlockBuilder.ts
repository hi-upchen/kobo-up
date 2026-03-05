import { IBookChapter } from '@/types/kobo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotionBlock = Record<string, any>;

const KOBO_COLOR_TO_NOTION: Record<number, string> = {
  0: 'yellow_background',
  1: 'pink_background',
  2: 'blue_background',
  3: 'green_background',
};

const NOTION_MAX_TEXT_LENGTH = 2000;

function truncateText(text: string): string {
  return text.length > NOTION_MAX_TEXT_LENGTH
    ? text.slice(0, NOTION_MAX_TEXT_LENGTH - 1) + '\u2026'
    : text;
}

export function mapKoboColorToNotion(colorCode?: number | null): string {
  if (colorCode == null) return 'default';
  return KOBO_COLOR_TO_NOTION[colorCode] ?? 'default';
}

export function buildHighlightBlock(text: string, color?: number | null): NotionBlock {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [{ type: 'text', text: { content: truncateText(text) } }],
      color: mapKoboColorToNotion(color),
    },
  };
}

export function buildAnnotationBlock(annotation: string): NotionBlock {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: truncateText(annotation) } }],
      icon: { type: 'emoji', emoji: '\uD83D\uDCDD' },
      color: 'gray_background',
    },
  };
}

export function buildChapterHeadingBlock(title: string, depth: number): NotionBlock {
  const headingType = depth <= 1 ? 'heading_2' : 'heading_3';
  return {
    object: 'block',
    type: headingType,
    [headingType]: {
      rich_text: [{ type: 'text', text: { content: truncateText(title) } }],
    },
  };
}

export function buildMarkupPlaceholder(bookmarkId: string): NotionBlock {
  return {
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
      bookmarkId,
      isMarkup: true,
    },
  };
}

export function buildBookPageBlocks(chapters: IBookChapter[]): NotionBlock[] {
  const blocks: NotionBlock[] = [];

  for (const chapter of chapters) {
    blocks.push(buildChapterHeadingBlock(chapter.title, chapter.depth));

    for (const note of chapter.notes) {
      if (note.type === 'markup') {
        blocks.push(buildMarkupPlaceholder(note.bookmarkId));
      } else if (note.text) {
        blocks.push(buildHighlightBlock(note.text, note.color));
      }

      if (note.annotation) {
        blocks.push(buildAnnotationBlock(note.annotation));
      }
    }
  }

  return blocks;
}
