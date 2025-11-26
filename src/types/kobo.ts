export interface IBook {
  contentId: string
  title?: string
  bookTitle?: string
  subtitle?: string
  author?: string
  isbn?: string
  dateCreated?: string
  lastRead?: string
  imageUrl?: string
  totalHighlights?: number
  totalNotes?: number
  annotation?: string
  bookmarkId?: string
  chapterProgress?: number
  fileSize?: number
  hidden?: boolean
  publisher?: string
  rating?: number
  readPercent?: number
  releaseDate?: string
  series?: string
  seriesNumber?: string
  source?: string
  text?: string
  type?: string
  volumeId?: string
  notes?: IBookHighlightNAnnotation[]
}

export interface INote {
  id: string
  contentId: string
  text: string
  annotation?: string
  chapterProgress?: number
  dateCreated: string
  extraData?: string
}

export interface IHighlight {
  id: string
  contentId: string
  text: string
  chapterProgress?: number
  dateCreated: string
  extraData?: string
}

export interface IBookChapter {
  notes: IBookHighlightNAnnotation[]
  contentId: string
  contentType: number
  mimeType?: string
  bookId: string
  bookTitle: string
  imageId?: string
  title: string
  chapterIdBookmarked: string
  volumeIndex: number
  depth: number
  isbn?: string
  note?: Array<IBookHighlightNAnnotation>
}

export interface IBookHighlightNAnnotation {
  annotation: string | null;
  bookmarkId: string;
  startContainerPath: string;
  startOffset: number;
  chapterProgress: number;
  contentId: string;
  dateCreated: string;
  hidden: string;
  text: string;
  type: string;
  volumeId: string;
  color?: number | null;
}

export interface KoboUserDetails {
  userId: string;
  userKey: string;
  userDisplayName: string;
  userEmail: string | null;
  deviceId: string | null;
  facebookAuthToken: string | null;
  hasMadePurchase: boolean | null;
  isOneStoreAccount: boolean | null;
  isChildAccount: boolean | null;
  refreshToken: string | null;
  authToken: string | null;
  authType: string | null;
  loyalty: boolean | null;
  isLibraryMigrated: boolean | null;
  syncContinuationToken: string | null;
  subscription: string | null;
  librarySyncType: string | null;
  librarySyncTime: string | null;
  syncTokenAppVersion: string | null;
  storefront: string | null;
  newUserPromoCurrency: string | null;
  newUserPromoValue: string | null;
  koboAccessToken: string | null;
  koboAccessTokenExpiry: string | null;
  annotationsSyncToken: string | null;
  privacyPermissions: boolean | null;
  annotationsMigrated: boolean | null;
  notebookSyncTime: string | null;
  notebookSyncToken: string | null;
}

