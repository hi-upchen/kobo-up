/**
 * SEO guide: exporting Kobo stylus/handwritten notes. Targets the query space
 * that Kobo's own export and other tools leave empty — handwritten stylus
 * markups. Honestly explains the wedge (official export and third-party tools
 * drop handwriting; Kobo Note Up renders it inline and can export it), points
 * to the no-signup sample library as zero-risk proof, and walks through the
 * connect-and-view flow. Static server component so it is fully crawlable —
 * the copy states exactly what each export format does (Notion export embeds
 * the annotation image; Markdown/plain-text note it in words), matching the
 * actual behavior in exportService, notionExportService, and the generators.
 */
import type { Metadata } from 'next'
import { Heading, Subheading } from '@/components/heading'
import { Text, TextLink, Strong } from '@/components/text'

export const metadata: Metadata = {
  title: 'Export Kobo Handwritten Notes (Stylus) — Kobo Note Up',
  description:
    "Export Kobo stylus and handwritten notes that the official export drops. Kobo Note Up renders your Elipsa, Sage, or Libra Colour ink annotations inline and exports them — try it on a sample library, no install.",
  alternates: {
    canonical: '/guides/export-kobo-handwritten-notes',
  },
  robots: {
    index: true,
    follow: true,
  },
}

const faqs = [
  {
    question: 'Why does the official Kobo export leave out my handwritten notes?',
    answer:
      "Kobo's built-in annotation export was built around text highlights. Handwritten stylus markups are stored separately on the device as image files (an SVG of your ink strokes plus a JPG screenshot of the page), inside the .kobo/markups folder rather than in the highlight rows the export reads. So the official export — and most third-party tools that only read the highlight table — simply skip them.",
  },
  {
    question: 'Which Kobo devices does handwriting export work with?',
    answer:
      'Any Kobo that writes stylus markups to its .kobo/markups folder — that covers the stylus-capable models such as the Kobo Elipsa, Elipsa 2E, Sage, and Libra Colour. Kobo Note Up reads whatever handwritten markup files the device saved, so it is not tied to one specific model.',
  },
  {
    question: 'Does the exported file actually contain my handwriting image?',
    answer:
      "It depends on the export format. The Notion export embeds each handwritten annotation as an image block — your ink strokes composited over the page screenshot — right alongside the text highlights. The Markdown and plain-text exports are text-only files, so they mark the spot where a handwritten annotation belongs with a labeled line rather than embedding the image itself. In every case you can view and expand the full handwriting image inside Kobo Note Up in your browser.",
  },
  {
    question: 'Can I try handwriting export without connecting my Kobo?',
    answer:
      'Yes. The homepage has a "Try with a sample library" option that loads a small sample library, including a book with a real handwritten annotation on a page, so you can see exactly how ink strokes render and expand before you plug in your own device.',
  },
  {
    question: 'Does this export standalone Kobo notebooks, or only handwriting inside books?',
    answer:
      "It handles the handwritten annotations you draw on book pages with the stylus — the ink markups saved next to a book's highlights. Kobo's separate standalone Notebook documents (the blank freehand notebooks you create outside of a book) are stored differently on the device and aren't part of this flow. If your handwriting is a markup on a page you were reading, Kobo Note Up renders and exports it.",
  },
  {
    question: 'Is my data uploaded when I view handwritten notes?',
    answer:
      "No. Reading your database and rendering handwritten annotations happen entirely in your browser. The one export path that transmits data is the optional Notion export, which has to send content to Notion's API through the app's server on your behalf — every other flow, including viewing your handwriting and Markdown export, stays on your device.",
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

export default function ExportKoboHandwrittenNotesGuide() {
  return (
    <div className="py-16 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Heading level={1}>Export Kobo Handwritten Notes (Stylus)</Heading>
      <Text className="mt-4">
        If you write on your Kobo with a stylus — margin notes, underlines, a star next to a
        passage — and then find those handwritten markups missing from your export, you are not
        imagining it. Kobo&apos;s official annotation export, and most other tools, only pull text
        highlights and leave handwriting behind. This guide explains why that happens and how Kobo
        Note Up renders and exports your stylus notes alongside the text.
      </Text>

      <Subheading level={2} className="mt-12">
        Why handwritten notes get dropped
      </Subheading>
      <Text className="mt-4">
        A Kobo stores text highlights and handwritten markups in two different places. Highlights
        live as rows in the <Strong>KoboReader.sqlite</Strong> database. Handwritten stylus
        markups are saved separately as image files — an SVG of your actual ink strokes plus a JPG
        screenshot of the page — inside a <Strong>.kobo/markups</Strong> folder on the device.
      </Text>
      <Text className="mt-4">
        Kobo&apos;s built-in export reads the highlight rows, so it never touches the handwriting
        files. The same is true of most third-party exporters, Readwise-style importers, and
        Obsidian plugins: they were built for text highlights and simply don&apos;t know the
        markup images exist. That is the gap Kobo Note Up fills — it reads both.
      </Text>

      <Subheading level={2} className="mt-12">
        See it before you connect anything
      </Subheading>
      <Text className="mt-4">
        The fastest way to check this is real is to look at it. On the{' '}
        <TextLink href="/">Kobo Note Up homepage</TextLink>, choose{' '}
        <Strong>&quot;No Kobo handy? Try with a sample library&quot;</Strong>. That loads a small
        sample library with no signup and no upload. One of the sample book&apos;s pages carries a
        genuine handwritten annotation — a blue-ink margin bracket, an underline, and a star drawn
        over the rendered page — so you can see exactly how your own stylus notes will appear and
        click to expand the full page. It costs nothing and proves the feature works before you
        plug in your device.
      </Text>

      <Subheading level={2} className="mt-12">
        Step by step: export your Kobo handwritten notes
      </Subheading>
      <ol className="mt-4 list-decimal space-y-3 pl-6">
        <li>
          <Text>
            Connect your Kobo to your computer with a USB cable, then open{' '}
            <TextLink href="/">Kobo Note Up</TextLink> in your browser. In Chrome or Edge, select
            your Kobo&apos;s root drive folder; in Firefox or Safari, select the hidden{' '}
            <Strong>.kobo</Strong> folder inside the device instead. You can also upload your{' '}
            <Strong>KoboReader.sqlite</Strong> file directly if you prefer.
          </Text>
        </li>
        <li>
          <Text>
            The tool automatically finds your database and, when you select the whole folder, the
            paired handwriting files in <Strong>.kobo/markups</Strong> alongside it. It then lists
            every book — Kobo Store purchases and sideloaded titles alike.
          </Text>
        </li>
        <li>
          <Text>
            Open a book&apos;s notes. Text highlights appear in reading order, and each handwritten
            annotation renders inline as your ink strokes overlaid on a screenshot of that page.
            Click any annotation to expand it to full size.
          </Text>
        </li>
        <li>
          <Text>
            Export the book. The <Strong>Notion export</Strong> embeds each handwritten annotation
            as an image block next to your highlights. The <Strong>Markdown</Strong> and{' '}
            <Strong>plain-text</Strong> exports are text files, so they label where each
            handwritten annotation belongs rather than embedding the image — the image stays
            viewable in the app and in the Notion export.
          </Text>
        </li>
      </ol>
      <Text className="mt-4">
        If preserving the handwriting image in the exported document matters to you, use the Notion
        export — it is the path that carries the rendered annotation through end to end. If you
        only need a record of where you annotated, the Markdown and plain-text exports note each
        handwritten markup in place.
      </Text>

      <Subheading level={2} className="mt-12">
        What Kobo Note Up does — and doesn&apos;t — claim
      </Subheading>
      <Text className="mt-4">
        Kobo Note Up shows your handwriting as an image: the SVG ink strokes your stylus recorded,
        layered over the page screenshot Kobo saved. It does not perform handwriting recognition,
        so it will not turn your script into typed text — what you wrote is preserved visually,
        exactly as it looked on the page. Your text highlights, notes, and highlight colors come
        through as text in every export format.
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
          <TextLink href="/guides/export-kobo-highlights-to-notion">
            Export Kobo highlights to Notion
          </TextLink>
        </li>
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
        Ready to see your stylus notes? <TextLink href="/">Open Kobo Note Up</TextLink> — it&apos;s
        free, open source, and you can try the sample library before connecting your own Kobo.
      </Text>
    </div>
  )
}
