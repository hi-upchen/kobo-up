'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { KoboService } from '@/services/koboService'
import { NavigationService } from '@/services/navigationService'
import { ErrorService } from '@/services/errorService'
import { DatabaseSelector } from './components/DatabaseSelector'
import Footer from '@/components/Footer'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { HeroHeading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import Steps from '@/app/components/Steps'
import FAQ from '@/app/components/FAQ'

export default function LandingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirectoryPickerSupported, setIsDirectoryPickerSupported] = useState(true)

  useEffect(() => {
    // Check if File System Access API is supported
    setIsDirectoryPickerSupported('showDirectoryPicker' in window)

    // Check if there's already a stored database
    const checkStoredDatabase = async () => {
      try {
        const storedData = localStorage.getItem('kobo-database')
        if (storedData) {
          // If database exists, redirect to books page
          NavigationService.navigateToBooks(router)
        }
      } catch (error) {
        console.warn('Failed to check stored database:', error)
      }
    }

    checkStoredDatabase()
  }, [router])

  const handleDatabaseSelect = async (file: File) => {
    setIsLoading(true)
    setError(null)

    try {
      // Validate and initialize database using our clean service
      await KoboService.initializeDatabase(file)

      // Navigate to books page on success
      NavigationService.navigateToBooks(router)

    } catch (error) {
      const errorMessage = ErrorService.getErrorMessage(error as Error)
      setError(errorMessage)
      ErrorService.logError(error as Error)

    } finally {
      setIsLoading(false)
    }
  }

  const handleDirectorySelect = async () => {
    if (!('showDirectoryPicker' in window)) {
      setError('File system access is not supported in your browser.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use the File System Access API
      const directoryHandle = await (window as Window & { showDirectoryPicker(): Promise<FileSystemDirectoryHandle> }).showDirectoryPicker()
      
      // Find Kobo database file in the directory
      const dbFileHandle = await findKoboDBInDirectory(directoryHandle)
      if (!dbFileHandle) {
        throw new Error('Kobo database file not found in selected directory')
      }

      // Get file from handle and process
      const file = await dbFileHandle.getFile()
      await handleDatabaseSelect(file)

    } catch (error) {
      const errorMessage = ErrorService.getErrorMessage(error as Error)
      setError(errorMessage)
      ErrorService.logError(error as Error)

    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Subheading className="font-semibold tracking-tight text-gray-900 text-center">
            <span className="text-indigo-600">KoboNoteUp</span>
          </Subheading>
          
          <HeroHeading className="text-4xl/tight sm:text-6xl/none mt-6 text-pretty font-medium text-center">
            Access Your Kobo Notes, Effortlessly
          </HeroHeading>
          
          <Text className="mt-6 text-pretty text-lg font-medium sm:text-xl/8 text-center">
            No coding. No hidden files. <br />
            Just select your Kobo disk to view your notes.
          </Text>
        </div>
      </div>
      
      {/* Database Selector Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        {error && (
          <div className="mb-8">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner message="Processing your Kobo database..." />
          </div>
        ) : (
          <DatabaseSelector
            isDirectoryPickerSupported={isDirectoryPickerSupported}
            onFileSelect={handleDatabaseSelect}
            onDirectorySelect={handleDirectorySelect}
          />
        )}
      </div>

      {/* Landing Content */}
      <Steps />
      <FAQ />
      
      <Footer />
    </div>
  )
}

// Helper function to find Kobo database in directory
async function findKoboDBInDirectory(directoryHandle: FileSystemDirectoryHandle): Promise<FileSystemFileHandle | null> {
  const possibleNames = ['KoboReader.sqlite', 'Kobo.sqlite']
  
  for (const name of possibleNames) {
    try {
      const fileHandle = await directoryHandle.getFileHandle(name)
      return fileHandle
    } catch {
      // File not found, try next name
      continue
    }
  }
  
  return null
}