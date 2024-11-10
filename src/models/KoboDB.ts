import initSqlJs, { SqlJsStatic } from 'sql.js';

async function findFileHandle(directoryHandle: FileSystemDirectoryHandle, fileName: string): Promise<FileSystemFileHandle | null> {
  for await (const entry of directoryHandle.values()) {
    if (entry.kind === 'file' && entry.name === fileName) {
      return entry;
    } else if (entry.kind === 'directory') {
      const foundInSubDir = await findFileHandle(entry, fileName);
      if (foundInSubDir) {
        return foundInSubDir;
      }
    }
  }
  return null;
}


/**
 * Asynchronously finds the KoboReader.sqlite file within the given directory handle. (User selected file)
 *
 * @param directoryHandle - The handle to the directory where the KoboReader.sqlite file is expected to be found.
 * @returns A promise that resolves to the file handle of the KoboReader.sqlite file if found, or null if not found.
 */
export async function findKoboDB(directoryHandle: FileSystemDirectoryHandle): Promise<FileSystemFileHandle | null> {
  const fileName = 'KoboReader.sqlite';
  const found = await findFileHandle(directoryHandle, fileName);
  return found;
}

// Utility function to read file as ArrayBuffer using a Promise

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onloadend = () => {
      if (reader.result) {
        resolve(reader.result as ArrayBuffer);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
  });
};

/**
 * Asynchronously retrieves and initializes a Kobo database from a given file handle.
 *
 * The function reads the file contents of the provided file handle, 
 * initializes an SQL.js database instance with the file's data, and returns the instance.
 *
 * @param {FileSystemFileHandle} dbFileHandle - The file handle of the Kobo database file.
 * @returns {Promise<SQL.Database>} A promise that resolves to an initialized SQL.js database instance.
 * @throws {Error} If the Kobo database file is not found in the provided directory.
 */
export async function connKoboDB(dbFileHandle: FileSystemFileHandle|File): Promise<SqlJsStatic.Database> {
  if (!dbFileHandle) {
    throw new Error("dbFileHandle is null");
  }

  const startTime = performance.now();

  const fileHandle = dbFileHandle;
  let file: File;
  if (fileHandle instanceof FileSystemFileHandle) {
    file = await fileHandle.getFile();
  } else if (fileHandle instanceof File) {
    file = fileHandle;
  } else {
    throw new Error("Invalid file handle type");
  }
  const arrayBuffer = await file.arrayBuffer();

  // Initialize sql.js
  const SQL = await initSqlJs({
    locateFile: file => `https://sql.js.org/dist/${file}`
  });
  const db = new SQL.Database(new Uint8Array(arrayBuffer));

  const endTime = performance.now();
  // console.log(`Time spent on connKoboDB: ${endTime - startTime} ms`);

  return db;
}

/**
 * Checks if the given database connection is a Kobo database.
 *
 * This function verifies the presence of the "content" and "bookmark" tables
 * in the provided database connection.
 *
 * @param {SqlJsStatic.Database} db - The database connection to check.
 * @returns {Promise<boolean>} A promise that resolves to true if both tables are present, otherwise false.
 */
export async function checkIsKoboDB(db: SqlJsStatic.Database): Promise<boolean> {
  const tablesQuery = `
    SELECT name 
    FROM sqlite_master 
    WHERE type='table';
  `;
  const result = db.exec(tablesQuery);

  const tableNames = result[0]?.values.map(row => row[0]) || [];
  return tableNames.includes('content') && tableNames.includes('Bookmark');
}

export async function getBookList(db: SqlJsStatic.Database): Promise<IBook[]> {
  const sql = `
    SELECT
      ContentID as 'contentId',
      IFNULL(Title,'') as 'bookTitle', 
      IFNULL(Subtitle,'') as 'subtitle', 
      IFNULL(Attribution,'') as 'author', 
      IFNULL(Publisher,'') as 'publisher', 
      IFNULL(ISBN,0) as 'isbn', 
      IFNULL(date(DateCreated),'') as 'releaseDate',
      IFNULL(Series,'') as 'series', 
      IFNULL(SeriesNumber,0) as 'seriesNumber', 
      IFNULL(AverageRating,0) as 'rating', 
      IFNULL(___PercentRead,0) as 'readPercent',
      IFNULL(CASE WHEN ReadStatus>0 THEN datetime(DateLastRead) END,'') as 'lastRead',
      IFNULL(___FileSize,0) as 'fileSize',
      IFNULL(CASE WHEN Accessibility=1 THEN 'Store' ELSE CASE WHEN Accessibility=-1 THEN 'Import' ELSE CASE WHEN Accessibility=6 THEN 'Preview' ELSE 'Other' END END END,'') as 'source'
    FROM content
    WHERE ContentType=6 AND ___UserId IS NOT NULL AND ___UserId != '' AND ___UserId != 'removed'
    ORDER BY source desc, title`;
  const query = sql;
  const result = db.exec(query);

  return sqliteResultToArray(result) as IBook[];
}

export async function getBook(db:SqlJsStatic.Database, contentId: string): Promise<IBook> {
  const sql = `
    SELECT
     ContentID as 'contentId',
      IFNULL(Title,'') as 'bookTitle', 
      IFNULL(Subtitle,'') as 'subtitle', 
      IFNULL(Attribution,'') as 'author', 
      IFNULL(Publisher,'') as 'publisher', 
      IFNULL(ISBN,0) as 'isbn', 
      IFNULL(date(DateCreated),'') as 'releaseDate',
      IFNULL(Series,'') as 'series', 
      IFNULL(SeriesNumber,0) as 'seriesNumber', 
      IFNULL(AverageRating,0) as 'rating', 
      IFNULL(___PercentRead,0) as 'readPercent',
      IFNULL(CASE WHEN ReadStatus>0 THEN datetime(DateLastRead) END,'') as 'lastRead',
      IFNULL(___FileSize,0) as 'fileSize',
      IFNULL(CASE WHEN Accessibility=1 THEN 'Store' ELSE CASE WHEN Accessibility=-1 THEN 'Import' ELSE CASE WHEN Accessibility=6 THEN 'Preview' ELSE 'Other' END END END,'') as 'source'
    FROM content
    WHERE ContentID = ?;
  `;
  const result = db.exec(sql, [contentId]);
  return sqliteResultToArray(result)[0] as IBook;
}

export async function getHighlightNAnnotationList(db: SqlJsStatic.Database, contentId: string): Promise<IBookHighlightNAnnotation[]> {
  const sql = `
    SELECT
      T.BookmarkID as 'bookmarkId',
      T.ContentID as 'contentId',
      T.VolumeID as 'volumeId',
      T.DateCreated as 'dateCreated',
      T.Text as 'text',
      T.Annotation as 'annotation',
      T.Hidden as 'hidden',
      T.Type as 'type',
      T.ChapterProgress as 'chapterProgress'
    FROM content AS B, Bookmark AS T
    WHERE B.ContentID = T.VolumeID AND T.Text != '' AND T.Hidden = 'false' AND B.ContentID = ?
    ORDER BY T.DateCreated DESC;
  `;

  const result = db.exec(sql, [contentId]);
  return sqliteResultToArray(result) as IBookHighlightNAnnotation[];
}

/**
 * Converts SQLite query results into an array of objects.
 *
 * @param result - The result from the SQLite query execution.
 * @returns An array of objects representing the rows of the query result.
 */
function sqliteResultToArray(result: any): { [key: string]: any }[] {
  if (result.length === 0) return [];

  return result[0].values.map((row: any[]) => {
    const rowObject: { [key: string]: any } = {};
    result[0].columns.forEach((col: string, index: number) => {
      rowObject[col] = row[index];
    });
    return rowObject;
  });
}

const dbObjectKey = 'KoboReader.sqlite';
const dbLastUpdatedKey = 'dbLastUpdated';
const cacheName = 'KoboNoteUpCache';

// /**
//  * Save the Kobo DB file to the Cache API.
//  *
//  * @param dbFileHandle - The file handle for the Kobo DB file.
//  */
// export async function saveKoboDbToLocal(dbFileHandle: FileSystemFileHandle) {
//   if (!dbFileHandle || dbFileHandle.kind !== 'file') {
//     throw new Error("Invalid dbFileHandle: must be a non-null FileSystemFileHandle of kind 'file'");
//   }

//   // Get the file from the file handle
//   const file = await dbFileHandle.getFile();
//   const arrayBuffer = await file.arrayBuffer();

//   // Create a response object from the array buffer
//   const response = new Response(arrayBuffer, {
//     headers: { 'Content-Type': 'application/vnd.sqlite3' }
//   });

//   // Open the cache and store the response
//   const cache = await caches.open(cacheName);
//   await cache.put(dbObjectKey, response);
//   await cache.put(dbLastUpdatedKey, new Response(new Date().toISOString()));

//   // Retrieve and log the saved file from the cache
//   const cachedResponse = await cache.match(dbObjectKey);
//   if (cachedResponse) {
//     const cachedArrayBuffer = await cachedResponse.arrayBuffer();
//     console.log('Cached file content:', new Uint8Array(cachedArrayBuffer));
//   } else {
//     console.log('No file found in cache');
//   }

//   console.log('File saved to cache successfully');
// }

// /**
//  * Load the Kobo DB file from the Cache API.
//  *
//  * @returns The file object for the Kobo DB file.
//  */
// export async function getKoboDbFromLocal(): Promise<File | null> {
//   const cache = await caches.open(cacheName);
//   const response = await cache.match(dbObjectKey);

//   if (!response) {
//     console.log('No cached file found');
//     return null;
//   }

//   const arrayBuffer = await response.arrayBuffer();
//   const file = new File([arrayBuffer], dbObjectKey, { type: 'application/vnd.sqlite3' });

//   console.log('File loaded from cache successfully');
//   return file;
// }

// /**
//  * Request a file handle from the user.
//  *
//  * @returns The file handle for the selected file.
//  */
// export async function requestFileHandle(): Promise<FileSystemFileHandle> {
//   const options = {
//     types: [
//       {
//         description: 'SQLite Database',
//         accept: {
//           'application/vnd.sqlite3': ['.sqlite', '.db'],
//         },
//       },
//     ],
//   };

//   const [fileHandle] = await window.showOpenFilePicker(options);
//   return fileHandle;
// }

const indexedDBVersion = Math.floor(new Date().getTime() / 1000)-1731204930;
const DBName = 'KoboNoteUp';
const DBObjectsStoreName = 'KoboNoteUpObjects';

/**
 * Opens an IndexedDB database and returns a promise that resolves with the database instance.
 * If the database needs to be upgraded, it will create the necessary object stores.
 *
 * @example
 * ```typescript
 * try {
 *   const db = await openIndexedDB();
 *   console.log('Database opened:', db);
 * } catch (error) {
 *   console.error('Failed to open database:', error);
 * }
 * ```
 *
 * @returns {Promise<IDBDatabase>} A promise that resolves with the opened IndexedDB database instance.
 */
async function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const dbOpenRequest: IDBOpenDBRequest = indexedDB.open(DBName, indexedDBVersion);

    dbOpenRequest.onupgradeneeded = (event) => {
      const db = dbOpenRequest.result;
      if (!db.objectStoreNames.contains(DBObjectsStoreName)) {
        db.createObjectStore(DBObjectsStoreName);
        console.log(`Object store ${DBObjectsStoreName} created`);
      }
    };

    dbOpenRequest.onsuccess = () => {
      resolve(dbOpenRequest.result);
    };

    dbOpenRequest.onerror = (event) => {
      console.error('Database error:', (event.target as IDBOpenDBRequest).error);
      reject(new Error('Failed to open IndexedDB'));
    };
  });
}

export async function saveKoboDbToLocal(dbFileHandle: FileSystemFileHandle) {
  if (!dbFileHandle || dbFileHandle.kind !== 'file') {
    throw new Error("Invalid dbFileHandle: must be a non-null FileSystemFileHandle of kind 'file'");
  }

  // Save the dbFileHandle to IndexedDB
  const file = await dbFileHandle.getFile();
  const arrayBuffer = await file.arrayBuffer();

  const db = await openIndexedDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DBObjectsStoreName, 'readwrite');
    const store = transaction.objectStore(DBObjectsStoreName);

    store.put(arrayBuffer, dbObjectKey);
    store.put(new Date().toISOString(), dbLastUpdatedKey);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event) => {
      console.error('Transaction error:', (event.target as IDBTransaction).error);
      reject(new Error('Transaction failed'));
    };
  });
}
export async function getKoboDbFromLocal(): Promise<File | null> {
  const db = await openIndexedDB();

  return new Promise<File | null>((resolve, reject) => {
    if (!db.objectStoreNames.contains(DBObjectsStoreName)) {
      console.warn(`Object store ${DBObjectsStoreName} does not exist`);
      resolve(null);
      return;
    }

    const transaction = db.transaction(DBObjectsStoreName, 'readonly');
    const store = transaction.objectStore(DBObjectsStoreName);
    const getRequest = store.get(dbObjectKey);

    getRequest.onsuccess = () => {
      const arrayBuffer = getRequest.result;
      if (arrayBuffer) {
        const file = new File([arrayBuffer], dbObjectKey, { type: 'application/octet-stream' });
        resolve(file);
      } else {
        resolve(null);
      }
    };

    getRequest.onerror = (event) => {
      console.error('Get request error:', (event.target as IDBRequest).error);
      reject(new Error('Failed to retrieve the file from IndexedDB'));
    };
  });
}

/**
 * Delete the existing IndexedDB database.
 */
export async function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase('KoboNoteUp');

    deleteRequest.onsuccess = () => {
      console.log('Database deleted successfully');
      resolve();
    };

    deleteRequest.onerror = (event) => {
      console.error('Database deletion error:', (event.target as IDBRequest).error);
      reject(new Error('Failed to delete IndexedDB'));
    };

    deleteRequest.onblocked = () => {
      console.warn('Database deletion blocked');
    };
  });
}

export interface IBook {
  annotation: string;
  author: string;
  bookmarkId: string;
  bookTitle: string;
  chapterProgress: number;
  contentId: string;
  dateCreated: string;
  fileSize: number;
  hidden: boolean;
  isbn: string;
  lastRead: string;
  publisher: string;
  rating: number;
  readPercent: number;
  releaseDate: string;
  series: string;
  seriesNumber: string;
  source: string;
  subtitle: string;
  text: string;
  type: string;
  volumeId: string;
  notes: IBookHighlightNAnnotation[];
}

export interface IBookHighlightNAnnotation {
  annotation: string | null;
  bookmarkId: string;
  chapterProgress: number; // 0.1176470588235294
  contentId: string; // IBook.contentId
  dateCreated: string; // 2024-07-12T02:53:50.000
  hidden: string; // "true", "false"
  text: string;
  type: string; //"highlight"
  volumeId: string;
}