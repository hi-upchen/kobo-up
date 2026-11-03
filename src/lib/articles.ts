/**
 * Reads search articles from content/articles/*.md.
 * Each file name (without .md) is the URL slug under /articles.
 *
 * Only these front-matter fields are read: title, description, date,
 * updated, keyword and author. Every other key is ignored. The canonical
 * URL is built here from the slug, so no field can change it.
 * A file with a missing or malformed field throws, so the build fails
 * instead of publishing a broken page.
 */
import fs from 'fs';
import path from 'path';

export const SITE_URL = 'https://kobo-up.runawayup.com';
export const DEFAULT_AUTHOR = 'Up Chen';
export const AUTHOR_URL = 'https://www.runawayup.com/about';

const ARTICLES_DIR = path.join(process.cwd(), 'content', 'articles');
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_FIELDS = ['title', 'description', 'date', 'updated', 'keyword', 'author'] as const;

export interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  keyword?: string;
  author: string;
  body: string;
  canonicalUrl: string;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  const quoted = /^(["'])(.*)\1$/.exec(trimmed);
  return quoted ? quoted[2] : trimmed;
}

function isRealDate(value: string): boolean {
  return DATE_PATTERN.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
}

export function parseArticle(slug: string, source: string): Article {
  if (!SLUG_PATTERN.test(slug)) throw new Error(`Article file name "${slug}" is not a valid slug`);

  const match = /^---\n([\s\S]*?)\n---[ \t]*(?:\n([\s\S]*))?$/.exec(source.replace(/\r\n?/g, '\n'));
  if (!match) throw new Error(`Article "${slug}" has no front matter`);

  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const pair = /^([A-Za-z_]+)\s*:\s*(.*)$/.exec(line);
    if (!pair) continue;
    const key = pair[1].toLowerCase();
    if ((ALLOWED_FIELDS as readonly string[]).includes(key)) fields[key] = unquote(pair[2]);
  }

  for (const required of ['title', 'description', 'date'] as const) {
    if (!fields[required]) throw new Error(`Article "${slug}" is missing "${required}"`);
  }
  for (const key of ['date', 'updated'] as const) {
    if (fields[key] && !isRealDate(fields[key])) {
      throw new Error(`Article "${slug}" has an invalid "${key}" (use YYYY-MM-DD)`);
    }
  }

  return {
    slug,
    title: fields.title,
    description: fields.description,
    date: fields.date,
    updated: fields.updated || undefined,
    keyword: fields.keyword || undefined,
    author: fields.author || DEFAULT_AUTHOR,
    body: (match[2] ?? '').trim(),
    canonicalUrl: `${SITE_URL}/articles/${slug}`,
  };
}

export function getAllArticles(dir: string = ARTICLES_DIR): Article[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => parseArticle(file.slice(0, -3), fs.readFileSync(path.join(dir, file), 'utf8')))
    .sort((a, b) => (b.updated ?? b.date).localeCompare(a.updated ?? a.date));
}

export function getArticle(slug: string, dir: string = ARTICLES_DIR): Article | undefined {
  return getAllArticles(dir).find((article) => article.slug === slug);
}

export function buildArticleJsonLd(article: Article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.updated ?? article.date,
    mainEntityOfPage: { '@type': 'WebPage', '@id': article.canonicalUrl },
    url: article.canonicalUrl,
    author: { '@type': 'Person', name: article.author, url: AUTHOR_URL },
    publisher: { '@type': 'Organization', name: 'Kobo Note Up', url: SITE_URL },
    ...(article.keyword ? { keywords: article.keyword } : {}),
  };
}
