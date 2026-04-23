import { OAUTH_REDIRECT_ERROR_CODE } from '@haohaoxue/samepage-contracts'
import { HttpStatus, UnauthorizedException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { AuthController } from '../auth.controller'

describe('authController', () => {
  it('requestEmailVerification 会直接委托 authRegistrationsService', async () => {
    const authService = {}
    const authSessionsService = {}
    const authRegistrationsService = {
      requestEmailVerification: vi.fn().mockResolvedValue(undefined),
    }
    const controller = new AuthController(
      authService as never,
      authSessionsService as never,
      authRegistrationsService as never,
    )

    await expect(controller.requestEmailVerification({
      email: 'new@example.com',
    } as never)).resolves.toEqual({
      requested: true,
    })

    expect(authRegistrationsService.requestEmailVerification).toHaveBeenCalledWith('new@example.com')
  })

  it('registerWithPassword 会直接委托 authRegistrationsService 并写入 refresh cookie', async () => {
    const authService = {}
    const authSessionsService = {}
    const authRegistrationsService = {
      registerWithPassword: vi.fn().mockResolvedValue({
        accessToken: 'access-token',
        expiresIn: 3600,
        user: {
          id: 'user_1',
          email: 'new@example.com',
          displayName: 'New User',
          avatarUrl: null,
          userCode: 'SP-NEW123',
          roles: [],
          permissions: [],
          authMethods: ['password'],
          mustChangePassword: false,
          emailVerified: true,
        },
        refreshTokenCookie: 'sp_refresh_token=token',
      }),
    }
    const controller = new AuthController(
      authService as never,
      authSessionsService as never,
      authRegistrationsService as never,
    )
    const request = { headers: {} }
    const response = {
      header: vi.fn(),
    }

    await expect(controller.registerWithPassword({
      email: 'new@example.com',
      code: '123456',
      displayName: 'New User',
      password: 'password123',
    } as never, request as never, response as never)).resolves.toMatchObject({
      accessToken: 'access-token',
      expiresIn: 3600,
    })

    expect(authRegistrationsService.registerWithPassword).toHaveBeenCalledWith(
      'new@example.com',
      '123456',
      'New User',
      'password123',
      request,
    )
    expect(response.header).toHaveBeenCalledWith('set-cookie', 'sp_refresh_token=token')
  })

  it('oAuth callback 遇到异常时不会把原始错误消息透传到前端 redirect', async () => {
    const authService = {
      handleOAuthCallback: vi.fn().mockRejectedValue(new Error('OAuth state is invalid: leaked detail')),
      buildOAuthFailureRedirect: vi.fn().mockReturnValue('https://samepage.local/login?error=generic'),
    }
    const authSessionsService = {}
    const authRegistrationsService = {}
    const controller = new AuthController(authService as never, authSessionsService as never, authRegistrationsService as never)
    const request = {
      headers: {},
    }
    const response = {
      redirect: vi.fn(),
    }

    await controller.callback('github', request as never, response as never)

    expect(authService.buildOAuthFailureRedirect).toHaveBeenCalledWith(
      'github',
      request,
      OAUTH_REDIRECT_ERROR_CODE.CALLBACK_FAILED,
    )
    expect(response.redirect).toHaveBeenCalledWith('https://samepage.local/login?error=generic', 302)
  })

  it('refresh 遇到 401 时通过 authSessionsService 清理 refresh cookie', async () => {
    const authService = {}
    const authSessionsService = {
      refreshTokens: vi.fn().mockRejectedValue(new UnauthorizedException('登录状态已失效')),
      buildLogoutCookieHeader: vi.fn().mockReturnValue('sp_refresh_token=; Max-Age=0; Path=/api/auth'),
    }
    const authRegistrationsService = {}
    const controller = new AuthController(authService as never, authSessionsService as never, authRegistrationsService as never)
    const request = {
      headers: {},
    }
    const response = {
      header: vi.fn(),
    }

    await expect(controller.refresh(request as never, response as never)).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
    })

    expect(authSessionsService.buildLogoutCookieHeader).toHaveBeenCalledTimes(1)
    expect(response.header).toHaveBeenCalledWith(
      'set-cookie',
      'sp_refresh_token=; Max-Age=0; Path=/api/auth',
    )
  })
})
