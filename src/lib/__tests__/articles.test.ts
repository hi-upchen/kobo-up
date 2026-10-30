/**
 * Checks front-matter parsing, the fixed canonical URL, the byline data
 * and the JSON-LD output, using a temporary fixture folder.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildArticleJsonLd, getAllArticles, getArticle, parseArticle } from '../articles';

const FIXTURE = `---
title: "Fixture: export Kobo notes"
description: A fixture article.
date: 2026-10-01
updated: 2026-10-05
keyword: kobo export
author: Up Chen
canonical: https://evil.example/x
slug: hijacked
---

Body text.
`;

describe('articles', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'articles-'));
    fs.writeFileSync(path.join(dir, 'fixture-article.md'), FIXTURE);
    fs.writeFileSync(path.join(dir, 'ignored.txt'), 'not markdown');
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('reads every .md file and nothing else', () => {
    expect(getAllArticles(dir).map((a) => a.slug)).toEqual(['fixture-article']);
  });

  it('returns an empty list when the folder is missing', () => {
    expect(getAllArticles(path.join(dir, 'missing'))).toEqual([]);
  });

  it('parses the allowed fields', () => {
    const article = getArticle('fixture-article', dir)!;
    expect(article).toMatchObject({
      title: 'Fixture: export Kobo notes',
      description: 'A fixture article.',
      date: '2026-10-01',
      updated: '2026-10-05',
      keyword: 'kobo export',
      author: 'Up Chen',
      body: 'Body text.',
    });
  });

  it('builds the canonical URL from the file name, not from front matter', () => {
    const article = getArticle('fixture-article', dir)!;
    expect(article.canonicalUrl).toBe('https://kobo-up.runawayup.com/articles/fixture-article');
    expect(article.slug).toBe('fixture-article');
  });

  it('defaults the author to Up Chen', () => {
    const article = parseArticle('a', '---\ntitle: T\ndescription: D\ndate: 2026-01-02\n---\nx');
    expect(article.author).toBe('Up Chen');
  });

  it('puts the author and about link in the JSON-LD', () => {
    const ld = buildArticleJsonLd(getArticle('fixture-article', dir)!);
    expect(ld['@type']).toBe('Article');
    expect(ld.url).toBe('https://kobo-up.runawayup.com/articles/fixture-article');
    expect(ld.author).toEqual({ '@type': 'Person', name: 'Up Chen', url: 'https://www.runawayup.com/about' });
    expect(ld.dateModified).toBe('2026-10-05');
  });

  it('rejects missing fields, bad dates and bad slugs', () => {
    expect(() => parseArticle('a', 'no front matter')).toThrow('no front matter');
    expect(() => parseArticle('a', '---\ntitle: T\ndate: 2026-01-02\n---\n')).toThrow('description');
    expect(() => parseArticle('a', '---\ntitle: T\ndescription: D\ndate: 2026-02-31\n---\n')).toThrow('date');
    expect(() => parseArticle('../x', '---\ntitle: T\ndescription: D\ndate: 2026-01-02\n---\n')).toThrow('slug');
  });
});
