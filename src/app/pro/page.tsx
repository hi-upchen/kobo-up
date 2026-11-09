/**
 * Announcement page for the coming Kobo Note Up Pro plan.
 * It states the price, the free and Pro lists, the start date of the limits,
 * and how a license key unlocks Pro. The copy is a server component, so it
 * is crawlable. The key entry form is a client component.
 */
import type { Metadata } from 'next'
import { Heading, Subheading } from '@/components/heading'
import { Text, TextLink, Strong } from '@/components/text'
import { ProCheckoutButton } from '@/components/ProCheckoutButton'
import { LicenseEntry } from '@/components/LicenseEntry'
import { POLAR_CUSTOMER_PORTAL_URL } from '@/lib/pro/polarConfig'

export const metadata: Metadata = {
  title: 'Kobo Note Up Pro — Early-bird Lifetime License',
  description:
    'Kobo Note Up Pro is a one-time US$19 lifetime license. Free export stays free. Pro limits start on 2026-11-19. Until then everything stays free.',
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
      <Heading level={1}>Kobo Note Up Pro</Heading>
      <Text className="mt-4">
        Pro is a one-time lifetime license. There is no subscription. The early-bird price is{' '}
        <Strong>US$19</Strong>. The price may rise later.
      </Text>

      <div className="mt-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-zinc-800">
        <Text>
          <Strong>Pro limits start on 2026-11-19.</Strong> Until 2026-11-19 everything stays free.
          From that day, the Pro features below need a license key.
        </Text>
      </div>

      <Subheading level={2} className="mt-12">
        What stays free
      </Subheading>
      <Text className="mt-4">
        Exporting one book at a time stays free forever, in every format.
      </Text>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>
          <Text>Export one book at a time to Markdown, plain text, or Notion.</Text>
        </li>
        <li>
          <Text>Bulk export of up to 10 books at once, to files or to Notion.</Text>
        </li>
      </ul>

      <Subheading level={2} className="mt-12">
        What Pro unlocks
      </Subheading>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>
          <Text>Bulk export of more than 10 books at once (the whole library), to files and to Notion.</Text>
        </li>
        <li>
          <Text>Handwritten (stylus) annotation export.</Text>
        </li>
        <li>
          <Text>Future new features.</Text>
        </li>
      </ul>

      <Subheading level={2} className="mt-12">
        How early purchase works
      </Subheading>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>
          <Text>Polar emails you a license key automatically after you pay.</Text>
        </li>
        <li>
          <Text>
            Enter the key in the box below. Pro unlocks immediately in that browser.
          </Text>
        </li>
        <li>
          <Text>
            Each key works on up to 3 devices and never expires. To free a device, use the{' '}
            <TextLink href={POLAR_CUSTOMER_PORTAL_URL}>Polar customer portal</TextLink>.
          </Text>
        </li>
      </ul>

      <div className="mt-8">
        <ProCheckoutButton location="pro_page" />
        <Text className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          The button opens the Polar checkout in a new tab.
        </Text>
      </div>

      <Subheading level={2} className="mt-12">
        Already have a key?
      </Subheading>
      <div className="mt-4">
        <LicenseEntry />
      </div>

      <Text className="mt-12 text-sm">
        <TextLink href="/">Back to Kobo Note Up</TextLink>
      </Text>
    </div>
  )
}
