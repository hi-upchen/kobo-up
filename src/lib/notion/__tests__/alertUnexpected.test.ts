import { APIResponseError, APIErrorCode } from '@notionhq/client'
import { alertUnexpectedNotionError } from '../alertUnexpected'

const mockSendAlert = jest.fn()
jest.mock('@/lib/alert', () => ({
  ...jest.requireActual('@/lib/alert'),
  sendAlert: (...args: unknown[]) => mockSendAlert(...args),
}))

const ALERT = { key: 'k', title: 't', fix: 'f' }

function makeApiError(code: APIErrorCode) {
  return new APIResponseError({
    code,
    status: 500,
    message: 'api failed',
    headers: {},
    rawBodyText: '',
    additional_data: undefined,
    request_id: undefined,
  })
}

describe('alertUnexpectedNotionError', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSendAlert.mockResolvedValue(undefined)
  })

  it('sends nothing for a user-caused error', async () => {
    await alertUnexpectedNotionError(makeApiError(APIErrorCode.ObjectNotFound), ALERT)
    expect(mockSendAlert).not.toHaveBeenCalled()
  })

  it('adds the Notion error code to the detail', async () => {
    await alertUnexpectedNotionError(makeApiError(APIErrorCode.InternalServerError), ALERT)
    expect(mockSendAlert).toHaveBeenCalledWith({
      ...ALERT,
      detail: 'api failed (internal_server_error)',
    })
  })

  it('uses the plain message for an Error', async () => {
    await alertUnexpectedNotionError(new Error('boom'), ALERT)
    expect(mockSendAlert).toHaveBeenCalledWith({ ...ALERT, detail: 'boom' })
  })

  it('uses the string form of a non-Error value', async () => {
    await alertUnexpectedNotionError('oops', ALERT)
    expect(mockSendAlert).toHaveBeenCalledWith({ ...ALERT, detail: 'oops' })
  })
})
