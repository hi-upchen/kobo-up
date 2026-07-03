/**
 * SEO guide: exporting Kobo highlights to Markdown for use in Obsidian (or
 * any other Markdown-based note app). Covers where KoboReader.sqlite lives
 * on each operating system, hidden-folder tips for Firefox/Safari, the
 * step-by-step export flow, and how the resulting file drops straight into
 * an Obsidian vault. Static server component, fully crawlable.
 */
import type { Metadata } from 'next'
import { Heading, Subheading } from '@/components/heading'
import { Text, TextLink, Strong, Code } from '@/components/text'

export const metadata: Metadata = {
  title: 'Export Kobo Highlights to Markdown for Obsidian',
  description:
    'Step-by-step guide to exporting Kobo highlights as Markdown for Obsidian: finding KoboReader.sqlite, hidden-folder tips, and the import process.',
  alternates: {
    canonical: '/guides/export-kobo-highlights-to-markdown-obsidian',
  },
  robots: {
    index: true,
    follow: true,
  },
}

const faqs = [
  {
    question: 'Where exactly is KoboReader.sqlite stored?',
    answer:
      "It's on the Kobo device itself, inside a hidden .kobo folder at the root of the drive. When connected via USB it typically shows up at E:\\.kobo\\KoboReader.sqlite on Windows (drive letter varies), /Volumes/KOBOeReader/.kobo/KoboReader.sqlite on Mac, and /media/[username]/KOBOeReader/.kobo/KoboReader.sqlite on Linux.",
  },
  {
    question: "Why can't Firefox or Safari see my Kobo's root folder?",
    answer:
      "Firefox and Safari don't support the browser API (the File System Access API) that lets Chrome and Edge open a USB drive's root folder directly. They can still read files you explicitly pick, so the fix is to navigate one level deeper and select the .kobo folder itself, which those browsers can open.",
  },
  {
    question: 'Do I need to install an Obsidian plugin to use the exported file?',
    answer:
      "No. The export is a plain .md file using standard Markdown headings, bullet points, and blockquotes. Obsidian reads any Markdown file placed inside its vault folder with no plugin required.",
  },
  {
    question: 'Does the exported Markdown preserve highlight colors and handwritten notes?',
    answer:
      'Highlight colors are preserved as emoji markers next to each highlight. Handwritten annotations from a Kobo stylus are noted in the Markdown text; the full annotation image itself is available through the Notion export path rather than the Markdown export.',
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

export default function ExportKoboHighlightsToMarkdownObsidianGuide() {
  return (
    <div className="py-16 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Heading level={1}>Export Kobo Highlights to Markdown for Obsidian</Heading>
      <Text className="mt-4">
        Obsidian is just a folder of Markdown files on your computer, which makes it one of the
        easiest places to land Kobo highlights — there&apos;s no import wizard or special format
        to learn, you just need a well-structured .md file. This guide covers where your
        highlights actually live on the Kobo device, how to get a browser to see them even on
        Firefox and Safari, and exactly how the export drops into a vault.
      </Text>

      <Subheading level={2} className="mt-12">
        Where KoboReader.sqlite lives on each OS
      </Subheading>
      <Text className="mt-4">
        Every highlight, note, and bookmark on a Kobo device is stored in one SQLite database
        file, <Code>KoboReader.sqlite</Code>, inside a hidden <Code>.kobo</Code> folder at the
        root of the device&apos;s drive. After connecting your Kobo via USB, you&apos;ll typically
        find it at:
      </Text>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>
          <Text>
            <Strong>Windows:</Strong> <Code>E:\.kobo\KoboReader.sqlite</Code> (the drive letter
            depends on your system)
          </Text>
        </li>
        <li>
          <Text>
            <Strong>Mac:</Strong> <Code>/Volumes/KOBOeReader/.kobo/KoboReader.sqlite</Code>
          </Text>
        </li>
        <li>
          <Text>
            <Strong>Linux:</Strong>{' '}
            <Code>/media/[username]/KOBOeReader/.kobo/KoboReader.sqlite</Code>
          </Text>
        </li>
      </ul>
      <Text className="mt-4">
        You don&apos;t need to navigate to this path by hand — Kobo Note Up scans for the file
        automatically once you point it at the device. The paths above are useful mainly for
        understanding what&apos;s happening, or if you want to inspect the database with your own
        tools.
      </Text>

      <Subheading level={2} className="mt-12">
        Hidden-folder tips for Firefox and Safari
      </Subheading>
      <Text className="mt-4">
        Chrome and Edge can open a USB drive&apos;s root folder directly and let Kobo Note Up find
        the database on its own. Firefox and Safari don&apos;t support that browser API, so
        they&apos;ll show an empty or unreadable folder if you select the drive&apos;s root. The
        fix is to select the <Code>.kobo</Code> folder itself, one level in — but that folder is
        hidden by your operating system by default, so you need to reveal it first:
      </Text>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>
          <Text>
            <Strong>Mac:</Strong> in the file picker, press <Code>⌘+Shift+.</Code> (Command,
            Shift, period) to toggle hidden files on, then navigate into <Code>.kobo</Code>.
          </Text>
        </li>
        <li>
          <Text>
            <Strong>Windows:</Strong> enable &quot;Show hidden files&quot; in File Explorer&apos;s
            folder options before opening the file picker, or try the <Code>Ctrl+H</Code> shortcut
            some file dialogs support for the same toggle.
          </Text>
        </li>
      </ul>
      <Text className="mt-4">
        Once <Code>.kobo</Code> is visible and selected, Kobo Note Up reads{' '}
        <Code>KoboReader.sqlite</Code> from inside it exactly the same way it would from a
        root-folder selection.
      </Text>

      <Subheading level={2} className="mt-12">
        Step-by-step: exporting to Markdown
      </Subheading>
      <ol className="mt-4 list-decimal space-y-3 pl-6">
        <li>
          <Text>Connect your Kobo to your computer via USB.</Text>
        </li>
        <li>
          <Text>
            Open <TextLink href="/">Kobo Note Up</TextLink> and select your Kobo&apos;s folder —
            the root folder in Chrome/Edge, or the <Code>.kobo</Code> folder in Firefox/Safari as
            described above.
          </Text>
        </li>
        <li>
          <Text>Browse the list of books the tool finds — sideloaded and Kobo Store purchases alike.</Text>
        </li>
        <li>
          <Text>
            Open a single book and choose &quot;Download as Markdown&quot; for just that book, or
            use the library-wide export to download every book as a ZIP of separate Markdown
            files, or as one combined Markdown file.
          </Text>
        </li>
      </ol>
      <Text className="mt-4">
        Each exported file starts with the book title as a top-level heading and the author as a
        second-level heading, followed by your Kobo chapter structure. Highlights appear as
        bullet points — with a colored emoji marker if you used Kobo&apos;s highlight colors — and
        any notes you attached appear as Markdown blockquotes directly under the highlight they
        belong to.
      </Text>

      <Subheading level={2} className="mt-12">
        Getting the file into Obsidian
      </Subheading>
      <Text className="mt-4">
        Because Obsidian vaults are just folders on disk, there&apos;s no dedicated
        &quot;import&quot; step: move or save the exported <Code>.md</Code> file(s) into any
        folder inside your vault (via Finder, File Explorer, or Obsidian&apos;s own file
        explorer), and it appears in Obsidian&apos;s sidebar immediately. The headings become
        that note&apos;s outline, and each highlight/annotation pair reads as a normal bullet with
        a quoted note beneath it — no plugin or special formatting required. If you&apos;d rather
        review everything in one file, use the combined-library export instead of the per-book
        ZIP and Obsidian will treat it as a single long note.
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
          <TextLink href="/guides/export-kobo-highlights-to-notion">
            Export Kobo highlights to Notion
          </TextLink>
        </li>
      </ul>

      <Text className="mt-8">
        Ready to export? <TextLink href="/">Open Kobo Note Up</TextLink> — free, open source, and
        it never uploads your database during a normal Markdown export.
      </Text>
    </div>
  )
}
