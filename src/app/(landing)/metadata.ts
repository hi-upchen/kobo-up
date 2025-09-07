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
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Kobo Note Up - Export Kobo Highlights & Notes',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kobo Export Not Working? Fixed - Kobo Note Up',
    description: 'Fix broken Kobo export instantly. Works with sideloaded books when official export fails. Browser-based, private.',
    images: ['/og-image.jpg'],
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
  verification: {
    google: 'your-google-verification-code',
  },
}