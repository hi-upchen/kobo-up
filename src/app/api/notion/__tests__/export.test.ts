import { NextRequest } from 'next/server'
import { APIResponseError, APIErrorCode } from '@notionhq/client'

const mockSendAlert = jest.fn()
const mockPagesCreate = jest.fn()

jest.mock('@/lib/alert', () => ({
  ...jest.requireActual('@/lib/alert'),
  sendAlert: (...args: unknown[]) => mockSendAlert(...args),
}))
jest.mock('@/lib/notion/session', () => ({
  getNotionSession: async () => ({ notionAccessToken: 'token' }),
  clearNotionSession: jest.fn(),
}))
jest.mock('@notionhq/client', () => {
  const actual = jest.requireActual('@notionhq/client')
  return {
    ...actual,
    Client: jest.fn().mockImplementation(() => ({
      pages: { create: (...args: unknown[]) => mockPagesCreate(...args) },
      blocks: { children: { append: jest.fn() } },
    })),
  }
})

const PARENT_ID = '12345678-1234-1234-1234-123456789abc'

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/notion/export', {
    method: 'POST',
    body: JSON.stringify({ bookTitle: 'Book', author: 'A', chapters: [], parentPageId: PARENT_ID }),
  })
}

async function runExport(): Promise<string> {
  const { POST } = await import('../export/route')
  const response = await POST(makeRequest())
  return await response.text()
}

describe('POST /api/notion/export alerts', () => {
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockSendAlert.mockResolvedValue(undefined)
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('sends an alert with the error message for an unexpected crash', async () => {
    mockPagesCreate.mockRejectedValue(new Error('boom'))
    const body = await runExport()
    expect(body).toContain('Export failed')
    expect(mockSendAlert).toHaveBeenCalledTimes(1)
    const call = mockSendAlert.mock.calls[0][0]
    expect(call.key).toBe('notion-export-crash')
    expect(call.detail).toContain('boom')
  })

  it('sends no alert when the failure is caused by the user', async () => {
    mockPagesCreate.mockRejectedValue(
      new APIResponseError({
        code: APIErrorCode.ObjectNotFound,
        status: 404,
        message: 'not found',
        headers: {},
        rawBodyText: '',
        additional_data: undefined,
        request_id: undefined,
      })
    )
    const body = await runExport()
    expect(body).toContain('Export failed')
    expect(mockSendAlert).not.toHaveBeenCalled()
  })

  it('sends no alert when the client aborted the export', async () => {
    let rejectCreate: (e: Error) => void = () => {}
    mockPagesCreate.mockImplementation(
      () => new Promise((_, reject) => { rejectCreate = reject })
    )
    const { POST } = await import('../export/route')
    const response = await POST(makeRequest())
    const reader = response.body!.getReader()
    await reader.read()
    await reader.cancel()
    rejectCreate(new Error('boom'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(mockSendAlert).not.toHaveBeenCalled()
  })
})
