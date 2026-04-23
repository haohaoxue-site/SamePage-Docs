import { OAUTH_REDIRECT_ERROR_CODE } from '@haohaoxue/samepage-contracts'
import { describe, expect, it } from 'vitest'
import { resolveOAuthRedirectErrorMessage } from '@/utils/oauth-redirect'

describe('resolveOAuthRedirectErrorMessage', () => {
  it('登录回调失败时返回稳定登录文案', () => {
    expect(resolveOAuthRedirectErrorMessage(OAUTH_REDIRECT_ERROR_CODE.CALLBACK_FAILED, {
      purpose: 'login',
    })).toBe('第三方登录失败，请稍后重试')
  })

  it('绑定回调失败时返回带 provider 的稳定文案', () => {
    expect(resolveOAuthRedirectErrorMessage(OAUTH_REDIRECT_ERROR_CODE.CALLBACK_FAILED, {
      purpose: 'bind',
      providerLabel: 'GitHub',
    })).toBe('GitHub 账号绑定失败，请稍后重试')
  })

  it('未知错误码时回退到调用方给定文案', () => {
    expect(resolveOAuthRedirectErrorMessage('UNKNOWN', {
      purpose: 'bind',
      providerLabel: '第三方账号',
      fallbackMessage: '账号绑定失败',
    })).toBe('账号绑定失败')
  })
})
