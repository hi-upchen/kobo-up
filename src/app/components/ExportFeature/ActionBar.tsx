'use client'

import React from 'react'
import { Button } from '@/components/button'
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from '@/components/dropdown'

interface ActionBarProps {
  selectedCount: number
  totalBooks: number
  actionBarState: 'default' | 'selection'
  onExportAll: () => void
  onExportSelected: () => void
  onClearSelection: () => void
}

export function ActionBar({
  selectedCount,
  totalBooks,
  actionBarState,
  onExportAll,
  onExportSelected,
  onClearSelection
}: ActionBarProps) {
  if (actionBarState === 'default') {
    return (
      <div className="bg-gray-100 border-b border-gray-200 py-3 transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center pl-6">
            <span className="text-sm text-gray-600">
              {totalBooks} books in your library
            </span>
          </div>
          <div className="px-6">
            <Button outline onClick={onExportAll} aria-label="Export all books">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 py-3 transform transition-all duration-200 animate-slide-down">
      <div className="flex items-center justify-between">
        <div className="flex items-center pl-6 gap-4">
          <span className="text-sm font-medium text-blue-900">
            {selectedCount} selected
          </span>
          <button 
            className="text-sm text-blue-600 hover:underline"
            onClick={onClearSelection}
          >
            Clear selection
          </button>
        </div>
        <div className="flex gap-2 px-6">
          <Button onClick={onExportSelected}>
            Export selected
          </Button>
        </div>
      </div>
    </div>
  )
}