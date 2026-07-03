/**
 * SEO guide: getting Kobo highlights into Notion. Covers manual copy-paste
 * and Markdown-import options, then walks through Kobo Note Up's built-in
 * OAuth export (connect account, pick a destination page, export text and
 * handwriting-annotation images). Explicitly discloses that exported
 * content passes through this app's server on its way to Notion's API, per
 * the site's privacy page. Static server component, fully crawlable.
 */
import type { Metadata } from 'next'
import { Heading, Subheading } from '@/components/heading'
import { Text, TextLink, Strong } from '@/components/text'

export const metadata: Metadata = {
  title: 'How to Export Kobo Highlights to Notion (2026 Guide)',
  description:
    "Get Kobo highlights into Notion: manual copy-paste methods vs. Kobo Note Up's built-in OAuth export with images, explained step by step.",
  alternates: {
    canonical: '/guides/export-kobo-highlights-to-notion',
  },
  robots: {
    index: true,
    follow: true,
  },
}

const faqs = [
  {
    question: 'Does exporting to Notion send my highlights to a third-party server?',
    answer:
      "Yes, and it's the one flow on this site where that happens. Notion requires a server-side OAuth connection and authenticated API calls, so a pure browser-to-browser export isn't possible the way local Markdown export is. Your highlights, notes, and any images pass through Kobo Note Up's server on their way to Notion's API — they are forwarded, not stored in a database. Full details are on the privacy page.",
  },
  {
    question: 'Can I export my whole library to Notion at once?',
    answer:
      "Not yet — Notion export currently works one book at a time, from that book's notes page. If you want your entire library in one place quickly, exporting the whole library to a single combined Markdown file and importing that into Notion is faster today.",
  },
  {
    question: 'Do handwriting annotations from a Kobo stylus come through?',
    answer:
      'Yes. If you own a Kobo with stylus support, the Notion export uploads your handwritten annotation images alongside the text highlights, so they appear in the resulting Notion page.',
  },
  {
    question: 'Do I need a Notion account or a paid Notion plan?',
    answer:
      "You need a free Notion account and at least one existing page to export into — Kobo Note Up creates the export as a new sub-page underneath a page you choose. No paid Notion plan is required.",
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
}

export default function ExportKoboHighlightsToNotionGuide() {
  return (
    <div className="py-16 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Heading level={1}>How to Export Kobo Highlights to Notion</Heading>
      <Text className="mt-4">
        Notion is a common home for reading notes, but Kobo has no built-in way to send
        highlights there. This guide covers the manual routes people use today, then walks
        through Kobo Note Up&apos;s direct, one-click Notion export — including exactly what
        data leaves your device and why.
      </Text>

      <Subheading level={2} className="mt-12">
        Manual ways to get Kobo highlights into Notion
      </Subheading>
      <Text className="mt-4">
        Before any dedicated export tool, most readers use one of these:
      </Text>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>
          <Text>
            <Strong>Copy-paste from the Kobo device or app.</Strong> Works for a handful of
            highlights, but doesn&apos;t scale past a few books and loses any formatting or
            chapter structure.
          </Text>
        </li>
        <li>
          <Text>
            <Strong>Export to Markdown, then import into Notion.</Strong> Notion has a native
            Markdown importer (Import → Text &amp; Markdown from the Notion sidebar). If you
            already have a Markdown export of your Kobo highlights — from Kobo Note Up or
            another tool — dragging that file into Notion&apos;s importer turns headings and
            bullet points into native Notion blocks automatically.
          </Text>
        </li>
        <li>
          <Text>
            <Strong>Kobo&apos;s official export, then reformat by hand.</Strong> Only realistic
            if your library is entirely Kobo Store purchases with short highlights — see the{' '}
            <TextLink href="/guides/kobo-export-not-working">
              Kobo export troubleshooting guide
            </TextLink>{' '}
            for why this breaks down for sideloaded books.
          </Text>
        </li>
      </ul>
      <Text className="mt-4">
        All three manual routes share the same weakness: they scale with how much patience you
        have, not with how many books you own. Retyping or reformatting highlights for a handful
        of books is tedious but doable; doing it for a library of fifty books is not a realistic
        way to spend an afternoon.
      </Text>

      <Subheading level={2} className="mt-12">
        The built-in option: Kobo Note Up&apos;s Notion export
      </Subheading>
      <Text className="mt-4">
        Kobo Note Up can export a book&apos;s highlights and notes directly into a Notion page,
        without you touching a Markdown file at all. Here is exactly how it works, step by step.
      </Text>
      <ol className="mt-4 list-decimal space-y-3 pl-6">
        <li>
          <Text>
            Load your Kobo library into{' '}
            <TextLink href="/">Kobo Note Up</TextLink> as usual (connect your Kobo via USB,
            select its folder in the browser).
          </Text>
        </li>
        <li>
          <Text>
            Open a book, then choose <Strong>&quot;Connect &amp; Export to Notion&quot;</Strong>{' '}
            from the export menu on that book&apos;s notes page.
          </Text>
        </li>
        <li>
          <Text>
            The first time, you&apos;ll be sent to Notion to authorize the connection (standard
            Notion OAuth). Notion returns you to Kobo Note Up once you approve access.
          </Text>
        </li>
        <li>
          <Text>
            Pick an existing Notion page from the searchable list that appears — your export is
            created as a new sub-page underneath the page you choose.
          </Text>
        </li>
        <li>
          <Text>
            Kobo Note Up builds the Notion page from your highlights, notes, and (if present)
            handwriting-annotation images, and shows a progress indicator while it uploads.
          </Text>
        </li>
      </ol>
      <Text className="mt-4">
        Repeat the same flow for any other book you want in Notion — each export lands as its own
        sub-page, so you end up with one Notion page per book underneath whichever parent page you
        picked, similar to how a bookshelf works.
      </Text>

      <Subheading level={2} className="mt-12">
        What the resulting Notion page looks like
      </Subheading>
      <Text className="mt-4">
        The export mirrors the same structure Kobo Note Up shows you in the browser: the book
        title and author at the top, followed by your chapters in order. Each highlight becomes
        its own block, any note you attached appears as a quote directly beneath the highlight it
        belongs to, and handwriting-annotation images are inserted inline as image blocks rather
        than left as a link. Nothing is reformatted or summarized — it&apos;s the same content you
        see in the app, just laid out as native Notion blocks instead of a Markdown file.
      </Text>

      <Subheading level={2} className="mt-12">
        What actually gets transmitted, and where
      </Subheading>
      <Text className="mt-4">
        This is the one export path on Kobo Note Up that isn&apos;t fully local, so it&apos;s worth
        being precise about it. Local Markdown export (used elsewhere on this site) runs entirely
        in your browser using SQL.js, a WebAssembly build of SQLite — nothing is uploaded.
        Notion&apos;s API, by contrast, requires server-side OAuth and authenticated calls, so a
        pure browser-to-browser export isn&apos;t possible.
      </Text>
      <Text className="mt-4">
        When you export to Notion, your browser sends the book&apos;s highlights, notes, and any
        handwriting images to Kobo Note Up&apos;s server, which forwards them to Notion&apos;s
        API on your behalf. That content passes through the server in-flight — it is not written
        to a database there. Your Notion access token is kept in an encrypted, httpOnly browser
        cookie that expires after seven days, not in server-side storage. For the complete,
        unfiltered breakdown of this and every other data flow on the site, see the{' '}
        <TextLink href="/privacy">privacy page</TextLink>.
      </Text>

      <Subheading level={2} className="mt-12">
        Frequently asked questions
      </Subheading>
      <div className="mt-6 space-y-6">
        {faqs.map((faq) => (
          <div key={faq.question}>
            <Text className="font-semibold text-zinc-950 dark:text-white">{faq.question}</Text>
            <Text className="mt-1">{faq.answer}</Text>
          </div>
        ))}
      </div>

      <Subheading level={2} className="mt-12">
        Related guides
      </Subheading>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>
          <TextLink href="/guides/kobo-export-not-working">
            Kobo export not working? Every fix that actually works
          </TextLink>
        </li>
        <li>
          <TextLink href="/guides/export-kobo-highlights-to-markdown-obsidian">
            Export Kobo highlights to Markdown for Obsidian
          </TextLink>
        </li>
      </ul>

      <Text className="mt-8">
        Ready to try it? <TextLink href="/">Open Kobo Note Up</TextLink> — it&apos;s free, open
        source, and the Markdown export path never leaves your browser.
      </Text>
    </div>
  )
}
