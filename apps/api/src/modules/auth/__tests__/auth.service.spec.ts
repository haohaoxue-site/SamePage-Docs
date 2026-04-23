import { OAUTH_REDIRECT_BIND_STATUS, OAUTH_REDIRECT_ERROR_CODE, OAUTH_REDIRECT_QUERY } from '@haohaoxue/samepage-contracts'
import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { AuthService } from '../auth.service'

describe('authService buildOAuthFailureRedirect', () => {
  it('缺少 state 时回退到登录回调页并仅透传错误码', () => {
    const service = Object.create(AuthService.prototype) as AuthService
    const request = {} as never

    ;(service as any).resolveCurrentUrl = vi.fn(() => new URL('https://api.samepage.local/auth/oauth/github/callback'))

    const redirectUrl = service.buildOAuthFailureRedirect(
      'github',
      request,
      OAUTH_REDIRECT_ERROR_CODE.CALLBACK_FAILED,
    )
    const parsedUrl = new URL(redirectUrl, 'https://samepage.local')

    expect(parsedUrl.pathname).toBe('/auth/callback')
    expect(parsedUrl.searchParams.get(OAUTH_REDIRECT_QUERY.ERROR_CODE)).toBe(
      OAUTH_REDIRECT_ERROR_CODE.CALLBACK_FAILED,
    )
    expect(parsedUrl.searchParams.get('error')).toBeNull()
  })

  it('绑定失败时只写稳定状态与错误码，不拼接原始错误文案', () => {
    const service = Object.create(AuthService.prototype) as AuthService
    const request = {} as never
    const oauthStatePayload = {
      v: 1,
      nonce: 'nonce-1',
      webOrigin: 'https://samepage.local',
      purpose: 'bind' as const,
      redirectPath: '/settings/user',
    }

    ;(service as any).resolveCurrentUrl = vi.fn(() =>
      new URL('https://api.samepage.local/auth/oauth/github/callback?state=test-state'),
    )
    ;(service as any).extractOAuthStatePayload = vi.fn(() => oauthStatePayload)

    const redirectUrl = service.buildOAuthFailureRedirect(
      'github',
      request,
      OAUTH_REDIRECT_ERROR_CODE.CALLBACK_FAILED,
    )
    const parsedUrl = new URL(redirectUrl)

    expect(parsedUrl.pathname).toBe('/settings/user')
    expect(parsedUrl.searchParams.get(OAUTH_REDIRECT_QUERY.BIND_STATUS)).toBe(
      OAUTH_REDIRECT_BIND_STATUS.ERROR,
    )
    expect(parsedUrl.searchParams.get(OAUTH_REDIRECT_QUERY.PROVIDER)).toBe('github')
    expect(parsedUrl.searchParams.get(OAUTH_REDIRECT_QUERY.BIND_ERROR_CODE)).toBe(
      OAUTH_REDIRECT_ERROR_CODE.CALLBACK_FAILED,
    )
    expect(parsedUrl.searchParams.get('bind_message')).toBeNull()
  })
})

function createAuthService() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
    },
    oauthAccount: {
      delete: vi.fn(),
    },
  }
  const oauthProviderService = {}
  const systemAuthService = {}
  const personalWorkspacesService = {}
  const authSessionsService = {}

  return {
    prisma,
    service: new AuthService(
      prisma as never,
      oauthProviderService as never,
      systemAuthService as never,
      personalWorkspacesService as never,
      authSessionsService as never,
    ) as any,
  }
}

describe('authService.disconnectOauthBinding', () => {
  it('会拒绝解绑最后一种登录方式', async () => {
    const { prisma, service } = createAuthService()

    prisma.user.findUnique.mockResolvedValue({
      localCredential: null,
      oauthAccounts: [
        {
          id: 'oauth-1',
          provider: 'GITHUB',
        },
      ],
    })

    await expect(service.disconnectOauthBinding('user-1', 'github')).rejects.toBeInstanceOf(BadRequestException)
    expect(prisma.oauthAccount.delete).not.toHaveBeenCalled()
  })

  it('会删除目标 provider 绑定', async () => {
    const { prisma, service } = createAuthService()

    prisma.user.findUnique.mockResolvedValue({
      localCredential: {
        userId: 'user-1',
      },
      oauthAccounts: [
        {
          id: 'oauth-1',
          provider: 'GITHUB',
        },
        {
          id: 'oauth-2',
          provider: 'LINUX_DO',
        },
      ],
    })
    prisma.oauthAccount.delete.mockResolvedValue(undefined)

    await expect(service.disconnectOauthBinding('user-1', 'github')).resolves.toBeUndefined()

    expect(prisma.oauthAccount.delete).toHaveBeenCalledWith({
      where: { id: 'oauth-1' },
    })
  })
})
