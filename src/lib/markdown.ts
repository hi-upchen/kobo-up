/**
 * Converts a small Markdown subset to HTML for article pages.
 * Supports headings, paragraphs, bullet and numbered lists, block quotes,
 * fenced code, horizontal rules, bold, italic, inline code and links.
 *
 * All text is HTML-escaped before any tag is added, so raw HTML and script
 * tags in an article show as plain text and never run. Link targets must
 * start with http://, https://, / or #. Without this a pasted tag or a
 * javascript: link would run in the visitor's browser.
 */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SAFE_URL = /^(https?:\/\/|\/(?!\/)|#)/i;

function renderInline(source: string): string {
  const codeSpans: string[] = [];
  let text = escapeHtml(source).replace(/`([^`]+)`/g, (_, code: string) => {
    codeSpans.push(`<code>${code}</code>`);
    return `\u0000${codeSpans.length - 1}\u0000`;
  });

  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) => {
    // The href is already escaped, so decode only the ampersand check for the scheme test.
    if (!SAFE_URL.test(href.replace(/&amp;/g, '&'))) return match;
    const external = /^https?:\/\//i.test(href);
    const rel = external ? ' rel="noopener"' : '';
    return `<a href="${href}"${rel}>${label}</a>`;
  });

  text = text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');

  // eslint-disable-next-line no-control-regex
  return text.replace(/\u0000(\d+)\u0000/g, (_, index: string) => codeSpans[Number(index)]);
}

export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];
  let i = 0;

  const isBlockStart = (line: string) =>
    /^(#{1,6})\s/.test(line) ||
    /^```/.test(line) ||
    /^>\s?/.test(line) ||
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    /^(-{3,}|\*{3,})\s*$/.test(line);

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (/^```/.test(line)) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      // The page title is the only h1, so "#" in the body becomes h2.
      const level = Math.min(Math.max(heading[1].length, 2), 6);
      html.push(`<h${level}>${renderInline(heading[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      html.push('<hr />');
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
      html.push(`<blockquote><p>${renderInline(quote.join(' '))}</p></blockquote>`);
      continue;
    }

    const listMatch = /^([-*]|\d+\.)\s+/.exec(line);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[1]);
      const itemPattern = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
      const items: string[] = [];
      while (i < lines.length && itemPattern.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i++].replace(itemPattern, ''))}</li>`);
      }
      const tag = ordered ? 'ol' : 'ul';
      html.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && (paragraph.length === 0 || !isBlockStart(lines[i]))) {
      paragraph.push(lines[i++].trim());
    }
    html.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
  }

  return html.join('\n');
}
