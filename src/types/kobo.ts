export interface IBook {
  contentId: string
  title: string
  subtitle?: string
  author?: string
  isbn?: string
  dateCreated?: string
  lastRead?: string
  imageUrl?: string
  totalHighlights: number
  totalNotes: number
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

export interface KoboDatabase {
  initialize: (file: File) => Promise<void>
  getBooks: () => Promise<IBook[]>
  getBookNotes: (contentId: string) => Promise<INote[]>
  getBookHighlights: (contentId: string) => Promise<IHighlight[]>
  close: () => void
}