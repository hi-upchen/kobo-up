'use client'

import React, { useEffect, useState } from 'react'
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu, DropdownDescription, DropdownLabel, DropdownDivider } from '@/components/dropdown'
import { checkNotionConnection, disconnectNotion } from '@/services/notionExportService'
import type { IBook, IBookChapter } from '@/types/kobo'

interface NotesExportDropdownProps {
  book: IBook | null
  bookChapters: IBookChapter[] | null
  onExportMarkdown: (book: IBook, chapters: IBookChapter[]) => void
  onExportNotion: (book: IBook, chapters: IBookChapter[]) => void
  onDisconnectNotion?: () => void
}

export function NotesExportDropdown({ book, bookChapters, onExportMarkdown, onExportNotion, onDisconnectNotion }: NotesExportDropdownProps) {
  const [isNotionConnected, setIsNotionConnected] = useState(false)

  useEffect(() => {
    checkNotionConnection()
      .then((status) => setIsNotionConnected(status.connected))
      .catch(() => setIsNotionConnected(false))
  }, [])

  const handleExportMarkdown = () => {
    if (!book || !bookChapters) {
      console.error('Book data is not available')
      return
    }
    onExportMarkdown(book, bookChapters)
  }

  const handleExportNotion = () => {
    if (!book || !bookChapters) {
      console.error('Book data is not available')
      return
    }

    if (!isNotionConnected) {
      const returnUrl = window.location.pathname
      window.location.href = `/api/notion/auth?returnUrl=${encodeURIComponent(returnUrl)}`
      return
    }

    onExportNotion(book, bookChapters)
  }

  const handleDisconnectNotion = async () => {
    try {
      await disconnectNotion()
      setIsNotionConnected(false)
      onDisconnectNotion?.()
    } catch (error) {
      console.error('Failed to disconnect from Notion:', error)
    }
  }

  return (
    <div className="ml-auto">
      <Dropdown>
        <DropdownButton outline aria-label="Export options">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13" />
          </svg>
        </DropdownButton>
        <DropdownMenu anchor="bottom end">
          <DropdownItem onClick={handleExportMarkdown}>
            <DropdownLabel className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="size-4 shrink-0" fill="currentColor">
                <path d="M14.85 3c.63 0 1.15.52 1.15 1.15v7.7c0 .63-.52 1.15-1.15 1.15H1.15C.52 13 0 12.48 0 11.85V4.15C0 3.52.52 3 1.15 3h13.7zM9 11V5H7l-1.5 2L4 5H2v6h2V8l1.5 1.92L7 8v3h2zm2.99.5L14.5 8H13V5h-2v3H9.5l2.49 3.5z" />
              </svg>
              Download as Markdown
            </DropdownLabel>
            <DropdownDescription>Export your highlights and notes.</DropdownDescription>
          </DropdownItem>

          <DropdownDivider />

          <DropdownItem onClick={handleExportNotion}>
            <DropdownLabel className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor">
                <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.166V6.354c0-.606-.233-.933-.748-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.046-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
              </svg>
              {isNotionConnected ? 'Export to Notion' : 'Connect & Export to Notion'}
              {' '}
              <span className="text-amber-500 text-xs font-medium">(Experimental)</span>
            </DropdownLabel>
            <DropdownDescription>
              {isNotionConnected
                ? 'Send highlights and notes to a Notion page.'
                : 'Connect your Notion account to export.'}
            </DropdownDescription>
          </DropdownItem>

          {isNotionConnected && (
            <DropdownItem onClick={handleDisconnectNotion}>
              <DropdownLabel>Disconnect Notion</DropdownLabel>
              <DropdownDescription>Remove your Notion connection.</DropdownDescription>
            </DropdownItem>
          )}
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}
