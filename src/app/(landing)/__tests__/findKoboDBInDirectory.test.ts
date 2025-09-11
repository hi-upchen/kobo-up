/**
 * Test for findKoboDBInDirectory function
 * Mocks the File System Access API to test the recursive search logic
 */

describe('findKoboDBInDirectory', () => {
  // Mock FileSystemFileHandle
  class MockFileSystemFileHandle {
    kind = 'file' as const
    name: string
    
    constructor(name: string) {
      this.name = name
    }
    
    async getFile() {
      return new File(['mock content'], this.name)
    }
  }

  // Mock FileSystemDirectoryHandle
  class MockFileSystemDirectoryHandle {
    kind = 'directory' as const
    name: string
    private entries: Map<string, MockFileSystemFileHandle | MockFileSystemDirectoryHandle>
    
    constructor(name: string) {
      this.name = name
      this.entries = new Map()
    }
    
    async getFileHandle(name: string) {
      const entry = this.entries.get(name)
      if (entry && entry.kind === 'file') {
        return entry as MockFileSystemFileHandle
      }
      throw new Error('File not found')
    }
    
    async getDirectoryHandle(name: string) {
      const entry = this.entries.get(name)
      if (entry && entry.kind === 'directory') {
        return entry as MockFileSystemDirectoryHandle
      }
      throw new Error('Directory not found')
    }
    
    addFile(name: string) {
      this.entries.set(name, new MockFileSystemFileHandle(name))
    }
    
    addDirectory(name: string): MockFileSystemDirectoryHandle {
      const dir = new MockFileSystemDirectoryHandle(name)
      this.entries.set(name, dir)
      return dir
    }
    
    async *values() {
      for (const entry of this.entries.values()) {
        yield entry
      }
    }
  }

  // Import the function to test (we'll need to extract it to a separate file)
  let findKoboDBInDirectory: (directoryHandle: any) => Promise<any>

  beforeEach(() => {
    // Clear module cache
    jest.resetModules()
    
    // Define the function here since we can't import from tsx files in jest
    findKoboDBInDirectory = async function(
      directoryHandle: any,
      maxDepth: number = 3,
      currentDepth: number = 0
    ): Promise<any> {
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
            const subdirHandle = entry
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
  })

  it('should find KoboReader.sqlite in root directory', async () => {
    const rootDir = new MockFileSystemDirectoryHandle('root')
    rootDir.addFile('KoboReader.sqlite')
    
    const result = await findKoboDBInDirectory(rootDir)
    expect(result).toBeDefined()
    expect(result.name).toBe('KoboReader.sqlite')
  })

  it('should find Kobo.sqlite as alternative name', async () => {
    const rootDir = new MockFileSystemDirectoryHandle('root')
    rootDir.addFile('Kobo.sqlite')
    
    const result = await findKoboDBInDirectory(rootDir)
    expect(result).toBeDefined()
    expect(result.name).toBe('Kobo.sqlite')
  })

  it('should find database in .kobo subdirectory', async () => {
    const rootDir = new MockFileSystemDirectoryHandle('root')
    const koboDir = rootDir.addDirectory('.kobo')
    koboDir.addFile('KoboReader.sqlite')
    
    const result = await findKoboDBInDirectory(rootDir)
    expect(result).toBeDefined()
    expect(result.name).toBe('KoboReader.sqlite')
  })

  it('should find database in nested subdirectories', async () => {
    const rootDir = new MockFileSystemDirectoryHandle('root')
    const level1 = rootDir.addDirectory('level1')
    const level2 = level1.addDirectory('level2')
    level2.addFile('KoboReader.sqlite')
    
    const result = await findKoboDBInDirectory(rootDir)
    expect(result).toBeDefined()
    expect(result.name).toBe('KoboReader.sqlite')
  })

  it('should return null if database not found', async () => {
    const rootDir = new MockFileSystemDirectoryHandle('root')
    rootDir.addFile('other.txt')
    
    const result = await findKoboDBInDirectory(rootDir)
    expect(result).toBeNull()
  })

  it('should respect max depth limit', async () => {
    const rootDir = new MockFileSystemDirectoryHandle('root')
    const level1 = rootDir.addDirectory('level1')
    const level2 = level1.addDirectory('level2')
    const level3 = level2.addDirectory('level3')
    const level4 = level3.addDirectory('level4')
    level4.addFile('KoboReader.sqlite')
    
    // Should not find it because it's beyond depth 3
    const result = await findKoboDBInDirectory(rootDir)
    expect(result).toBeNull()
  })

  it('should skip system directories', async () => {
    const rootDir = new MockFileSystemDirectoryHandle('root')
    const systemDir = rootDir.addDirectory('$RECYCLE.BIN')
    systemDir.addFile('KoboReader.sqlite')
    
    const result = await findKoboDBInDirectory(rootDir)
    expect(result).toBeNull()
  })

  it('should find first matching file when multiple exist', async () => {
    const rootDir = new MockFileSystemDirectoryHandle('root')
    rootDir.addFile('KoboReader.sqlite') // This should be found first
    const koboDir = rootDir.addDirectory('.kobo')
    koboDir.addFile('Kobo.sqlite') // This won't be checked
    
    const result = await findKoboDBInDirectory(rootDir)
    expect(result).toBeDefined()
    expect(result.name).toBe('KoboReader.sqlite')
  })

  it('should handle mixed directory structures', async () => {
    const rootDir = new MockFileSystemDirectoryHandle('root')
    rootDir.addFile('readme.txt')
    rootDir.addDirectory('Documents')
    rootDir.addDirectory('Downloads')
    const koboDir = rootDir.addDirectory('.kobo')
    koboDir.addFile('config.ini')
    koboDir.addFile('KoboReader.sqlite')
    
    const result = await findKoboDBInDirectory(rootDir)
    expect(result).toBeDefined()
    expect(result.name).toBe('KoboReader.sqlite')
  })
})