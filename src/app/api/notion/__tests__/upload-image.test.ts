import { APIResponseError, APIErrorCode } from '@notionhq/client'

import { NextRequest } from 'next/server'

const mockSendAlert = jest.fn()
const mockFileUploadsCreate = jest.fn()

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
      fileUploads: {
        create: (...args: unknown[]) => mockFileUploadsCreate(...args),
        send: jest.fn(),
      },
    })),
  }
})

function makeRequest() {
  const formData = new FormData()
  formData.set('file', new File(['x'], 'a.png', { type: 'image/png' }))
  return { formData: async () => formData } as unknown as NextRequest
}

describe('POST /api/notion/upload-image alerts', () => {
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockSendAlert.mockResolvedValue(undefined)
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('sends an alert and returns 502 on an unexpected error', async () => {
    mockFileUploadsCreate.mockRejectedValue(new Error('boom'))
    const { POST } = await import('../upload-image/route')
    const response = await POST(makeRequest())
    expect(response.status).toBe(502)
    expect(mockSendAlert).toHaveBeenCalledTimes(1)
    const call = mockSendAlert.mock.calls[0][0]
    expect(call.key).toBe('notion-image-crash')
    expect(call.detail).toContain('boom')
  })

  it('sends no alert for a user-caused error', async () => {
    mockFileUploadsCreate.mockRejectedValue(
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
    const { POST } = await import('../upload-image/route')
    const response = await POST(makeRequest())
    expect(response.status).toBe(502)
    expect(mockSendAlert).not.toHaveBeenCalled()
  })
})
