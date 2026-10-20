import { sendAlert, redactSecrets, errorMessage, resetAlertStateForTests } from '../alert'

const TOKEN = 'bot-token-123'
const CHAT = '987654'
const input = {
  key: 'notion:callback',
  title: 'Notion 授權失敗',
  detail: 'Notion 回 400',
  fix: '查 Vercel 紀錄',
}

const okResponse = () => ({ ok: true, status: 200, text: async () => '' }) as Response
const sentText = (spy: jest.SpyInstance, call = 0) =>
  JSON.parse((spy.mock.calls[call][1] as RequestInit).body as string).text as string

describe('sendAlert', () => {
  const saved = { ...process.env }
  let errorLog: jest.SpyInstance

  beforeEach(() => {
    process.env.ALERT_TELEGRAM_BOT_TOKEN = TOKEN
    process.env.ALERT_TELEGRAM_CHAT_ID = CHAT
    resetAlertStateForTests()
    errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    process.env = { ...saved }
  })

  it('sends one Telegram message with the three-line format', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(okResponse())
    await sendAlert(input)
    expect(spy).toHaveBeenCalledTimes(1)
    const [url, init] = spy.mock.calls[0]
    expect(url).toBe(`https://api.telegram.org/bot${TOKEN}/sendMessage`)
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      chat_id: CHAT,
      text: '【KoboUp】Notion 授權失敗\nNotion 回 400\n修理：查 Vercel 紀錄',
    })
  })

  it('throttles the same key within throttleMs', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(okResponse())
    await sendAlert(input)
    await sendAlert(input)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('a throttleMs of 0 sends every call', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(okResponse())
    await sendAlert({ ...input, throttleMs: 0 })
    await sendAlert({ ...input, throttleMs: 0 })
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('does not throttle different keys', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(okResponse())
    await sendAlert(input)
    await sendAlert({ ...input, key: 'health:notion' })
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('sends again after throttleMs passes', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(okResponse())
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000)
    await sendAlert({ ...input, throttleMs: 1000 })
    now.mockReturnValue(1_000_500)
    await sendAlert({ ...input, throttleMs: 1000 })
    expect(spy).toHaveBeenCalledTimes(1)
    now.mockReturnValue(1_001_001)
    await sendAlert({ ...input, throttleMs: 1000 })
    expect(spy).toHaveBeenCalledTimes(2)
  })

  test('the send times out after 3 seconds', async () => {
    const spy = jest.spyOn(global, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          const signal = (init as RequestInit).signal as AbortSignal
          signal.addEventListener('abort', () => reject(signal.reason))
        })
    )
    const timeoutSpy = jest.spyOn(AbortSignal, 'timeout')
    await expect(sendAlert(input)).resolves.toBeUndefined()
    expect(timeoutSpy).toHaveBeenCalledWith(3_000)
    expect((spy.mock.calls[0][1] as RequestInit).signal).toBeInstanceOf(AbortSignal)
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('[alert] send failed'))
  }, 10_000)

  it('never throws when fetch rejects, and logs the error without the token', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error(`boom ${TOKEN}`))
    await expect(sendAlert(input)).resolves.toBeUndefined()
    expect(errorLog).toHaveBeenCalledWith('[alert] send failed: boom ***')
  })

  it('logs a failure when Telegram answers non-2xx', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    } as Response)
    await expect(sendAlert(input)).resolves.toBeUndefined()
    expect(errorLog).toHaveBeenCalledWith('[alert] send failed: Telegram answered HTTP 401')
  })

  it.each([
    ['fetch rejects', () => Promise.reject(new Error('down'))],
    ['Telegram answers non-2xx', () => Promise.resolve({ ok: false, status: 502 } as Response)],
  ])('sends again right away after a failed send when %s', async (_name, firstAnswer) => {
    const spy = jest
      .spyOn(global, 'fetch')
      .mockImplementationOnce(firstAnswer)
      .mockResolvedValue(okResponse())
    await sendAlert(input)
    await sendAlert(input)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('sends again right away once a missing variable is set', async () => {
    delete process.env.ALERT_TELEGRAM_CHAT_ID
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(okResponse())
    await sendAlert(input)
    process.env.ALERT_TELEGRAM_CHAT_ID = CHAT
    await sendAlert(input)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('redacts secret values in the outgoing text', async () => {
    process.env.NOTION_CLIENT_SECRET = 'secret_abc123'
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(okResponse())
    await sendAlert({ ...input, title: `x ${TOKEN}`, detail: 'client secret_abc123 rejected' })
    expect(sentText(spy)).toBe('【KoboUp】x ***\nclient *** rejected\n修理：查 Vercel 紀錄')
  })

  it.each(['ALERT_TELEGRAM_BOT_TOKEN', 'ALERT_TELEGRAM_CHAT_ID'])(
    'logs a failure and sends nothing when %s is unset',
    async (name) => {
      delete process.env[name]
      const spy = jest.spyOn(global, 'fetch').mockResolvedValue(okResponse())
      await sendAlert(input)
      expect(spy).not.toHaveBeenCalled()
      expect(errorLog).toHaveBeenCalledWith(
        '[alert] send failed: ALERT_TELEGRAM_BOT_TOKEN or ALERT_TELEGRAM_CHAT_ID is not set'
      )
    }
  )

  it('keeps the title and detail on one line each', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(okResponse())
    await sendAlert({ ...input, title: ' a\nb ', detail: 'oops\n修理：x\t\ty' })
    expect(sentText(spy)).toBe('【KoboUp】a b\noops 修理：x y\n修理：查 Vercel 紀錄')
  })
})

describe('errorMessage', () => {
  it('returns the message of an Error and the string form of anything else', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom')
    expect(errorMessage('oops')).toBe('oops')
    expect(errorMessage(42)).toBe('42')
  })
})

describe('redactSecrets', () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })

  it('replaces every configured secret value with ***', () => {
    process.env.ALERT_TELEGRAM_BOT_TOKEN = 'tg-secret'
    process.env.HEALTH_CHECK_KEY = 'health-secret'
    expect(redactSecrets('a tg-secret b health-secret tg-secret')).toBe('a *** b *** ***')
  })

  it.each([
    'NOTION_CLIENT_SECRET',
    'NOTION_ENCRYPTION_SECRET',
    'MAILGUN_SENDING_API_KEY',
    'BLOB_READ_WRITE_TOKEN',
  ])('redacts %s', (name) => {
    process.env[name] = `value-of-${name}`
    expect(redactSecrets(`x value-of-${name} y`)).toBe('x *** y')
  })

  it('skips empty or unset values', () => {
    process.env.ALERT_TELEGRAM_BOT_TOKEN = ''
    delete process.env.HEALTH_CHECK_KEY
    expect(redactSecrets('plain text')).toBe('plain text')
  })
})
