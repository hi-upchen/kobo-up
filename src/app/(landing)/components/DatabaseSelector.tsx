import React, { useRef } from 'react'
import { Strong, Text } from '@/components/text'

interface DatabaseSelectorProps {
  isDirectoryPickerSupported: boolean
  onFileSelect: (file: File) => void
  onDirectorySelect: () => void
}

export function DatabaseSelector({ 
  isDirectoryPickerSupported, 
  onFileSelect, 
  onDirectorySelect 
}: DatabaseSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  const handleFileButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-6">
      {/* Directory Picker (only show when API is supported) */}
      {isDirectoryPickerSupported ? (
        <button
          type="button"
          className="relative block w-full rounded-lg border-2 border-dashed border-indigo-700 p-12 text-center hover:border-indigo-600 transition"
          onClick={onDirectorySelect}
        >
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
          <Text className="mt-6 block text-sm font-semibold animate-bounce">
            Click here and Select your <Strong>Kobo Root folder</Strong>
          </Text>
        </button>
      ) : (
        /* Fallback: Direct file upload when Directory Picker is not supported */
        <button
          type="button"
          className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400 transition"
          onClick={handleFileButtonClick}
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
        </button>
      )}

      {/* Hidden file input */}
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