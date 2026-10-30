/**
 * Checks the Markdown renderer output and that raw HTML never passes through.
 */
import { renderMarkdown } from '../markdown';

describe('renderMarkdown', () => {
  it('renders headings, paragraphs, lists and inline styles', () => {
    const html = renderMarkdown('# Title\n\nHello **bold** and *it* and `code`.\n\n- a\n- b\n\n1. one\n2. two');
    expect(html).toContain('<h2>Title</h2>');
    expect(html).toContain('<p>Hello <strong>bold</strong> and <em>it</em> and <code>code</code>.</p>');
    expect(html).toContain('<ul><li>a</li><li>b</li></ul>');
    expect(html).toContain('<ol><li>one</li><li>two</li></ol>');
  });

  it('escapes script tags and raw HTML', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes HTML inside code blocks and inline code', () => {
    const html = renderMarkdown('```\n<b>x</b>\n```\n\n`<i>`');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).toContain('<code>&lt;i&gt;</code>');
  });

  it('keeps safe links and drops unsafe schemes', () => {
    expect(renderMarkdown('[a](https://example.com)')).toContain('<a href="https://example.com" rel="noopener">a</a>');
    expect(renderMarkdown('[a](/guides/x)')).toContain('<a href="/guides/x">a</a>');
    expect(renderMarkdown('[a](javascript:alert(1))')).not.toContain('<a');
    expect(renderMarkdown('[a](//evil.example)')).not.toContain('<a');
  });

  it('cannot break out of an href attribute', () => {
    const html = renderMarkdown('[a](https://x.com/"onmouseover="alert(1))');
    expect(html).not.toContain('"onmouseover');
  });
});
