import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kobo Export Not Working? Fixed - Kobo Note Up',
  description: 'Fix broken Kobo export instantly. Works with sideloaded books when official export fails. Browser-based, private, no installation required.',
  keywords: [
    'kobo export highlights',
    'kobo export notes',
    'kobo highlights tool',
    'export kobo annotations',
    'kobo export not working',
    'kobo export broken',
    'export sideloaded kobo books',
    'kobo highlights export tool',
    'kobo notes extraction',
    'browser kobo export'
  ],
  authors: [{ name: 'Kobo Note Up Team' }],
  creator: 'Kobo Note Up',
  publisher: 'Kobo Note Up',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://kobo-up.runawayup.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Kobo Export Not Working? Fixed - Kobo Note Up',
    description: 'Fix broken Kobo export instantly. Works with sideloaded books when official export fails. Browser-based, private, no installation required.',
    url: 'https://kobo-up.runawayup.com',
    siteName: 'Kobo Note Up',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kobo Export Not Working? Fixed - Kobo Note Up',
    description: 'Fix broken Kobo export instantly. Works with sideloaded books when official export fails. Browser-based, private.',
    creator: '@kobonoteup',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Google Search Console ownership verification. The token was issued via the
  // Site Verification API for this site; removing it revokes verified access
  // to search performance data.
  verification: {
    google: 'hlfoIIZK-7THAZp9tm5HHeHhgxdUN2uwDIjqag3O7mY',
  },
}