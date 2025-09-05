'use client'

import React, { useState } from 'react'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/dialog'
import { Button } from '@/components/button'
import { DocumentTextIcon, ArchiveBoxIcon, DocumentIcon, FolderIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

export type ExportFormat = 'markdown' | 'text'
export type ExportStructure = 'single' | 'zip'

interface ExportModalProps {
  isOpen: boolean
  mode: 'all' | 'selected'
  selectedCount: number
  totalBooks: number
  onConfirm: (format: ExportFormat, structure: ExportStructure) => void
  onClose: () => void
}

export function ExportModal({
  isOpen,
  mode,
  selectedCount,
  totalBooks,
  onConfirm,
  onClose
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown')
  const [selectedStructure, setSelectedStructure] = useState<ExportStructure>('zip')

  const handleDownload = () => {
    onConfirm(selectedFormat, selectedStructure)
  }

  const handleClose = () => {
    setSelectedFormat('markdown')
    setSelectedStructure('zip')
    onClose()
  }

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <DialogTitle>Export Notes & Highlights</DialogTitle>
      <DialogDescription>
        {mode === 'all' 
          ? `${totalBooks} books in your library`
          : `${selectedCount} book${selectedCount > 1 ? 's' : ''} selected`}
      </DialogDescription>
      
      <DialogBody>
        <div className="space-y-6">
          {/* Format Selection Group */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Format
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
                <input
                  type="radio"
                  name="format"
                  value="markdown"
                  checked={selectedFormat === 'markdown'}
                  onChange={() => setSelectedFormat('markdown')}
                  className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Markdown (.md)</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Perfect for Notion, Obsidian, and documentation platforms
                  </div>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
                <input
                  type="radio"
                  name="format"
                  value="text"
                  checked={selectedFormat === 'text'}
                  onChange={() => setSelectedFormat('text')}
                  className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Plain Text (.txt)</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Universal compatibility across all applications
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Structure Selection Group */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              File Structure
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
                <input
                  type="radio"
                  name="structure"
                  value="zip"
                  checked={selectedStructure === 'zip'}
                  onChange={() => setSelectedStructure('zip')}
                  className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Separate files (ZIP archive)</div>
                  <div className="text-sm text-gray-500 mt-1">
                    One file per book - easier to organize and import individually
                  </div>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
                <input
                  type="radio"
                  name="structure"
                  value="single"
                  checked={selectedStructure === 'single'}
                  onChange={() => setSelectedStructure('single')}
                  className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Combined file</div>
                  <div className="text-sm text-gray-500 mt-1">
                    All books merged into a single document
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </DialogBody>
      
      <DialogActions>
        <Button plain onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleDownload}>
          Download
        </Button>
      </DialogActions>
    </Dialog>
  )
}