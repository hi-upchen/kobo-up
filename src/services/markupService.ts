const DB_NAME = 'KoboMarkups'
const DB_VERSION = 1
const STORE_NAME = 'markups'

export interface MarkupFile {
  bookmarkId: string
  svg: ArrayBuffer
  jpg: ArrayBuffer
}

/**
 * Open the KoboMarkups IndexedDB database, creating the object store if needed.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'bookmarkId' })
      }
    }

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result)
    }

    request.onerror = () => {
      reject(new Error('Failed to open KoboMarkups IndexedDB'))
    }
  })
}

/**
 * Bulk save markup files (SVG + JPG) to IndexedDB.
 */
export async function saveMarkupFiles(files: MarkupFile[]): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    for (const file of files) {
      store.put(file)
    }

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(new Error('Failed to save markup files to IndexedDB'))
    }
  })
}

/**
 * Get a single markup file by bookmarkId.
 */
export async function getMarkupFile(bookmarkId: string): Promise<MarkupFile | null> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(bookmarkId)

    request.onsuccess = () => {
      db.close()
      resolve(request.result || null)
    }

    request.onerror = () => {
      db.close()
      reject(new Error('Failed to read markup file from IndexedDB'))
    }
  })
}

/**
 * Get multiple markup files by bookmarkIds. Returns a Map keyed by bookmarkId.
 */
export async function getMarkupFilesByIds(bookmarkIds: string[]): Promise<Map<string, MarkupFile>> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const results = new Map<string, MarkupFile>()

    let completed = 0
    const total = bookmarkIds.length

    if (total === 0) {
      db.close()
      resolve(results)
      return
    }

    for (const id of bookmarkIds) {
      const request = store.get(id)

      request.onsuccess = () => {
        if (request.result) {
          results.set(id, request.result as MarkupFile)
        }
        completed++
        if (completed === total) {
          db.close()
          resolve(results)
        }
      }

      request.onerror = () => {
        db.close()
        reject(new Error('Failed to read markup files from IndexedDB'))
      }
    }
  })
}

/**
 * Clear all markup files from IndexedDB.
 */
export async function clearMarkupFiles(): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()

    request.onsuccess = () => {
      db.close()
      resolve()
    }

    request.onerror = () => {
      db.close()
      reject(new Error('Failed to clear markup files from IndexedDB'))
    }
  })
}

/**
 * Check if any markup files exist in IndexedDB.
 */
export async function hasMarkupFiles(): Promise<boolean> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.count()

    request.onsuccess = () => {
      db.close()
      resolve(request.result > 0)
    }

    request.onerror = () => {
      db.close()
      reject(new Error('Failed to count markup files in IndexedDB'))
    }
  })
}
