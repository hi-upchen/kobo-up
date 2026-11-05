/**
 * Announcement page for the coming Kobo Note Up Pro plan.
 * It states the price, what Pro will include, and that nothing is locked yet.
 * Static server component, so the copy is fully crawlable.
 */
import type { Metadata } from 'next'
import { Heading, Subheading } from '@/components/heading'
import { Text, TextLink, Strong } from '@/components/text'
import { ProCheckoutButton } from '@/components/ProCheckoutButton'

export const metadata: Metadata = {
  title: 'Kobo Note Up Pro — Early-bird Lifetime License',
  description:
    'Kobo Note Up Pro is coming: a one-time US$19 lifetime license. Free export stays free. No Pro feature is locked yet.',
  alternates: {
    canonical: '/pro',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function ProPage() {
  return (
    <div className="py-16 sm:py-24">
      <Heading level={1}>Kobo Note Up Pro is coming</Heading>
      <Text className="mt-4">
        Pro is a one-time lifetime license. There is no subscription. The early-bird price is{' '}
        <Strong>US$19</Strong>. The price may rise later.
      </Text>

      <div className="mt-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-zinc-800">
        <Text>
          <Strong>No Pro feature is locked yet.</Strong> Everything on this site works as it did
          before. The Pro features below are not gated today.
        </Text>
      </div>

      <Subheading level={2} className="mt-12">
        What stays free
      </Subheading>
      <Text className="mt-4">
        Free stays free. Nothing you use today for one-book export is being taken away.
      </Text>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>
          <Text>Export one book at a time to Markdown, plain text, or Notion.</Text>
        </li>
        <li>
          <Text>Batch export of up to about 10 books.</Text>
        </li>
      </ul>

      <Subheading level={2} className="mt-12">
        What Pro will unlock
      </Subheading>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>
          <Text>Whole-library batch export, to files and to Notion.</Text>
        </li>
        <li>
          <Text>Handwritten-notes export.</Text>
        </li>
        <li>
          <Text>Future new features.</Text>
        </li>
      </ul>
      <Text className="mt-4">
        There is no launch date yet. The site will announce it before any feature is gated.
      </Text>

      <Subheading level={2} className="mt-12">
        How early purchase works
      </Subheading>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>
          <Text>Polar emails you a license key automatically after you pay.</Text>
        </li>
        <li>
          <Text>
            You get the key now. It will unlock Pro features when they launch.
          </Text>
        </li>
        <li>
          <Text>Each key works on up to 3 devices and never expires.</Text>
        </li>
      </ul>

      <div className="mt-8">
        <ProCheckoutButton location="pro_page" />
        <Text className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          The button opens the Polar checkout in a new tab.
        </Text>
      </div>

      <Text className="mt-12 text-sm">
        <TextLink href="/">Back to Kobo Note Up</TextLink>
      </Text>
    </div>
  )
}
