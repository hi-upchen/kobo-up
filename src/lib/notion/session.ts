import { cookies } from 'next/headers'
import crypto from 'crypto'

const COOKIE_NAME = 'kobo_notion_session'
const ALGORITHM = 'aes-256-gcm'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface NotionSessionData {
  notionAccessToken: string
  notionWorkspaceId?: string
}

function getEncryptionKey(): Buffer {
  const secret = process.env.NOTION_ENCRYPTION_SECRET
  if (!secret) throw new Error('NOTION_ENCRYPTION_SECRET is not set')
  // Derive a 32-byte key from the secret
  return crypto.createHash('sha256').update(secret).digest()
}

function encrypt(data: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(data, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const tag = cipher.getAuthTag()
  // Combine iv + tag + encrypted as base64
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted}`
}

function decrypt(payload: string): string {
  const key = getEncryptionKey()
  const [ivB64, tagB64, encrypted] = payload.split('.')
  if (!ivB64 || !tagB64 || !encrypted) throw new Error('Invalid session payload')
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  let decrypted = decipher.update(encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export async function getNotionSession(): Promise<NotionSessionData | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(COOKIE_NAME)
  if (!cookie?.value) return null
  try {
    return JSON.parse(decrypt(cookie.value))
  } catch {
    return null
  }
}

export async function setNotionSession(data: NotionSessionData): Promise<void> {
  const cookieStore = await cookies()
  const encrypted = encrypt(JSON.stringify(data))
  cookieStore.set(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}

export async function clearNotionSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
