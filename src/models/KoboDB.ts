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
  console.log('result', result)
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
let indexedDBVersion = 5;
export async function saveKoboDbToLocal(dbFileHandle: FileSystemFileHandle) {
  if (!dbFileHandle || dbFileHandle.kind !== 'file') {
    throw new Error("Invalid dbFileHandle: must be a non-null FileSystemFileHandle of kind 'file'");
  }

  // Save the dbFileHandle to IndexedDB
  const file = await dbFileHandle.getFile();
  const arrayBuffer = await file.arrayBuffer();

  // saving to indexedDB
  const dbOpenRequest: IDBOpenDBRequest = indexedDB.open('KoboUp', indexedDBVersion);

  return new Promise<void>((resolve, reject) => {
    dbOpenRequest.onupgradeneeded = (event) => {
      console.log("do onupgradeneeded");

      const db = dbOpenRequest.result;
      // create object store if not exists
      if (!db.objectStoreNames.contains('KoboUpObjects')) {
        db.createObjectStore('KoboUpObjects');
        console.log(`Object "KoboUpObjects" store created`);
      }
    };

    dbOpenRequest.onsuccess = async () => {
      const db = dbOpenRequest.result;
      
      const transaction = db.transaction('KoboUpObjects', 'readwrite');
      const store = transaction.objectStore('KoboUpObjects');

      store.put(arrayBuffer, dbObjectKey);
      store.put(new Date().toISOString(), dbLastUpdatedKey);

      transaction.oncomplete = () => {
        console.log('Transaction completed successfully');
        resolve();
      };

      transaction.onerror = (event) => {
        console.error('Transaction error:', (event.target as IDBTransaction).error);
        reject(new Error('Transaction failed'));
      };
    };

    dbOpenRequest.onerror = (event) => {
      console.error('Database error:', (event.target as IDBOpenDBRequest).error);
      reject(new Error('Failed to open IndexedDB'));
    };
  });
}

export async function getKoboDbFromLocal(): Promise<File | null> {
  const startTime = performance.now();
  const dbOpenRequest: IDBOpenDBRequest = indexedDB.open('KoboUp', indexedDBVersion);

  return new Promise<File | null>((resolve, reject) => {
    dbOpenRequest.onsuccess = () => {
      const db = dbOpenRequest.result;

      if (!db.objectStoreNames.contains('KoboUpObjects')) {
        console.warn('Object store "KoboUpObjects" does not exist');
        resolve(null);
        return;
      }

      const transaction = db.transaction('KoboUpObjects', 'readonly');
      const store = transaction.objectStore('KoboUpObjects');
      const getRequest = store.get(dbObjectKey);

      getRequest.onsuccess = () => {
        const arrayBuffer = getRequest.result;
        if (arrayBuffer) {
          const file = new File([arrayBuffer], dbObjectKey, { type: 'application/octet-stream' });
          const endTime = performance.now();
          // console.log(`Time spent on getKoboDbFromLocal: ${endTime - startTime} ms`);
        
          resolve(file);
        } else {
          resolve(null);
        }
      };

      getRequest.onerror = (event) => {
        console.error('Get request error:', (event.target as IDBRequest).error);
        reject(new Error('Failed to retrieve the file from IndexedDB'));
      };
    };

    dbOpenRequest.onerror = (event) => {
      console.error('Database error:', (event.target as IDBOpenDBRequest).error);
      reject(new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Delete the saved Kobo DB (restart)
 * @returns Promise<null>
 */
export async function resetKoboDbFromLocal(): Promise<null> {
  return new Promise<null>((resolve, reject) => {
    const dbOpenRequest: IDBOpenDBRequest = indexedDB.open('KoboUp', indexedDBVersion);

    dbOpenRequest.onsuccess = () => {
      const db = dbOpenRequest.result;

      if (!db.objectStoreNames.contains('KoboUpObjects')) {
        console.warn('Object store "KoboUpObjects" does not exist');
        resolve(null);
        return;
      }

      const transaction = db.transaction('KoboUpObjects', 'readwrite');
      const store = transaction.objectStore('KoboUpObjects');

      store.put(null, dbObjectKey);

      transaction.oncomplete = () => {
        console.log('Transaction completed successfully');
        resolve(null);
      };

      transaction.onerror = (event) => {
        console.error('Transaction error:', (event.target as IDBTransaction).error);
        reject(new Error('Transaction failed'));
      };
    };

    dbOpenRequest.onerror = (event) => {
      console.error('Database error:', (event.target as IDBOpenDBRequest).error);
      reject(new Error('Failed to open IndexedDB'));
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