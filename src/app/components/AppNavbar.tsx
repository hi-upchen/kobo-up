'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Navbar, NavbarSection, NavbarItem, NavbarSpacer } from '@/components/navbar'
import { KoboService } from '@/services/koboService'

function BookIcon() {
  return (
    <svg
      data-slot="icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10.75 16.82A7.462 7.462 0 0 1 15 15.5c.71 0 1.396.098 2.046.282A.75.75 0 0 0 18 15.06V4.31a.75.75 0 0 0-.546-.721A9.006 9.006 0 0 0 15 3.25a9.007 9.007 0 0 0-4.25 1.065v12.505ZM9.25 4.315A9.007 9.007 0 0 0 5 3.25a9.006 9.006 0 0 0-2.454.339A.75.75 0 0 0 2 4.31v10.75a.75.75 0 0 0 .954.721A7.506 7.506 0 0 1 5 15.5c1.579 0 3.042.487 4.25 1.32V4.315Z" />
    </svg>
  )
}

export function AppNavbar() {
  const [hasData, setHasData] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    let cancelled = false
    async function checkData() {
      try {
        const result = await KoboService.hasStoredData()
        if (!cancelled) setHasData(result)
      } catch {
        if (!cancelled) setHasData(false)
      }
    }
    checkData()
    return () => { cancelled = true }
  }, [pathname])

  return (
    <Navbar>
      <NavbarSection>
        <NavbarItem href="/" aria-label="Home">
          <span className="text-base font-semibold tracking-tight text-indigo-600 dark:text-indigo-400">
            Kobo Note Up
          </span>
        </NavbarItem>
      </NavbarSection>

      <NavbarSpacer />

      {hasData && (
        <NavbarSection>
          <NavbarItem href="/books" current={pathname.startsWith('/book')}>
            <BookIcon />
            <span>Library</span>
          </NavbarItem>
        </NavbarSection>
      )}
    </Navbar>
  )
}
