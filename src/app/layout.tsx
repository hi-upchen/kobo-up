import { Navbar, NavbarDivider, NavbarItem, NavbarLabel, NavbarSection, NavbarSpacer } from '@/components/navbar'
import { Sidebar, SidebarBody, SidebarHeader, SidebarItem, SidebarLabel, SidebarSection } from '@/components/sidebar'
import { StackedLayout } from '@/components/stacked-layout'
import "./globals.css";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-white lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950">
      <body>
        <StackedLayout
          navbar={<Navbar>{/* Your navbar content */}</Navbar>}
          sidebar={<Sidebar>{/* Your sidebar content */}</Sidebar>}
        >
          {children}
        </StackedLayout>
      </body>
    </html>
  );
}
