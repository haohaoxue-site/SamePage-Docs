import type { ConfigService } from '@nestjs/config'
import type { PrismaService } from '../../../database/prisma.service'
import type { RbacService } from '../../rbac/rbac.service'
import type { OAuthProfile } from '../auth.interface'
import type { OAuthProviderService } from '../providers/oauth-provider.service'
import type { SystemAuthService } from '../system-auth.service'
import { AuthProvider } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { AuthService } from '../auth.service'

function createConfigService() {
  return {
    getOrThrow: vi.fn((key: string) => {
      if (key === 'jwt') {
        return {
          issuer: 'samepage-api',
          audience: 'samepage-web',
          accessSecret: 'dev-access-secret-change-me',
          accessExpiresIn: 900,
          refreshSecret: 'dev-refresh-secret-change-me',
          refreshExpiresIn: 604800,
        }
      }

      if (key === 'server.isProduction') {
        return false
      }

      throw new Error(`Unexpected config key: ${key}`)
    }),
  } as unknown as ConfigService
}

function createAuthService(prisma: PrismaService, systemAuthService?: Partial<SystemAuthService>) {
  return new AuthService(
    createConfigService(),
    prisma,
    {} as RbacService,
    {} as OAuthProviderService,
    {
      assertRegistrationAllowed: vi.fn(async () => undefined),
      ...systemAuthService,
    } as unknown as SystemAuthService,
  )
}

function createOAuthProfile(overrides: Partial<OAuthProfile> = {}): OAuthProfile {
  return {
    providerUserId: 'github-user-1',
    username: 'alice',
    displayName: 'Alice',
    avatarUrl: 'https://example.com/avatar.png',
    rawProfile: {
      id: 'github-user-1',
    },
    ...overrides,
  }
}

describe('authService', () => {
  it('restores a soft-deleted oauth binding when binding provider again', async () => {
    const bypassFindUnique = vi.fn(async () => ({
      id: 'oauth-1',
      userId: 'user-2',
      provider: AuthProvider.GITHUB,
      providerUserId: 'github-user-1',
      deletedAt: new Date('2026-04-12T00:00:00.000Z'),
    }))
    const bypassUpdate = vi.fn(async () => undefined)
    const activeFindFirst = vi.fn(async () => null)
    const updateUser = vi.fn(async () => undefined)
    const prisma = {
      $bypass: {
        oauthAccount: {
          findUnique: bypassFindUnique,
          update: bypassUpdate,
        },
      },
      user: {
        findUnique: vi.fn(async () => ({
          id: 'user-1',
          avatarUrl: null,
        })),
        update: updateUser,
      },
      oauthAccount: {
        findFirst: activeFindFirst,
      },
    } as unknown as PrismaService
    const service = createAuthService(prisma)

    await (service as any).bindOAuthToUser(AuthProvider.GITHUB, createOAuthProfile(), 'user-1')

    expect(bypassFindUnique).toHaveBeenCalledWith({
      where: {
        provider_providerUserId: {
          provider: AuthProvider.GITHUB,
          providerUserId: 'github-user-1',
        },
      },
    })
    expect(bypassUpdate).toHaveBeenCalledWith({
      where: { id: 'oauth-1' },
      data: expect.objectContaining({
        userId: 'user-1',
        providerUsername: 'alice',
        deletedAt: null,
      }),
    })
    expect(activeFindFirst).toHaveBeenCalled()
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        avatarUrl: 'https://example.com/avatar.png',
      },
    })
  })

  it('restores a soft-deleted oauth binding when logging in again', async () => {
    const assertRegistrationAllowed = vi.fn(async () => undefined)
    const bypassFindUnique = vi.fn(async () => ({
      id: 'oauth-1',
      userId: 'user-1',
      deletedAt: new Date('2026-04-12T00:00:00.000Z'),
      user: {
        id: 'user-1',
        displayName: 'Alice',
        avatarUrl: null,
      },
    }))
    const bypassUpdate = vi.fn(async () => undefined)
    const updateUser = vi.fn(async () => ({
      id: 'user-1',
      displayName: 'Alice',
      avatarUrl: 'https://example.com/avatar.png',
    }))
    const prisma = {
      $bypass: {
        oauthAccount: {
          findUnique: bypassFindUnique,
          update: bypassUpdate,
        },
      },
      user: {
        update: updateUser,
      },
    } as unknown as PrismaService
    const service = createAuthService(prisma, {
      assertRegistrationAllowed,
    })

    const user = await (service as any).upsertUserByOAuth(AuthProvider.GITHUB, createOAuthProfile())

    expect(bypassFindUnique).toHaveBeenCalledWith({
      where: {
        provider_providerUserId: {
          provider: AuthProvider.GITHUB,
          providerUserId: 'github-user-1',
        },
      },
      include: { user: true },
    })
    expect(bypassUpdate).toHaveBeenCalledWith({
      where: { id: 'oauth-1' },
      data: expect.objectContaining({
        providerUsername: 'alice',
        deletedAt: null,
      }),
    })
    expect(assertRegistrationAllowed).not.toHaveBeenCalled()
    expect(user).toEqual({
      id: 'user-1',
      displayName: 'Alice',
      avatarUrl: 'https://example.com/avatar.png',
    })
  })
})
