import {
  createRequestError,
  createRequestErrorFromHttpResponse,
  createRequestErrorFromResponseEnvelope,
  getRequestErrorDisplayMessage,
  isRequestError,
  toRequestError,
} from '@/utils/request-error'

describe('request error', () => {
  it('keeps response metadata for html error pages', () => {
    const error = createRequestError({
      source: 'stream',
      status: 502,
      bodyText: '<html><head><title>Bad Gateway</title></head><body><h1>502 Bad Gateway</h1></body></html>',
    })

    expect(error.kind).toBe('parse')
    expect(error.status).toBe(502)
    expect(error.bodyText).toContain('Bad Gateway')
    expect(getRequestErrorDisplayMessage(error, '请求失败')).toBe('服务暂时不可用，请稍后再试。')
  })

  it('classifies gateway wrapped 429 as rate limit', () => {
    const error = createRequestError({
      source: 'stream',
      status: 502,
      bodyText: '<html><head><title>429 Too Many Requests</title></head></html>',
    })

    expect(error.kind).toBe('rate_limit')
    expect(getRequestErrorDisplayMessage(error, '请求失败')).toBe('当前请求较多，请稍后再试。')
  })

  it('preserves plain business messages as display copy', () => {
    const error = createRequestErrorFromResponseEnvelope({
      code: 400,
      message: '请输入 API Key',
      data: null,
    }, {
      source: 'axios',
    })

    expect(error.kind).toBe('business')
    expect(getRequestErrorDisplayMessage(error, '请求失败')).toBe('请输入 API Key')
  })

  it('coerces network errors into request errors', () => {
    const error = toRequestError(new Error('Failed to fetch'), {
      source: 'fetch',
    })

    expect(error.kind).toBe('network')
    expect(getRequestErrorDisplayMessage(error, '请求失败')).toBe('网络异常，请稍后再试。')
  })

  it('creates http response errors with preserved response body', async () => {
    const error = await createRequestErrorFromHttpResponse(
      new Response('<html><title>429 Too Many Requests</title></html>', {
        status: 502,
      }),
      {
        source: 'stream',
      },
    )

    expect(isRequestError(error)).toBe(true)
    expect(error.bodyText).toContain('Too Many Requests')
    expect(error.kind).toBe('rate_limit')
  })
})
