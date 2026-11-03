/**
 * Renders one article from content/articles/<slug>.md.
 * The canonical URL and the structured data come from the front matter
 * through src/lib/articles.ts. Pages are built at deploy time, and an
 * unknown slug returns 404.
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Heading } from '@/components/heading'
import { Text, TextLink } from '@/components/text'
import { AUTHOR_URL, buildArticleJsonLd, getAllArticles, getArticle } from '@/lib/articles'
import { renderMarkdown } from '@/lib/markdown'

export const dynamicParams = false

export function generateStaticParams() {
  return getAllArticles().map((article) => ({ slug: article.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = getArticle(params.slug)
  if (!article) return {}
  return {
    title: `${article.title} — Kobo Note Up`,
    description: article.description,
    authors: [{ name: article.author, url: AUTHOR_URL }],
    alternates: { canonical: article.canonicalUrl },
    robots: { index: true, follow: true },
    openGraph: { type: 'article', url: article.canonicalUrl, title: article.title, description: article.description },
  }
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = getArticle(params.slug)
  if (!article) notFound()

  // "<" is escaped so article text can never close the script tag.
  const jsonLd = JSON.stringify(buildArticleJsonLd(article)).replace(/</g, '\\u003c')

  return (
    <article className="py-16 sm:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <Heading level={1}>{article.title}</Heading>
      <Text className="mt-4">
        By <TextLink href={AUTHOR_URL}>{article.author}</TextLink> ·{' '}
        <time dateTime={article.date}>{article.date}</time>
        {article.updated && (
          <>
            {' '}· Updated <time dateTime={article.updated}>{article.updated}</time>
          </>
        )}
      </Text>

      <div
        className="mt-8 space-y-4 text-base/7 text-zinc-800 dark:text-zinc-300 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_code]:text-sm [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-zinc-100 [&_pre]:p-4 [&_ul]:list-disc [&_ul]:pl-6 dark:[&_pre]:bg-zinc-800"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }}
      />
    </article>
  )
}
