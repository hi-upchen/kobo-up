/**
 * SEO guide: troubleshooting Kobo's broken/missing export feature.
 * Explains why the official export fails for sideloaded books and long
 * highlights, honestly compares the available workarounds (official
 * export, Calibre, manual SQLite queries, Kobo Note Up), and walks through
 * the step-by-step fix using this site's browser-based tool. Static server
 * component so it is fully crawlable — no client state is required to
 * render the guide content.
 */
import type { Metadata } from 'next'
import { Heading, Subheading } from '@/components/heading'
import { Text, TextLink, Strong } from '@/components/text'

export const metadata: Metadata = {
  title: 'Kobo Export Not Working? Every Fix That Actually Works',
  description:
    'Kobo export failing? Compare every fix — official export, Calibre, manual SQLite, and Kobo Note Up — with an honest, step-by-step solution.',
  alternates: {
    canonical: '/guides/kobo-export-not-working',
  },
  robots: {
    index: true,
    follow: true,
  },
}

const faqs = [
  {
    question: 'Why does my Kobo export button do nothing, or export an empty file?',
    answer:
      "Kobo's built-in export (My Kobo → Export annotations, or similar menus depending on firmware) only reads highlights from books bought through the Kobo store. If your library is mostly sideloaded EPUBs or PDFs, the export can look like it did nothing because it genuinely found nothing to export from those books.",
  },
  {
    question: 'Will any of these methods damage my Kobo or my highlights?',
    answer:
      "No, as long as you only read from KoboReader.sqlite and never edit it while your Kobo is running its own software. Official export, Calibre, manual SQLite queries, and Kobo Note Up all read the database without writing to it, so your device and existing highlights stay untouched.",
  },
  {
    question: 'Do I need to know SQL to get my highlights out?',
    answer:
      'No. Running a manual SQLite query is one valid workaround, but it requires comfort with a terminal and basic SQL. Calibre and Kobo Note Up both give you a normal point-and-click interface instead.',
  },
  {
    question: 'What if my highlights are still truncated after switching tools?',
    answer:
      "Truncation is specific to Kobo's own export pipeline, not to the underlying database — the full highlight text is always stored in KoboReader.sqlite. Any tool that reads the database directly, including Calibre plugins and Kobo Note Up, will show the complete text.",
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

export default function KoboExportNotWorkingGuide() {
  return (
    <div className="py-16 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Heading level={1}>Kobo Export Not Working? Every Fix That Actually Works</Heading>
      <Text className="mt-4">
        If you connected your Kobo, went looking for an export or backup option, and came away
        with nothing — or an export file missing most of your highlights — you are not doing
        anything wrong. The official export feature has real, documented limitations. This guide
        explains exactly why it fails, then compares every workaround honestly so you can pick
        the one that fits how technical you want to get.
      </Text>

      <Subheading level={2} className="mt-12">
        Why Kobo&apos;s official export fails
      </Subheading>
      <Text className="mt-4">
        Kobo stores every highlight, note, and bookmark in a single file on the device called{' '}
        <Strong>KoboReader.sqlite</Strong> — a SQLite database. The device&apos;s own export
        feature reads from this database, but it was built around Kobo Store purchases and has
        two well-known gaps:
      </Text>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>
          <Text>
            <Strong>Sideloaded books are excluded.</Strong> If you added an EPUB or PDF to your
            Kobo yourself — from a library loan, a personal PDF, or a book bought outside the
            Kobo Store — the official export pipeline frequently skips it entirely, even though
            your highlights for that book are sitting in the same database file as everything
            else.
          </Text>
        </li>
        <li>
          <Text>
            <Strong>Long highlights get truncated.</Strong> Passages you highlighted in full can
            come back cut off partway through in the exported file, losing the context that made
            the passage worth marking in the first place.
          </Text>
        </li>
      </ul>
      <Text className="mt-4">
        Neither of these is a sign of data loss. The full highlight text and every sideloaded
        book&apos;s annotations are still stored in KoboReader.sqlite — the problem is entirely in
        how the official export reads and formats that data, not in what Kobo recorded.
      </Text>

      <Subheading level={2} className="mt-12">
        Every workaround, compared honestly
      </Subheading>

      <Subheading level={3} className="mt-8">
        1. Kobo&apos;s official export
      </Subheading>
      <Text className="mt-2">
        <Strong>Best for:</Strong> readers whose entire library is Kobo Store purchases with
        short highlights.{' '}
        <Strong>Downsides:</Strong> skips sideloaded books, truncates long highlights, and offers
        no control over the output format.
      </Text>

      <Subheading level={3} className="mt-8">
        2. Calibre with a Kobo highlights plugin
      </Subheading>
      <Text className="mt-2">
        <Strong>Best for:</Strong> readers who already manage their library in Calibre and don&apos;t
        mind installing a desktop app plus a community plugin.{' '}
        <Strong>Downsides:</Strong> requires installing and maintaining two separate pieces of
        software, and plugin quality/format support varies by which one you pick.
      </Text>

      <Subheading level={3} className="mt-8">
        3. Manually querying KoboReader.sqlite
      </Subheading>
      <Text className="mt-2">
        <Strong>Best for:</Strong> developers comfortable with a terminal who want full control
        over exactly what gets extracted. Copy KoboReader.sqlite off the device, open it with any
        SQLite client, and query the <code>Bookmark</code> table directly.{' '}
        <Strong>Downsides:</Strong> requires SQL knowledge, a SQLite client, and manually mapping
        content IDs back to book titles — not realistic for most readers.
      </Text>

      <Subheading level={3} className="mt-8">
        4. Kobo Note Up (browser-based, no install)
      </Subheading>
      <Text className="mt-2">
        <Strong>Best for:</Strong> anyone who wants sideloaded books included and full highlight
        text preserved, without installing anything.{' '}
        <Strong>How it works:</Strong> it opens KoboReader.sqlite directly inside your browser
        tab using SQL.js, a WebAssembly build of SQLite, and reads every highlight from every
        book the same way — Kobo Store or sideloaded. Nothing is installed on your computer, and
        by default nothing is uploaded anywhere: the file is parsed entirely on your device. The
        honest tradeoff is that it&apos;s a newer, smaller project than Calibre, so it does one
        job (reading and exporting highlights) rather than Calibre&apos;s much broader
        library-management feature set.
      </Text>

      <Subheading level={2} className="mt-12">
        Step-by-step fix using Kobo Note Up
      </Subheading>
      <ol className="mt-4 list-decimal space-y-3 pl-6">
        <li>
          <Text>Connect your Kobo e-reader to your computer with a USB cable. It will mount as a normal removable drive.</Text>
        </li>
        <li>
          <Text>
            Open{' '}
            <TextLink href="/">Kobo Note Up</TextLink>{' '}
            in Chrome, Edge, Firefox, or Safari.
          </Text>
        </li>
        <li>
          <Text>
            <Strong>Chrome or Edge:</Strong> select your Kobo&apos;s root drive folder directly
            when prompted.{' '}
            <Strong>Firefox or Safari:</Strong> these browsers cannot read a USB drive&apos;s root
            folder, so select the <code>.kobo</code> folder inside your Kobo device instead. That
            folder is hidden by default — on Mac, press <code>⌘+Shift+.</code> while the file
            picker is open to reveal it; on Windows, enable &quot;Show hidden files&quot; in
            folder options, or use the Ctrl+H trick some file dialogs support.
          </Text>
        </li>
        <li>
          <Text>The tool automatically finds KoboReader.sqlite and lists every book, sideloaded or not.</Text>
        </li>
        <li>
          <Text>Open any book to see its full, untruncated highlights and notes, and export the whole library or individual books to Markdown.</Text>
        </li>
      </ol>

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
          <TextLink href="/guides/export-kobo-highlights-to-notion">
            Export Kobo highlights to Notion
          </TextLink>
        </li>
        <li>
          <TextLink href="/guides/export-kobo-highlights-to-markdown-obsidian">
            Export Kobo highlights to Markdown for Obsidian
          </TextLink>
        </li>
        <li>
          <TextLink href="/guides/export-kobo-handwritten-notes">
            Export Kobo handwritten notes (stylus)
          </TextLink>
        </li>
      </ul>

      <Text className="mt-8">
        Ready to get every highlight out, including the sideloaded books Kobo&apos;s own export
        ignores?{' '}
        <TextLink href="/">Try Kobo Note Up now</TextLink> — it&apos;s free, open source, and runs
        entirely in your browser.
      </Text>
    </div>
  )
}
