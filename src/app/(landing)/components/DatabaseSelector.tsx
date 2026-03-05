import React, { useRef } from 'react'
import { Strong, Text } from '@/components/text'

type FolderPickerSupport = 'directory-api' | 'webkitdirectory' | 'file-only'

interface DatabaseSelectorProps {
  supportLevel: FolderPickerSupport
  onDirectorySelect: () => void
  onWebkitDirectorySelect: (files: FileList) => void
  onFileSelect: (file: File) => void
  onEmptyDirectory?: () => void
}

const folderIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="mx-auto h-12 w-12 text-gray-400"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15"
    />
  </svg>
)

const boxClasses = "relative block w-full rounded-lg border-2 border-dashed border-indigo-700 p-12 text-center hover:border-indigo-600 transition cursor-pointer"

export function DatabaseSelector({
  supportLevel,
  onDirectorySelect,
  onWebkitDirectorySelect,
  onFileSelect,
  onEmptyDirectory,
}: DatabaseSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDirectoryInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      onWebkitDirectorySelect(files)
    } else {
      onEmptyDirectory?.()
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  if (supportLevel === 'directory-api') {
    return (
      <div className="space-y-6">
        <button
          type="button"
          className={boxClasses}
          onClick={onDirectorySelect}
        >
          {folderIcon}
          <Text className="mt-6 block text-sm font-semibold animate-bounce">
            Click here and Select your <Strong>Kobo Root folder</Strong>
          </Text>
        </button>
      </div>
    )
  }

  if (supportLevel === 'webkitdirectory') {
    return (
      <div className="space-y-6">
        <label className={boxClasses}>
          {folderIcon}
          <Text className="mt-6 block text-sm font-semibold animate-bounce">
            Click here and Select the <Strong>.kobo folder</Strong> on your Kobo device
          </Text>
          <Text className="mt-3 block text-xs text-gray-400 dark:text-gray-500">
            Can&apos;t see the .kobo folder? Press <Strong>⌘+Shift+.</Strong> on Mac or <Strong>Ctrl+H</Strong> on Windows to show hidden folders
          </Text>
          <input
            ref={(el) => {
              if (el) el.setAttribute('webkitdirectory', '')
            }}
            type="file"
            onChange={handleDirectoryInputChange}
            className="sr-only"
          />
        </label>
      </div>
    )
  }

  // file-only fallback
  return (
    <div className="space-y-6">
      <button
        type="button"
        className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400 transition"
        onClick={() => fileInputRef.current?.click()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="mx-auto h-8 w-8 text-gray-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
        <Text className="mt-2 block text-sm font-medium">
          Upload <Strong>KoboReader.sqlite</Strong> file
        </Text>
        <Text className="mt-1 block text-xs text-gray-500">
          Usually found in .kobo folder on your Kobo device
        </Text>
        <Text className="mt-2 block text-xs text-amber-600 dark:text-amber-400">
          Handwriting annotations require Chrome, Edge, Firefox, or Safari
        </Text>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".sqlite,.db"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  )
}
