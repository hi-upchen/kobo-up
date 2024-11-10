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
      <body className="">
        
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
      </body>
    </html>
  );
}
