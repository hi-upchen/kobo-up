/**
 * Privacy disclosure page. Explains, in plain language, exactly what data
 * Kobo Note Up processes and — critically — the specific optional features
 * that transmit data off the user's device. This page exists because the
 * marketing copy elsewhere on the site (landing page, FAQ) makes a strong
 * "100% private / never transmitted" claim that is only true for the core,
 * default flow. Debug database sharing and Notion export are opt-in
 * exceptions and must be disclosed here so the overall claim stays honest.
 * Static server component: no client state, safe to index for SEO.
 */
import type { Metadata } from 'next'
import { Heading, Subheading } from '@/components/heading'
import { Text, TextLink, Strong } from '@/components/text'

export const metadata: Metadata = {
  title: 'Privacy — Kobo Note Up',
  description:
    'What Kobo Note Up does and does not do with your data: browser-only processing by default, plus exactly what the optional debug-share and Notion export features transmit.',
  alternates: {
    canonical: '/privacy',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function PrivacyPage() {
  return (
    <div className="py-16 sm:py-24">
      <Heading level={1}>Privacy</Heading>
      <Text className="mt-4">
        Last updated 2026-07-03. This page describes exactly what Kobo Note Up does with your
        data — including the parts that are easy to gloss over in marketing copy. If anything
        here is unclear, email{' '}
        <TextLink href="mailto:hi.upchen@gmail.com">hi.upchen@gmail.com</TextLink>.
      </Text>

      <Subheading level={2} className="mt-12">
        The core promise: reading and exporting happen in your browser
      </Subheading>
      <Text className="mt-4">
        When you use Kobo Note Up to read a Kobo database and export highlights to Markdown or
        plain text, that entire process runs on your device using{' '}
        <Strong>SQL.js</Strong>, a WebAssembly build of SQLite that executes inside your browser
        tab. Your Kobo database file is read from disk by your browser, parsed in memory, and
        never uploaded anywhere during this normal flow. There is no server-side database that
        stores your books, highlights, or reading history.
      </Text>
      <Text className="mt-4">
        This is the default behavior for everyone. The two features below are the only
        exceptions, and both require you to take an explicit action first.
      </Text>

      <Subheading level={2} className="mt-12">
        Optional feature: sharing your database for debugging
      </Subheading>
      <Text className="mt-4">
        The footer has a &quot;Share KoboDB for debugging&quot; button. Nothing happens unless
        you click it and then confirm the dialog that follows.
      </Text>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>
          <Text>
            <Strong>What:</Strong> your entire Kobo database file, which contains your reading
            and annotation data (book titles, highlights, notes).
          </Text>
        </li>
        <li>
          <Text>
            <Strong>Where:</Strong> uploaded to Vercel Blob, our file storage provider. The
            resulting file is stored at an unguessable, randomly-suffixed URL, but the storage
            itself is not access-restricted — do not use this feature if your annotations
            contain anything sensitive.
          </Text>
        </li>
        <li>
          <Text>
            <Strong>Why:</Strong> to help the developer (Up Chen) reproduce bugs against a real
            database when something in the app breaks.
          </Text>
        </li>
        <li>
          <Text>
            <Strong>Notification:</Strong> uploading triggers an automatic email to the
            developer containing the file&apos;s storage URL and the upload timestamp.
          </Text>
        </li>
        <li>
          <Text>
            <Strong>Deletion:</Strong> email{' '}
            <TextLink href="mailto:hi.upchen@gmail.com">hi.upchen@gmail.com</TextLink> and the
            uploaded file will be deleted on request.
          </Text>
        </li>
      </ul>

      <Subheading level={2} className="mt-12">
        Optional feature: exporting highlights to Notion
      </Subheading>
      <Text className="mt-4">
        If you connect your Notion account, exporting highlights to Notion works differently
        from the default Markdown/text export.
      </Text>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>
          <Text>
            <Strong>What:</Strong> the highlights, notes, and any handwritten-annotation images
            you choose to export.
          </Text>
        </li>
        <li>
          <Text>
            <Strong>Where:</Strong> this content is sent from your browser to our server, which
            forwards it to Notion&apos;s API on your behalf. It passes through our server
            in-flight but is not stored there — it is not written to a database.
          </Text>
        </li>
        <li>
          <Text>
            <Strong>Why:</Strong> Notion&apos;s API requires a server-side OAuth flow and
            authenticated API calls; a pure browser export isn&apos;t possible for this
            destination the way local Markdown export is.
          </Text>
        </li>
        <li>
          <Text>
            <Strong>Your Notion access token:</Strong> stored in an encrypted, HTTP-only
            browser cookie (not in a server-side database), expires after 7 days, and is only
            ever sent back to our server to make the export request to Notion&apos;s API on
            your behalf.
          </Text>
        </li>
      </ul>

      <Subheading level={2} className="mt-12">
        Analytics
      </Subheading>
      <Text className="mt-4">
        We use Google Tag Manager, Google Analytics, and Vercel Analytics to see anonymous usage
        patterns — for example, which pages are visited and whether a page load succeeded. These
        tools record page views and interaction events. They do not receive your book titles,
        highlights, notes, or any other reading content; that data stays inside the browser flow
        described above unless you explicitly use one of the two features above.
      </Text>

      <Subheading level={2} className="mt-12">
        What we don&apos;t do
      </Subheading>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li><Text>No user accounts or sign-in — there is nothing to register.</Text></li>
        <li><Text>No selling, renting, or sharing of your data with third parties for advertising.</Text></li>
        <li><Text>No server-side database that stores your reading content by default.</Text></li>
      </ul>

      <Subheading level={2} className="mt-12">
        Questions or deletion requests
      </Subheading>
      <Text className="mt-4">
        Kobo Note Up is open source under the MIT license — you can read every line of code that
        handles your data at{' '}
        <TextLink href="https://github.com/hi-upchen/kobo-up" target="_blank" rel="noopener noreferrer">
          github.com/hi-upchen/kobo-up
        </TextLink>
        . For anything else, including deleting a debug-shared database, email{' '}
        <TextLink href="mailto:hi.upchen@gmail.com">hi.upchen@gmail.com</TextLink>.
      </Text>
    </div>
  )
}
