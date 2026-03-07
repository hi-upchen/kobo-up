'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { KoboService } from '@/services/koboService'
import { NavigationService } from '@/services/navigationService'
import { ErrorService } from '@/services/errorService'
import { DatabaseSelector } from './components/DatabaseSelector'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { HeroHeading, Heading, Subheading } from '@/components/heading'
import { Text } from '@/components/text'
import FAQ from '@/app/components/FAQ'

type FolderPickerSupport = 'directory-api' | 'webkitdirectory' | 'file-only'

export default function LandingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supportLevel, setSupportLevel] = useState<FolderPickerSupport>('directory-api')
  const [hasStoredData, setHasStoredData] = useState(false)

  useEffect(() => {
    // Detect folder picker support level
    if ('showDirectoryPicker' in window) {
      setSupportLevel('directory-api')
    } else {
      // Check webkitdirectory support
      const testInput = document.createElement('input')
      if ('webkitdirectory' in testInput) {
        setSupportLevel('webkitdirectory')
      } else {
        setSupportLevel('file-only')
      }
    }

    // Check if user has previously uploaded data
    let cancelled = false
    KoboService.hasStoredData().then(result => {
      if (!cancelled) setHasStoredData(result)
    }).catch(() => {
      if (!cancelled) setHasStoredData(false)
    })
    return () => { cancelled = true }
  }, [])

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

  const processKoboFiles = async (
    sqliteFile: File,
    markupFiles: { bookmarkId: string; svg: ArrayBuffer; jpg: ArrayBuffer }[]
  ) => {
    const { clearMarkupFiles, saveMarkupFiles } = await import('@/services/markupService')
    await clearMarkupFiles()
    if (markupFiles.length > 0) {
      await saveMarkupFiles(markupFiles)
    }
    await handleDatabaseSelect(sqliteFile)
  }

  const handleDirectorySelect = async () => {
    if (supportLevel !== 'directory-api') {
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

      // Find and store markup files (handwriting annotations)
      const markupFiles = await findMarkupFiles(directoryHandle)

      // Get file from handle and process
      const file = await dbFileHandle.getFile()
      await processKoboFiles(file, markupFiles)

    } catch (error) {
      const errorMessage = ErrorService.getErrorMessage(error as Error)
      setError(errorMessage)
      ErrorService.logError(error as Error)

    } finally {
      setIsLoading(false)
    }
  }

  const handleWebkitDirectorySelect = async (files: FileList) => {
    setIsLoading(true)
    setError(null)

    try {
      const sqliteFile = findKoboDBInFileList(files)
      if (!sqliteFile) {
        throw new Error('Kobo database file not found in selected directory')
      }

      const markupFiles = await findMarkupFilesInFileList(files)
      await processKoboFiles(sqliteFile, markupFiles)

    } catch (error) {
      const errorMessage = ErrorService.getErrorMessage(error as Error)
      setError(errorMessage)
      ErrorService.logError(error as Error)

    } finally {
      setIsLoading(false)
    }
  }

  const scrollToUpload = () => {
    document.getElementById('upload-section')?.scrollIntoView({ 
      behavior: 'smooth' 
    })
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Subheading className="font-semibold tracking-tight text-gray-900 dark:text-gray-100 text-center">
            <span className="text-indigo-600">Kobo Note Up</span>
          </Subheading>
          
          <HeroHeading className="text-3xl/tight sm:text-5xl/none mt-6 text-pretty font-medium text-center">
            Export Your Kobo Notes in 10 Seconds. It Just Works.
          </HeroHeading>
          
          <Text className="mt-6 text-pretty text-lg font-medium sm:text-xl/8 text-center">
            Highlights, notes, and handwritten annotations—all in one place. No technical knowledge needed.
          </Text>
          
          <Text className="mt-4 text-sm text-gray-600 text-center">
            Trusted by thousands of readers worldwide. 100% private, 100% in your browser.
          </Text>

          {hasStoredData && (
            <div className="mt-8 flex justify-center">
              <a
                href="/books"
                className="inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-5 py-2.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 transition-colors"
              >
                Your library is loaded.
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  View your books &rarr;
                </span>
              </a>
            </div>
          )}

          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button
              onClick={scrollToUpload}
              className="rounded-md bg-indigo-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Start Exporting Now ↓
            </button>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              See How It Works <span aria-hidden="true">→</span>
            </button>
          </div>

          {/* New Feature Notice */}
          <div className="mt-8 text-center space-y-1">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              ✨ <span className="font-medium">New:</span> ✏️ Handwriting annotations from Kobo Stylus now display alongside your highlights!
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              ✨ <span className="font-medium">New:</span> 🟡🔴🔵🟢 highlight colors now display and export!
            </Text>
          </div>
        </div>
      </div>
      
      {/* Problem Validation Bar */}
      <div className="bg-gray-50 dark:bg-zinc-800 py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <Text className="text-lg font-medium text-gray-900 mb-4">
              Finally, a Kobo export tool that actually works.
            </Text>
            <Text className="text-base text-gray-600">
              Kobo's export ignores sideloaded books and fails randomly. We built this because your reading insights deserve better.
            </Text>
          </div>
        </div>
      </div>
      
      {/* How It Works Section */}
      <div id="how-it-works" className="mx-auto max-w-7xl px-6 lg:px-8 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <Heading>
            How to Export Your Kobo Highlights in 3 Steps
          </Heading>
          <h3 className="text-indigo-600 dark:text-indigo-400 text-xl/tight font-semibold sm:text-2xl mt-3">
            Simple Process, Powerful Results
          </h3>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600">
                1
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Connect Your Kobo</h3>
              <Text className="mt-2 text-base leading-6">
                Plug in your Kobo device via USB. That's it. No software to install, no drivers to configure.
              </Text>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600">
                2
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Click and Auto-Detect</h3>
              <Text className="mt-2 text-base leading-6">
                Simply select your Kobo&apos;s folder and our smart detection instantly finds your database—no searching, no guessing, no technical knowledge required. Works with Chrome, Edge, Firefox, and Safari.
              </Text>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600">
                3
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Export Everything</h3>
              <Text className="mt-2 text-base leading-6">
                View all your notes and highlights in one clean interface. Export to Markdown or text format.
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div id="upload-section" className="bg-indigo-50 dark:bg-zinc-900 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center mb-12">
            <Heading className="">
              Ready to Export Your Notes?
            </Heading>
            <Text className="mt-4 text-lg leading-8 text-gray-600">
              Connect your Kobo and select root folder
            </Text>
            <Text className="mt-2 text-sm text-gray-500">
              Works with all modern browsers
            </Text>
          </div>

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
              supportLevel={supportLevel}
              onDirectorySelect={handleDirectorySelect}
              onWebkitDirectorySelect={handleWebkitDirectorySelect}
              onFileSelect={handleDatabaseSelect}
              onEmptyDirectory={() => setError(
                'Firefox cannot read the root folder of USB devices. Please select the .kobo folder inside your Kobo device instead. To show hidden folders, press ⌘+Shift+. on Mac or enable "Show hidden files" in the folder options on Windows. Alternatively, use Chrome or Edge to select the root folder directly.'
              )}
            />
          )}

          <div className="mt-8 text-center">
            <Text className="text-sm text-gray-500">
              Don't have your Kobo handy? <span className="text-indigo-600 font-medium">Try our sample file first</span> (coming soon)
            </Text>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h3 className="text-indigo-600 dark:text-indigo-400 text-xl/tight font-semibold sm:text-2xl">
            Why Choose Kobo Note Up
          </h3>
          <Heading className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl text-center">
            Finally, a Kobo Export Tool That Actually Works
          </Heading>
          <Text className="mt-6 text-lg leading-8">
            Frustrated with broken Kobo export features? Our browser-based solution solves common export problems and works seamlessly with all your content.
          </Text>
        </div>

        <div className="mx-auto mt-16 max-w-6xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="text-center p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600">
                🎯
              </div>
              <h3 className="mt-6 text-lg font-semibold text-gray-900 dark:text-gray-100">Automatic Database Detection</h3>
              <Text className="mt-2 text-sm leading-6">
                Our smart scanner finds your KoboReader.sqlite file instantly. No manual searching through folders or following complex tutorials.
              </Text>
            </div>

            <div className="text-center p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600">
                📚
              </div>
              <h3 className="mt-6 text-lg font-semibold text-gray-900 dark:text-gray-100">Works With Every Book</h3>
              <Text className="mt-2 text-sm leading-6">
                Purchased from Kobo Store? Sideloaded EPUBs? Library loans? If you highlighted it, we'll export it. No discrimination, no limitations.
              </Text>
            </div>

            <div className="text-center p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600">
                🚀
              </div>
              <h3 className="mt-6 text-lg font-semibold text-gray-900 dark:text-gray-100">Zero Installation Required</h3>
              <Text className="mt-2 text-sm leading-6">
                Works directly in your browser. No downloads, no installations, no system requirements. If you can browse the web, you can use Kobo Note Up.
              </Text>
            </div>

            <div className="text-center p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600">
                🔒
              </div>
              <h3 className="mt-6 text-lg font-semibold text-gray-900 dark:text-gray-100">Your Data Never Leaves Your Device</h3>
              <Text className="mt-2 text-sm leading-6">
                Everything happens locally in your browser using WebAssembly technology. We never see, store, or transmit your data. Your privacy is absolute.
              </Text>
            </div>

            <div className="text-center p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600">
                📄
              </div>
              <h3 className="mt-6 text-lg font-semibold text-gray-900 dark:text-gray-100">Multiple Export Options</h3>
              <Text className="mt-2 text-sm leading-6">
                Export to Markdown for note apps like Obsidian and Notion, or plain text format. Export all your books at once or individual books separately.
              </Text>
            </div>

            <div className="text-center p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600">
                ✏️
              </div>
              <h3 className="mt-6 text-lg font-semibold text-gray-900 dark:text-gray-100">Stylus Handwriting Support</h3>
              <Text className="mt-2 text-sm leading-6">
                Own a Kobo with stylus support? Your handwritten notes now appear right alongside text highlights—view full page screenshots with your ink strokes overlaid.
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Trust & Security Section */}
      <div className="bg-gray-50 dark:bg-zinc-800 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <Heading className="">
              Your Privacy Is Sacred. We Mean It.
            </Heading>
            <Text className="mt-6 text-lg leading-8">
              Unlike other tools, Kobo Note Up processes everything directly in your browser. Your database never uploads to our servers because we don't have servers for your data.
            </Text>
          </div>

          <div className="mx-auto mt-12 max-w-5xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  ✅
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">100% Local Processing</h3>
                <Text className="mt-2 text-sm leading-6">
                  Powered by WebAssembly SQL.js technology
                </Text>
              </div>

              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  ✅
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Zero Data Collection</h3>
                <Text className="mt-2 text-sm leading-6">
                  We can't see your books, notes, or reading habits
                </Text>
              </div>

              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  ✅
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Open Source</h3>
                <Text className="mt-2 text-sm leading-6">
                  Full transparency - <a href="https://github.com/hi-upchen/kobo-up" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500 underline">view our source code</a> and see exactly how your data is handled
                </Text>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Text className="text-sm text-gray-600">
                When we say "what happens in your browser, stays in your browser," we're not just making promises—it's technically impossible for us to access your data.
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Before/After Section */}
      <div className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center mb-16">
            <Heading className="">
              From Frustration to Freedom
            </Heading>
            <Text className="mt-6 text-lg leading-8">
              See the transformation when you switch from broken export tools to Kobo Note Up
            </Text>
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-bold text-red-600 mb-6">Before Kobo Note Up</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <Text className="text-gray-700">Kobo's export randomly fails or produces empty files</Text>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <Text className="text-gray-700">Sideloaded books completely ignored by official export</Text>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <Text className="text-gray-700">Hours spent following technical guides and SQL tutorials</Text>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <Text className="text-gray-700">Highlights truncated at 200 characters, losing context</Text>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <Text className="text-gray-700">Different tools needed for different book sources</Text>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">❌</span>
                  <Text className="text-gray-700">Risk of losing years of reading insights with each device upgrade</Text>
                </div>
              </div>
            </div>

            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-bold text-green-600 mb-6">After Kobo Note Up</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✅</span>
                  <Text className="text-gray-700">One-click export that works every single time</Text>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✅</span>
                  <Text className="text-gray-700">Every book treated equally—purchased or sideloaded</Text>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✅</span>
                  <Text className="text-gray-700">10-second setup with automatic detection</Text>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✅</span>
                  <Text className="text-gray-700">Full highlights preserved, no matter the length</Text>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✅</span>
                  <Text className="text-gray-700">One tool for your entire Kobo library</Text>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✅</span>
                  <Text className="text-gray-700">Peace of mind knowing your reading insights are safe and exportable</Text>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Landing Content */}
      <FAQ />
      
      {/* Final CTA Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-zinc-800 dark:to-zinc-900 py-16 sm:py-24 border-t border-gray-200 dark:border-zinc-700">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <Heading className="">
              Stop Fighting With Broken Export Tools
            </Heading>
            <Text className="mt-6 text-lg leading-8 text-gray-700">
              Your reading insights are valuable. The thoughts you capture while reading shape who you become. Don't let technical barriers keep you from accessing your own intellectual property.
            </Text>
            <Text className="mt-4 text-base text-gray-600">
              Join thousands of readers who've already liberated their Kobo highlights. No credit card. No account. No risk.
            </Text>
            
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                onClick={scrollToUpload}
                className="rounded-md bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transform hover:scale-105 transition-all duration-200"
              >
                Export Your Notes Now →
              </button>
            </div>
            
            <div className="mt-6">
              <Text className="text-sm text-gray-500">
                <em>Coming soon: Try it risk-free with our sample database to see the magic before connecting your device.</em>
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to find Kobo database in directory recursively
async function findKoboDBInDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<FileSystemFileHandle | null> {
  const possibleNames = ['KoboReader.sqlite', 'Kobo.sqlite']
  
  // Check current directory for database files
  for (const name of possibleNames) {
    try {
      const fileHandle = await directoryHandle.getFileHandle(name)
      console.log(`Found ${name} in current directory`)
      return fileHandle
    } catch {
      // File not found, continue
    }
  }
  
  // Stop if we've reached max depth
  if (currentDepth >= maxDepth) {
    return null
  }
  
  // Search subdirectories recursively
  try {
    for await (const entry of directoryHandle.values()) {
      if (entry.kind === 'directory') {
        // Skip system directories to avoid permission issues
        const dirName = entry.name
        if (dirName.startsWith('$') || dirName === 'System Volume Information') {
          continue
        }
        
        console.log(`Searching in subdirectory: ${dirName}`)
        const subdirHandle = entry as FileSystemDirectoryHandle
        const result = await findKoboDBInDirectory(subdirHandle, maxDepth, currentDepth + 1)
        if (result) {
          return result
        }
      }
    }
  } catch (error) {
    console.error('Error accessing directory:', error)
  }
  
  return null
}

async function findMarkupFiles(
  directoryHandle: FileSystemDirectoryHandle
): Promise<{ bookmarkId: string; svg: ArrayBuffer; jpg: ArrayBuffer }[]> {
  const markupFiles: { bookmarkId: string; svg: ArrayBuffer; jpg: ArrayBuffer }[] = [];

  const koboFolderNames = ['.kobo', '_kobo'];
  let markupsDir: FileSystemDirectoryHandle | null = null;

  for (const koboName of koboFolderNames) {
    try {
      const koboDir = await directoryHandle.getDirectoryHandle(koboName);
      markupsDir = await koboDir.getDirectoryHandle('markups');
      break;
    } catch {
      // Folder not found, try next
    }
  }

  if (!markupsDir) {
    try {
      markupsDir = await directoryHandle.getDirectoryHandle('markups');
    } catch {
      // No markups directory found
    }
  }

  if (!markupsDir) {
    return markupFiles;
  }

  const svgFiles = new Map<string, FileSystemFileHandle>();
  const jpgFiles = new Map<string, FileSystemFileHandle>();

  for await (const entry of markupsDir.values()) {
    if (entry.kind !== 'file') continue;
    const name = entry.name;
    const dotIndex = name.lastIndexOf('.');
    if (dotIndex === -1) continue;
    const baseName = name.substring(0, dotIndex);
    const ext = name.substring(dotIndex + 1).toLowerCase();

    if (ext === 'svg') {
      svgFiles.set(baseName, entry as FileSystemFileHandle);
    } else if (ext === 'jpg' || ext === 'jpeg') {
      jpgFiles.set(baseName, entry as FileSystemFileHandle);
    }
  }

  const svgEntries = Array.from(svgFiles.entries());
  for (const [bookmarkId, svgHandle] of svgEntries) {
    const jpgHandle = jpgFiles.get(bookmarkId);
    if (!jpgHandle) continue;

    try {
      const svgFile = await svgHandle.getFile();
      const jpgFile = await jpgHandle.getFile();
      const svg = await svgFile.arrayBuffer();
      const jpg = await jpgFile.arrayBuffer();
      markupFiles.push({ bookmarkId, svg, jpg });
    } catch (error) {
      console.warn(`Failed to read markup files for ${bookmarkId}:`, error);
    }
  }

  return markupFiles;
}

function findKoboDBInFileList(files: FileList): File | null {
  const possibleNames = ['KoboReader.sqlite', 'Kobo.sqlite']

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    for (const name of possibleNames) {
      if (file.name === name) {
        return file
      }
    }
  }

  return null
}

async function findMarkupFilesInFileList(
  files: FileList
): Promise<{ bookmarkId: string; svg: ArrayBuffer; jpg: ArrayBuffer }[]> {
  const markupFiles: { bookmarkId: string; svg: ArrayBuffer; jpg: ArrayBuffer }[] = []

  // Collect SVG and JPG files from .kobo/markups/ path
  const svgFiles = new Map<string, File>()
  const jpgFiles = new Map<string, File>()

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const relativePath = file.webkitRelativePath || ''

    // Match files in .kobo/markups/ or _kobo/markups/ directory
    const markupMatch = relativePath.match(/[./_]kobo\/markups\/([^/]+)\.(svg|jpe?g)$/i)
    if (!markupMatch) continue

    const baseName = markupMatch[1]
    const ext = markupMatch[2].toLowerCase()

    if (ext === 'svg') {
      svgFiles.set(baseName, file)
    } else {
      jpgFiles.set(baseName, file)
    }
  }

  // Pair SVG and JPG files by basename
  const svgEntries = Array.from(svgFiles.entries())
  for (const [bookmarkId, svgFile] of svgEntries) {
    const jpgFile = jpgFiles.get(bookmarkId)
    if (!jpgFile) continue

    try {
      const svg = await svgFile.arrayBuffer()
      const jpg = await jpgFile.arrayBuffer()
      markupFiles.push({ bookmarkId, svg, jpg })
    } catch (error) {
      console.warn(`Failed to read markup files for ${bookmarkId}:`, error)
    }
  }

  return markupFiles
}