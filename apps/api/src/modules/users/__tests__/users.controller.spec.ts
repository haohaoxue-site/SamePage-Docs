import { describe, expect, it, vi } from 'vitest'
import { UsersController } from '../users.controller'

describe('usersController', () => {
  it('startOauthBinding 会直接委托 authService 并返回 authorizeUrl', async () => {
    const usersService = {}
    const authService = {
      buildOAuthBindingAuthorizationUrl: vi.fn().mockResolvedValue('https://samepage.local/oauth/bind'),
    }
    const authSessionsService = {}
    const userAvatarsService = {}
    const userEmailBindingsService = {}
    const controller = new (UsersController as any)(
      usersService,
      authService,
      authSessionsService,
      userAvatarsService,
      userEmailBindingsService,
    ) as UsersController
    const request = { headers: { host: 'samepage.local' } }

    await expect(controller.startOauthBinding({
      id: 'user-1',
      roles: [],
      permissions: [],
    } as never, 'github', request as never)).resolves.toEqual({
      authorizeUrl: 'https://samepage.local/oauth/bind',
    })

    expect(authService.buildOAuthBindingAuthorizationUrl).toHaveBeenCalledWith(
      'user-1',
      'github',
      request,
    )
  })

  it('disconnectOauthBinding 会先委托 authService 解绑，再回读当前用户', async () => {
    const usersService = {
      getCurrentUser: vi.fn().mockResolvedValue({
        id: 'user-1',
        authMethods: ['password'],
      }),
    }
    const authService = {
      disconnectOauthBinding: vi.fn().mockResolvedValue(undefined),
    }
    const authSessionsService = {}
    const userAvatarsService = {}
    const userEmailBindingsService = {}
    const controller = new (UsersController as any)(
      usersService,
      authService,
      authSessionsService,
      userAvatarsService,
      userEmailBindingsService,
    ) as UsersController

    await expect(controller.disconnectOauthBinding({
      id: 'user-1',
      roles: [],
      permissions: [],
    } as never, 'github')).resolves.toEqual({
      id: 'user-1',
      authMethods: ['password'],
    })

    expect(authService.disconnectOauthBinding).toHaveBeenCalledWith('user-1', 'github')
    expect(usersService.getCurrentUser).toHaveBeenCalledWith('user-1')
  })
})
