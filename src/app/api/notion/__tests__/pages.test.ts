import { APIResponseError, APIErrorCode } from '@notionhq/client'

const mockSendAlert = jest.fn()
const mockSearch = jest.fn()

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
      search: (...args: unknown[]) => mockSearch(...args),
    })),
  }
})

describe('GET /api/notion/pages alerts', () => {
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockSendAlert.mockResolvedValue(undefined)
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('sends an alert and returns 500 on an unexpected error', async () => {
    mockSearch.mockRejectedValue(new Error('boom'))
    const { GET } = await import('../pages/route')
    const response = await GET()
    expect(response.status).toBe(500)
    expect(mockSendAlert).toHaveBeenCalledTimes(1)
    const call = mockSendAlert.mock.calls[0][0]
    expect(call.key).toBe('notion-pages-crash')
    expect(call.detail).toContain('boom')
  })

  it('sends no alert for a user-caused error', async () => {
    mockSearch.mockRejectedValue(
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
    const { GET } = await import('../pages/route')
    const response = await GET()
    expect(response.status).toBe(500)
    expect(mockSendAlert).not.toHaveBeenCalled()
  })
})
