import { GoogleTagManager } from '@next/third-parties/google' 
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { StackedLayout } from '@/components/stacked-layout'
import Footer from '@/app/components/Footer';
import "./globals.css";
import BackgroundShapes from '@/app/components/BackgroundShapes';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-white lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950">
      <head>
        <meta name="description" content="Easily export Kobo highlights and notes with Kobo Note Up. No software installation required. Just connect your Kobo device, open the website, and download your notes in TXT or Markdown format. Perfect for organizing and importing into Notion or other apps." />
        <GoogleTagManager gtmId="GTM-M82SLQZ6" />
      </head>

      <body className="">
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M82SLQZ6" height="0" width="0" style={{ display: "none", visibility: "hidden" }}></iframe></noscript>

        <StackedLayout
          navbar={<Navbar>{/* Your navbar content */}</Navbar>}
          sidebar={<Sidebar>{/* Your sidebar content */}</Sidebar>}
        >
          <BackgroundShapes />
          <div className="mx-auto max-w-7xl px-0 py-2 sm:py-4 lg:px-8 lg:py-5 relative">
            <div className="mx-auto max-w-4xl ">
              {children}
            </div>
          </div>

          <Footer />
        </StackedLayout>
        
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
